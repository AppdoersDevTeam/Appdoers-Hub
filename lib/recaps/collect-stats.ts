import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildRecapStats,
  resolveRecapPlanKey,
  type RecapStatsTaskInput,
} from '@/lib/recaps/stats'
import type { RecapStats } from '@/lib/recaps/types'
import { roundHours } from '@/lib/utils/format'

type ProjectRef = { name?: string } | null

export interface RecapTaskRow {
  id: string
  title: string
  type: string
  status: string
  is_billable: boolean
  time_spent?: number | null
  projects: ProjectRef
}

export interface RecapEntryRow {
  hours: number
  date: string
  is_billable: boolean
  task_id: string | null
  description: string | null
  project_id: string
  projects: ProjectRef
}

export interface RecapPhaseRow {
  phase: string
  projects: ProjectRef
}

export interface RecapOpenTaskRow {
  title: string
  projects: ProjectRef
}

export interface RecapSource {
  projectIds: string[]
  projectNames: string[]
  closedTasks: RecapTaskRow[]
  workedTasks: RecapTaskRow[]
  timedTasks: RecapTaskRow[]
  openTasks: RecapOpenTaskRow[]
  timeEntries: RecapEntryRow[]
  phases: RecapPhaseRow[]
  stats: RecapStats
}

export function monthDateRange(month: number, year: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { startDate, endDate, endDateTime: `${endDate}T23:59:59.999Z` }
}

export function formatPhaseName(phase: string): string {
  return phase.replace(/_/g, ' ')
}

/** Closed in the month by closed_at, or by updated_at for legacy rows without closed_at. */
function closedInMonthFilter(startDate: string, endDateTime: string): string {
  return `and(closed_at.gte.${startDate},closed_at.lte.${endDateTime}),and(closed_at.is.null,updated_at.gte.${startDate},updated_at.lte.${endDateTime})`
}

const TASK_COLUMNS = 'id, title, type, status, is_billable, time_spent, projects(name)'

async function loadPlan(db: SupabaseClient, clientId: string) {
  const { data: client } = await db
    .from('clients')
    .select('subscription_plan, service_catalog:plan_service_id(plan_key)')
    .eq('id', clientId)
    .maybeSingle()

  const catalog = (
    client as { service_catalog?: { plan_key?: string | null } | { plan_key?: string | null }[] | null } | null
  )?.service_catalog
  return resolveRecapPlanKey({
    catalogPlanKey: (Array.isArray(catalog) ? catalog[0] : catalog)?.plan_key ?? null,
    subscriptionPlan: (client as { subscription_plan?: string | null } | null)?.subscription_plan ?? null,
  })
}

async function loadPreviousMonth(
  db: SupabaseClient,
  projectIds: string[],
  month: number,
  year: number
): Promise<RecapStats['previous']> {
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const { startDate, endDate, endDateTime } = monthDateRange(prevMonth, prevYear)

  const [{ count }, { data: entries }] = await Promise.all([
    db
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .in('project_id', projectIds)
      .eq('status', 'closed')
      .or(closedInMonthFilter(startDate, endDateTime)),
    db
      .from('time_entries')
      .select('hours')
      .in('project_id', projectIds)
      .gte('date', startDate)
      .lte('date', endDate),
  ])

  const tasksCompleted = count ?? 0
  const hoursLogged = roundHours((entries ?? []).reduce((sum, e) => sum + Number(e.hours), 0))
  // Under 15 minutes with nothing closed is not a meaningful month to compare against.
  return tasksCompleted === 0 && hoursLogged < 0.25 ? null : { tasksCompleted, hoursLogged }
}

