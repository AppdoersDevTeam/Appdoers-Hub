'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { hubRecapUrl, sendSlackAlert, slackOpenHub } from '@/lib/slack'
import type { RecapStats, RecapWorkItem } from '@/lib/recaps/types'
import {
  buildRecapStats,
  resolveRecapPlanKey,
  taskTypeToCategory,
  type RecapStatsTaskInput,
} from '@/lib/recaps/stats'
import { fetchClientDisplayInfo } from '@/lib/clients/fetch-client-display'
import { formatHours, roundHours } from '@/lib/utils/format'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireTeamAccess } from '@/lib/supabase/route-access'
import { loadRecapPdfData } from '@/lib/recaps/load-recap-pdf'
import { buildRecapEmail } from '@/lib/recaps/recap-email'
import { sendEmail } from '@/lib/email/resend'

export type { RecapWorkItem } from '@/lib/recaps/types'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface RecapInput {
  client_id: string
  project_id?: string | null
  month: number
  year: number
  intro_text: string
  work_completed: RecapWorkItem[]
  performance_notes: string
  coming_next: string
  /** Omit to leave the stored snapshot untouched. */
  stats?: RecapStats | null
}

export interface GeneratedRecapData {
  tasksCompleted: number
  hoursLogged: number
  workCompleted: RecapWorkItem[]
  introText: string
  comingNext: string
  performanceNotes: string
  stats: RecapStats
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function monthDateRange(month: number, year: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { startDate, endDate, endDateTime: `${endDate}T23:59:59.999Z` }
}

function formatPhaseName(phase: string): string {
  return phase.replace(/_/g, ' ')
}

function buildIntroText(
  periodLabel: string,
  tasksCompleted: number,
  hoursLogged: number,
  contactName?: string | null
): string {
  const greeting = contactName?.trim() ? `Hi ${contactName.trim()},` : 'Hi there,'
  return `${greeting}\n\nHere is your progress update for ${periodLabel}. This month we completed ${tasksCompleted} task${tasksCompleted !== 1 ? 's' : ''} and logged ${hoursLogged} hour${hoursLogged !== 1 ? 's' : ''} of work on your project.`
}

function buildComingNextText(
  openTasks: { title: string; project_name?: string }[],
  projectNames: string[]
): string {
  if (openTasks.length > 0) {
    const lines = openTasks.slice(0, 8).map((t) => {
      const projectSuffix = t.project_name ? ` (${t.project_name})` : ''
      return `• ${t.title}${projectSuffix}`
    })
    return `Here's what we're focusing on next:\n\n${lines.join('\n')}`
  }

  if (projectNames.length > 0) {
    return `We'll continue making progress on ${projectNames.join(', ')}.`
  }

  return ''
}

function buildPerformanceNotes(hoursByProject: Map<string, number>, hoursLogged: number): string {
  if (hoursLogged <= 0) return ''

  const lines = [...hoursByProject.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, hours]) => `• ${name}: ${roundHours(hours)} hours`)

  return `Time invested this month (${formatHours(hoursLogged, '0h')} total):\n\n${lines.join('\n')}`
}

function formatTaskWorkLabel(title: string, hours: number | null, projectName?: string | null): string {
  const hoursLabel = hours !== null && hours > 0 ? ` — ${formatHours(hours)}` : ''
  const projectSuffix = projectName ? ` (${projectName})` : ''
  return `${title}${hoursLabel}${projectSuffix}`
}

// ─── Auto-generate recap data from DB ────────────────────────────────────────

