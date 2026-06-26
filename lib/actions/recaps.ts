'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { sendSlackMessage } from '@/lib/slack'
import type { RecapWorkItem } from '@/lib/recaps/types'

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
}

export interface GeneratedRecapData {
  tasksCompleted: number
  hoursLogged: number
  workCompleted: RecapWorkItem[]
  introText: string
  comingNext: string
  performanceNotes: string
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

function buildPerformanceNotes(hoursByProject: Map<string, number>, hoursLogged: number): string {
  if (hoursLogged <= 0) return ''

  const lines = [...hoursByProject.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, hours]) => `• ${name}: ${hours.toFixed(1)} hours`)

  return `Time invested this month (${hoursLogged.toFixed(1)}h total):\n\n${lines.join('\n')}`
}

function formatTaskWorkLabel(title: string, hours: number | null, projectName?: string | null): string {
  const hoursLabel = hours !== null && hours > 0 ? ` — ${hours.toFixed(1)}h` : ''
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
          performanceNotes: '',
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
        .select('id, title, type, time_spent, project_id, projects(name)')
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
        .select('hours, task_id, description, project_id, projects(name)')
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

    if (hoursByTask.size > 0) {
      const { data: timedTasks } = await supabase
        .from('tasks')
        .select('id, title, type, projects(name)')
        .in('id', [...hoursByTask.keys()])
        .order('updated_at', { ascending: false })

      for (const task of timedTasks ?? []) {
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
        addWorkItem(`${description} — ${hours.toFixed(1)}h`, 'Other')
      } else {
        const projectName = (entry.projects as { name?: string } | null)?.name
        addWorkItem(
          projectName ? `General project work — ${hours.toFixed(1)}h (${projectName})` : `General project work — ${hours.toFixed(1)}h`,
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

    return {
      success: true,
      data: {
        tasksCompleted,
        hoursLogged,
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
    revalidatePath(`/app/recaps/${recapId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
