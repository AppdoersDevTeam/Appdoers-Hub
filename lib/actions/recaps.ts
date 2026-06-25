'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { sendSlackMessage } from '@/lib/slack'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface RecapWorkItem {
  description: string
  category: string
}

export interface RecapInput {
  client_id: string
  project_id?: string | null
  month: number
  year: number
  intro_text: string
  work_completed: RecapWorkItem[]
  performance_notes: string
  coming_next: string
}

export interface GeneratedRecapData {
  tasksCompleted: number
  hoursLogged: number
  workCompleted: RecapWorkItem[]
  introText: string
  comingNext: string
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

function taskTypeToCategory(type: string): string {
  switch (type) {
    case 'design':
      return 'Design'
    case 'content':
      return 'Content'
    case 'bug':
    case 'revision':
      return 'Maintenance'
    case 'admin':
      return 'Meetings'
    default:
      return 'Development'
  }
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
  return `${greeting}\n\nHere's your monthly progress update for ${periodLabel}. It was a productive month — we completed ${tasksCompleted} task${tasksCompleted !== 1 ? 's' : ''} and logged ${hoursLogged} hour${hoursLogged !== 1 ? 's' : ''} of work on your project.`
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

    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .eq('client_id', clientId)

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
        .select('id, title, type, project_id, projects(name)')
        .in('project_id', projectIds)
        .eq('status', 'closed')
        .gte('updated_at', startDate)
        .lte('updated_at', endDateTime)
        .order('updated_at', { ascending: false }),

      supabase
        .from('tasks')
        .select('id, title, type, project_id, projects(name)')
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
        .select('hours, task_id, description')
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

    const hoursLogged = parseFloat(
      (timeEntries ?? []).reduce((sum, e) => sum + Number(e.hours), 0).toFixed(1)
    )

    const tasksCompleted = closedTasks?.length ?? 0
    const workCompleted: RecapWorkItem[] = []
    const seenDescriptions = new Set<string>()

    const addWorkItem = (description: string, category: string) => {
      const key = description.trim().toLowerCase()
      if (!key || seenDescriptions.has(key)) return
      seenDescriptions.add(key)
      workCompleted.push({ description: description.trim(), category })
    }

    for (const phase of phases ?? []) {
      const projectName = (phase.projects as { name?: string } | null)?.name
      const label = formatPhaseName(phase.phase as string)
      addWorkItem(
        projectName ? `Completed ${label} phase — ${projectName}` : `Completed ${label} phase`,
        'Development'
      )
    }

    for (const task of workedTasks ?? []) {
      const projectName = (task.projects as { name?: string } | null)?.name
      const title = task.title as string
      addWorkItem(
        projectName ? `${title} (${projectName})` : title,
        taskTypeToCategory(task.type as string)
      )
    }

    const taskIdsWithTime = new Set(
      (timeEntries ?? [])
        .map((e) => e.task_id as string | null)
        .filter((id): id is string => Boolean(id))
    )

    if (taskIdsWithTime.size > 0) {
      const { data: timedTasks } = await supabase
        .from('tasks')
        .select('id, title, type, projects(name)')
        .in('id', [...taskIdsWithTime])

      for (const task of timedTasks ?? []) {
        const projectName = (task.projects as { name?: string } | null)?.name
        const title = task.title as string
        addWorkItem(
          projectName ? `${title} (${projectName})` : title,
          taskTypeToCategory(task.type as string)
        )
      }
    }

    for (const entry of timeEntries ?? []) {
      if (!entry.task_id && entry.description?.trim()) {
        addWorkItem(entry.description.trim(), 'Other')
      }
    }

    const comingNext = buildComingNextText(
      (openTasks ?? []).map((t) => ({
        title: t.title as string,
        project_name: (t.projects as { name?: string } | null)?.name,
      })),
      projectNames
    )

    return {
      success: true,
      data: {
        tasksCompleted,
        hoursLogged,
        workCompleted,
        introText: buildIntroText(periodLabel, tasksCompleted, hoursLogged, options?.contactName),
        comingNext,
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

    let payload = {
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

    if (!existingId) {
      const isEmpty =
        !input.intro_text.trim() &&
        input.work_completed.length === 0 &&
        !input.performance_notes.trim() &&
        !input.coming_next.trim()

      if (isEmpty) {
        const { data: client } = await supabase
          .from('clients')
          .select('contact_name')
          .eq('id', input.client_id)
          .single()

        const generated = await generateRecapDataAction(
          input.client_id,
          input.month,
          input.year,
          { contactName: client?.contact_name }
        )

        if (generated.success) {
          payload = {
            ...payload,
            intro_text: generated.data.introText,
            work_completed: generated.data.workCompleted,
            coming_next: generated.data.comingNext,
          }
        }
      }
    }

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

export async function sendRecapAction(recapId: string): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: recap } = await supabase
      .from('monthly_recaps')
      .select('*, clients(company_name, contact_name, contact_email)')
      .eq('id', recapId)
      .single()

    if (!recap) return { success: false, error: 'Recap not found' }

    const { error } = await supabase
      .from('monthly_recaps')
      .update({ is_sent: true, sent_at: new Date().toISOString(), sent_by: user?.id })
      .eq('id', recapId)

    if (error) return { success: false, error: error.message }

    const clientName = (recap.clients as { company_name?: string } | null)?.company_name ?? 'client'
    const monthLabel = `${MONTH_NAMES[(recap.month as number) - 1]} ${recap.year}`

    await sendSlackMessage(`📊 Monthly Recap Sent: ${clientName} — ${monthLabel}`, [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📊 Monthly Recap Sent*\n*Client:* ${clientName}\n*Period:* ${monthLabel}\n*Coming next:* ${String(recap.coming_next ?? '').slice(0, 120)}…`,
        },
      },
    ])

    revalidatePath('/app/recaps')
    revalidatePath(`/portal/recaps`)
    return { success: true, data: undefined }
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
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