export async function generateRecapDataAction(
  clientId: string,
  month: number,
  year: number,
  options?: { contactName?: string | null }
): Promise<ActionResult<GeneratedRecapData>> {
  try {
    const supabase = await createSupabaseClient()
    const { startDate, endDate, endDateTime } = monthDateRange(month, year)
    const periodLabel = `${MONTH_NAMES[month - 1]} ${year}`

    const [{ data: projects }, { data: client }] = await Promise.all([
      supabase.from('projects').select('id, name').eq('client_id', clientId),
      supabase
        .from('clients')
        .select('subscription_plan, service_catalog:plan_service_id(plan_key)')
        .eq('id', clientId)
        .maybeSingle(),
    ])

    const catalog = (client as { service_catalog?: { plan_key?: string | null } | { plan_key?: string | null }[] | null } | null)
      ?.service_catalog
    const plan = resolveRecapPlanKey({
      catalogPlanKey: (Array.isArray(catalog) ? catalog[0] : catalog)?.plan_key ?? null,
      subscriptionPlan: (client as { subscription_plan?: string | null } | null)?.subscription_plan ?? null,
    })

    const projectIds = (projects ?? []).map((p) => p.id as string)
    const projectNames = (projects ?? []).map((p) => p.name as string)

    if (projectIds.length === 0) {
      return {
        success: true,
        data: {
          tasksCompleted: 0,
          hoursLogged: 0,
          workCompleted: [],
          introText: buildIntroText(periodLabel, 0, 0, options?.contactName),
          comingNext: '',
          performanceNotes: '',
          stats: buildRecapStats({
            month,
            year,
            plan,
            tasksCompleted: 0,
            phasesCompleted: [],
            tasks: [],
            entries: [],
          }),
        },
      }
    }

    const [
      { data: closedTasks },
      { data: workedTasks },
      { data: openTasks },
      { data: timeEntries },
      { data: phases },
    ] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, type, status, is_billable, project_id, projects(name)')
        .in('project_id', projectIds)
        .eq('status', 'closed')
        .gte('updated_at', startDate)
        .lte('updated_at', endDateTime)
        .order('updated_at', { ascending: false }),

      supabase
        .from('tasks')
        .select('id, title, type, status, is_billable, time_spent, project_id, projects(name)')
        .in('project_id', projectIds)
        .neq('status', 'open')
        .gte('updated_at', startDate)
        .lte('updated_at', endDateTime)
        .order('updated_at', { ascending: false }),

      supabase
        .from('tasks')
        .select('title, priority, projects(name)')
        .in('project_id', projectIds)
        .in('status', ['open', 'in_progress', 'awaiting_review'])
        .order('priority', { ascending: true })
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(10),

      supabase
        .from('time_entries')
        .select('hours, date, is_billable, task_id, description, project_id, projects(name)')
        .in('project_id', projectIds)
        .gte('date', startDate)
        .lte('date', endDate),

      supabase
        .from('project_phases')
        .select('phase, project_id, projects(name)')
        .in('project_id', projectIds)
        .eq('status', 'completed')
        .gte('updated_at', startDate)
        .lte('updated_at', endDateTime),
    ])

    const hoursLogged = roundHours(
      (timeEntries ?? []).reduce((sum, e) => sum + Number(e.hours), 0)
    )

    const hoursByTask = new Map<string, number>()
    const hoursByProject = new Map<string, number>()

    for (const entry of timeEntries ?? []) {
      const hours = Number(entry.hours)
      const taskId = entry.task_id as string | null
      if (taskId) {
        hoursByTask.set(taskId, (hoursByTask.get(taskId) ?? 0) + hours)
      }

      const projectName =
        (entry.projects as { name?: string } | null)?.name ??
        projectNames.find((_, i) => projectIds[i] === entry.project_id) ??
        'General'
      hoursByProject.set(projectName, (hoursByProject.get(projectName) ?? 0) + hours)
    }

    const tasksCompleted = closedTasks?.length ?? 0
    const workCompleted: RecapWorkItem[] = []
    const seenTaskIds = new Set<string>()
    const seenDescriptions = new Set<string>()

    const addWorkItem = (description: string, category: string, taskId?: string) => {
      if (taskId) {
        if (seenTaskIds.has(taskId)) return
        seenTaskIds.add(taskId)
      } else {
        const key = description.trim().toLowerCase()
        if (!key || seenDescriptions.has(key)) return
        seenDescriptions.add(key)
      }
      workCompleted.push({ description: description.trim(), category })
    }

    const statsTasks = new Map<string, RecapStatsTaskInput>()
    const addStatsTask = (task: {
      id: unknown
      title: unknown
      type: unknown
      status: unknown
      is_billable: unknown
      projects: unknown
    }) => {
      const id = task.id as string
      if (statsTasks.has(id)) return
      statsTasks.set(id, {
        id,
        title: task.title as string,
        type: task.type as string,
        status: task.status as string,
        isBillable: Boolean(task.is_billable),
        projectName: (task.projects as { name?: string } | null)?.name ?? null,
      })
    }

    if (hoursByTask.size > 0) {
      const { data: timedTasks } = await supabase
        .from('tasks')
        .select('id, title, type, status, is_billable, projects(name)')
        .in('id', [...hoursByTask.keys()])
        .order('updated_at', { ascending: false })

      for (const task of timedTasks ?? []) {
        addStatsTask(task)
        const projectName = (task.projects as { name?: string } | null)?.name
        addWorkItem(
          formatTaskWorkLabel(
            task.title as string,
            hoursByTask.get(task.id as string) ?? null,
            projectName
          ),
          taskTypeToCategory(task.type as string),
          task.id as string
        )
      }
    }

    for (const phase of phases ?? []) {
      const projectName = (phase.projects as { name?: string } | null)?.name
      const label = formatPhaseName(phase.phase as string)
      addWorkItem(
        projectName ? `Completed ${label} phase — ${projectName}` : `Completed ${label} phase`,
        'Development'
      )
    }

    for (const task of [...(closedTasks ?? []), ...(workedTasks ?? [])]) {
      addStatsTask(task)
    }

    for (const task of workedTasks ?? []) {
      const taskId = task.id as string
      if (seenTaskIds.has(taskId)) continue

      const projectName = (task.projects as { name?: string } | null)?.name
      const monthlyHours = hoursByTask.get(taskId) ?? null
      const totalHours = Number(task.time_spent ?? 0)
      const hours = monthlyHours ?? (totalHours > 0 ? totalHours : null)

      addWorkItem(
        formatTaskWorkLabel(task.title as string, hours, projectName),
        taskTypeToCategory(task.type as string),
        taskId
      )
    }

    for (const entry of timeEntries ?? []) {
      if (entry.task_id) continue

      const hours = Number(entry.hours)
      const description = entry.description?.trim()
      if (description) {
        addWorkItem(`${description} — ${formatHours(hours)}`, 'Other')
      } else {
        const projectName = (entry.projects as { name?: string } | null)?.name
        addWorkItem(
          projectName
            ? `General project work — ${formatHours(hours)} (${projectName})`
            : `General project work — ${formatHours(hours)}`,
          'Other'
        )
      }
    }

    const comingNext = buildComingNextText(
      (openTasks ?? []).map((t) => ({
        title: t.title as string,
        project_name: (t.projects as { name?: string } | null)?.name,
      })),
      projectNames
    )

    const stats = buildRecapStats({
      month,
      year,
      plan,
      tasksCompleted,
      phasesCompleted: (phases ?? []).map((phase) => {
        const projectName = (phase.projects as { name?: string } | null)?.name
        const label = formatPhaseName(phase.phase as string)
        return projectName ? `${label} (${projectName})` : label
      }),
      tasks: [...statsTasks.values()],
      entries: (timeEntries ?? []).map((e) => ({
        hours: Number(e.hours),
        date: String(e.date),
        taskId: (e.task_id as string | null) ?? null,
        isBillable: Boolean(e.is_billable),
      })),
    })

    return {
      success: true,
      data: {
        tasksCompleted,
        hoursLogged,
        stats,
        workCompleted,
        introText: buildIntroText(periodLabel, tasksCompleted, hoursLogged, options?.contactName),
        comingNext,
        performanceNotes: buildPerformanceNotes(hoursByProject, hoursLogged),
      },
    }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Create / Save Recap ──────────────────────────────────────────────────────