/** Loads everything a recap needs for one client-month and builds the stats snapshot. */
export async function collectRecapSource(
  db: SupabaseClient,
  clientId: string,
  month: number,
  year: number
): Promise<RecapSource> {
  const { startDate, endDate, endDateTime } = monthDateRange(month, year)

  const [{ data: projects }, plan] = await Promise.all([
    db.from('projects').select('id, name').eq('client_id', clientId),
    loadPlan(db, clientId),
  ])

  const projectIds = (projects ?? []).map((p) => p.id as string)
  const projectNames = (projects ?? []).map((p) => p.name as string)

  if (projectIds.length === 0) {
    return {
      projectIds,
      projectNames,
      closedTasks: [],
      workedTasks: [],
      timedTasks: [],
      openTasks: [],
      timeEntries: [],
      phases: [],
      stats: buildRecapStats({ month, year, plan, tasksCompleted: 0, phasesCompleted: [], tasks: [], entries: [] }),
    }
  }

  const [closed, worked, open, entries, phaseRows, previous] = await Promise.all([
    db
      .from('tasks')
      .select(TASK_COLUMNS)
      .in('project_id', projectIds)
      .eq('status', 'closed')
      .or(closedInMonthFilter(startDate, endDateTime))
      .order('updated_at', { ascending: false }),
    db
      .from('tasks')
      .select(TASK_COLUMNS)
      .in('project_id', projectIds)
      .neq('status', 'open')
      .gte('updated_at', startDate)
      .lte('updated_at', endDateTime)
      .order('updated_at', { ascending: false }),
    db
      .from('tasks')
      .select('title, priority, projects(name)')
      .in('project_id', projectIds)
      .in('status', ['open', 'in_progress', 'awaiting_review'])
      .order('priority', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(10),
    db
      .from('time_entries')
      .select('hours, date, is_billable, task_id, description, project_id, projects(name)')
      .in('project_id', projectIds)
      .gte('date', startDate)
      .lte('date', endDate),
    db
      .from('project_phases')
      .select('phase, projects(name)')
      .in('project_id', projectIds)
      .eq('status', 'completed')
      .gte('updated_at', startDate)
      .lte('updated_at', endDateTime),
    loadPreviousMonth(db, projectIds, month, year),
  ])

  const closedTasks = (closed.data ?? []) as unknown as RecapTaskRow[]
  const workedTasks = (worked.data ?? []) as unknown as RecapTaskRow[]
  const openTasks = (open.data ?? []) as unknown as RecapOpenTaskRow[]
  const timeEntries = (entries.data ?? []) as unknown as RecapEntryRow[]
  const phases = (phaseRows.data ?? []) as unknown as RecapPhaseRow[]

  const timedTaskIds = [...new Set(timeEntries.map((e) => e.task_id).filter((id): id is string => !!id))]
  const timedTasks: RecapTaskRow[] = timedTaskIds.length
    ? (((
        await db
          .from('tasks')
          .select(TASK_COLUMNS)
          .in('id', timedTaskIds)
          .order('updated_at', { ascending: false })
      ).data ?? []) as unknown as RecapTaskRow[])
    : []

  const statsTasks = new Map<string, RecapStatsTaskInput>()
  for (const task of [...timedTasks, ...closedTasks, ...workedTasks]) {
    if (statsTasks.has(task.id)) continue
    statsTasks.set(task.id, {
      id: task.id,
      title: task.title,
      type: task.type,
      status: task.status,
      isBillable: Boolean(task.is_billable),
      projectName: task.projects?.name ?? null,
    })
  }

  const stats = buildRecapStats({
    month,
    year,
    plan,
    tasksCompleted: closedTasks.length,
    phasesCompleted: phases.map((phase) => {
      const label = formatPhaseName(phase.phase)
      return phase.projects?.name ? `${label} (${phase.projects.name})` : label
    }),
    tasks: [...statsTasks.values()],
    entries: timeEntries.map((e) => ({
      hours: Number(e.hours),
      date: String(e.date),
      taskId: e.task_id ?? null,
      isBillable: Boolean(e.is_billable),
    })),
    previous,
  })

  return { projectIds, projectNames, closedTasks, workedTasks, timedTasks, openTasks, timeEntries, phases, stats }
}