export async function saveRecapAction(
  input: RecapInput,
  existingId?: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!existingId) {
      const { data: existing } = await supabase
        .from('monthly_recaps')
        .select('id')
        .eq('client_id', input.client_id)
        .eq('month', input.month)
        .eq('year', input.year)
        .is('project_id', null)
        .maybeSingle()

      if (existing) {
        return { success: true, data: { id: existing.id } }
      }
    }

    const payload: Record<string, unknown> = {
      client_id: input.client_id,
      project_id: input.project_id ?? null,
      month: input.month,
      year: input.year,
      intro_text: input.intro_text,
      work_completed: input.work_completed,
      performance_notes: input.performance_notes,
      coming_next: input.coming_next,
      is_sent: false,
    }
    if (input.stats !== undefined) payload.stats = input.stats

    let id: string

    if (existingId) {
      const { error } = await supabase.from('monthly_recaps').update(payload).eq('id', existingId)
      if (error) return { success: false, error: error.message }
      id = existingId
    } else {
      const { data, error } = await supabase
        .from('monthly_recaps')
        .insert({ ...payload, created_by: user?.id })
        .select('id')
        .single()
      if (error) return { success: false, error: error.message }
      id = data.id
    }

    revalidatePath('/app/recaps')
    revalidatePath(`/app/recaps/${id}`)
    return { success: true, data: { id } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Send Recap ───────────────────────────────────────────────────────────────

async function markRecapSent(
  db: SupabaseClient,
  recapId: string,
  userId: string | undefined,
  delivery?: { toEmail: string; messageId: string }
): Promise<ActionResult<undefined>> {
  const { data: recap } = await db
    .from('monthly_recaps')
    .select('client_id, month, year, coming_next')
    .eq('id', recapId)
    .single()

  if (!recap) return { success: false, error: 'Recap not found' }

  const { error } = await db
    .from('monthly_recaps')
    .update({
      is_sent: true,
      sent_at: new Date().toISOString(),
      sent_by: userId,
      ...(delivery ? { sent_to_email: delivery.toEmail, email_message_id: delivery.messageId } : {}),
    })
    .eq('id', recapId)

  if (error) return { success: false, error: error.message }

  const client = await fetchClientDisplayInfo(db, recap.client_id as string)
  const clientName = client.companyName
  const monthLabel = `${MONTH_NAMES[(recap.month as number) - 1]} ${recap.year}`

  await sendSlackAlert('clients', {
    text: delivery
      ? `Monthly recap emailed: ${clientName} — ${monthLabel}`
      : `Monthly recap sent: ${clientName} — ${monthLabel}`,
    title: delivery ? 'Monthly recap emailed' : 'Monthly recap sent',
    fields: [
      { label: 'Client', value: clientName },
      { label: 'Period', value: monthLabel },
      ...(delivery ? [{ label: 'Sent to', value: delivery.toEmail }] : []),
    ],
    body: recap.coming_next ? String(recap.coming_next) : null,
    bodyLabel: recap.coming_next ? 'Coming next' : undefined,
    action: slackOpenHub(hubRecapUrl(recapId)),
  })

  revalidatePath('/app/recaps')
  revalidatePath(`/app/recaps/${recapId}`)
  revalidatePath('/portal/recaps')
  return { success: true, data: undefined }
}

/** Marks the recap as sent (visible in the portal) without emailing it. */
export async function sendRecapAction(recapId: string): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    return markRecapSent(supabase, recapId, user?.id)
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

function appBaseUrl(): string | null {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '')
  return base || null
}

/** Subject + preview text for the send dialog, built from the saved recap. */
export async function previewRecapEmailAction(
  recapId: string
): Promise<ActionResult<{ subject: string; text: string }>> {
  try {
    const team = await requireTeamAccess()
    if (!team.ok) return { success: false, error: team.message }

    const loaded = await loadRecapPdfData(team.db, recapId)
    if (!loaded.ok) return { success: false, error: loaded.error }

    const contact = await fetchClientDisplayInfo(team.db, loaded.data.clientId)
    const email = buildRecapEmail({
      clientName: loaded.data.props.clientName,
      contactName: contact.contactName,
      month: loaded.data.props.month,
      year: loaded.data.props.year,
      stats: loaded.data.props.stats,
      workItems: loaded.data.props.workCompleted,
      comingNext: loaded.data.props.comingNext,
      portalUrl: null,
      logoUrl: null,
    })
    return { success: true, data: { subject: email.subject, text: email.text } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

const recipientSchema = z.string().trim().email('Enter a valid email address')

/** Emails the recap (PDF attached) via Resend, then marks it sent. */
export async function sendRecapEmailAction(
  recapId: string,
  toEmail: string
): Promise<ActionResult<{ sentTo: string }>> {
  try {
    const parsed = recipientSchema.safeParse(toEmail)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
    const recipient = parsed.data

    const team = await requireTeamAccess()
    if (!team.ok) return { success: false, error: team.message }

    const loaded = await loadRecapPdfData(team.db, recapId)
    if (!loaded.ok) return { success: false, error: loaded.error }
    const recap = loaded.data

    const contact = await fetchClientDisplayInfo(team.db, recap.clientId)
    const base = appBaseUrl()

    const { renderRecapPdfToBuffer } = await import('@/lib/pdf/render-recap-pdf')
    const pdf = await renderRecapPdfToBuffer({ ...recap.props, sentAt: new Date().toISOString() })

    const email = buildRecapEmail({
      clientName: recap.props.clientName,
      contactName: contact.contactName,
      month: recap.props.month,
      year: recap.props.year,
      stats: recap.props.stats,
      workItems: recap.props.workCompleted,
      comingNext: recap.props.comingNext,
      portalUrl: base ? `${base}/portal/recaps` : null,
      logoUrl: base ? `${base}/logo.png` : null,
    })

    const sent = await sendEmail({
      to: recipient,
      subject: email.subject,
      html: email.html,
      text: email.text,
      attachments: [{ filename: recap.filename.replace(/[^\w.-]+/g, '_'), content: pdf }],
    })
    if (!sent.ok) return { success: false, error: sent.error }

    const marked = await markRecapSent(team.db, recapId, team.userId, {
      toEmail: recipient,
      messageId: sent.id,
    })
    if (!marked.success) {
      return { success: false, error: `Email sent, but saving the sent status failed: ${marked.error}` }
    }

    return { success: true, data: { sentTo: recipient } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Delete Recap ─────────────────────────────────────────────────────────────

export async function deleteRecapAction(recapId: string): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { error } = await supabase.from('monthly_recaps').delete().eq('id', recapId)
    if (error) return { success: false, error: error.message }
    revalidatePath('/app/recaps')
    revalidatePath(`/app/recaps/${recapId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
