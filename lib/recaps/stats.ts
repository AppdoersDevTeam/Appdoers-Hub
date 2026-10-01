import { HOURLY_RATE } from '@/lib/pricing/appdoers-pricing'
import { roundHours } from '@/lib/utils/format'
import type {
  RecapPlanKey,
  RecapStats,
  RecapStatsCategory,
  RecapStatsTask,
  RecapStatsWeek,
} from '@/lib/recaps/types'

export function taskTypeToCategory(type: string): string {
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

/** Prefer the service catalog plan_key; fall back to the legacy subscription_plan enum. */
export function resolveRecapPlanKey(input: {
  catalogPlanKey?: string | null
  subscriptionPlan?: string | null
}): RecapPlanKey {
  const key = input.catalogPlanKey?.trim() || input.subscriptionPlan?.trim() || 'none'
  return key === 'full' || key === 'basic' ? key : 'none'
}

export interface RecapStatsTaskInput {
  id: string
  title: string
  type: string
  status: string
  isBillable: boolean
  projectName: string | null
}

export interface RecapStatsEntryInput {
  hours: number
  date: string
  taskId: string | null
  isBillable: boolean
}

export interface BuildRecapStatsInput {
  month: number
  year: number
  plan: RecapPlanKey
  tasksCompleted: number
  phasesCompleted: string[]
  /** Every task worked or closed in the month (deduplicated by id). */
  tasks: RecapStatsTaskInput[]
  /** Time entries dated within the month. */
  entries: RecapStatsEntryInput[]
  hourlyRate?: number
}

function weekBuckets(month: number, year: number): { label: string; start: number; end: number }[] {
  const lastDay = new Date(year, month, 0).getDate()
  const buckets: { label: string; start: number; end: number }[] = []
  for (let start = 1; start <= lastDay; start += 7) {
    const end = Math.min(start + 6, lastDay)
    buckets.push({ label: `${start}–${end}`, start, end })
  }
  // Fold a 1–3 day tail into the previous week so the chart doesn't show a stub bar.
  if (buckets.length > 1 && buckets[buckets.length - 1].end - buckets[buckets.length - 1].start < 3) {
    const tail = buckets.pop()!
    const prev = buckets[buckets.length - 1]
    prev.end = tail.end
    prev.label = `${prev.start}–${tail.end}`
  }
  return buckets
}

export function buildRecapStats(input: BuildRecapStatsInput): RecapStats {
  const hourlyRate = input.hourlyRate ?? HOURLY_RATE
  const taskById = new Map(input.tasks.map((t) => [t.id, t]))
  const hoursByTask = new Map<string, number>()

  const buckets = weekBuckets(input.month, input.year)
  const weekHours = buckets.map(() => 0)

  let hoursLogged = 0
  let nonBillableHours = 0

  for (const entry of input.entries) {
    const hours = Number(entry.hours) || 0
    if (hours <= 0) continue
    hoursLogged += hours

    const task = entry.taskId ? taskById.get(entry.taskId) : undefined
    const isBillable = task ? task.isBillable : entry.isBillable
    if (!isBillable) nonBillableHours += hours

    if (entry.taskId) {
      hoursByTask.set(entry.taskId, (hoursByTask.get(entry.taskId) ?? 0) + hours)
    }

    const day = Number(entry.date.slice(8, 10))
    const bucketIndex = buckets.findIndex((b) => day >= b.start && day <= b.end)
    if (bucketIndex >= 0) weekHours[bucketIndex] += hours
  }

  const tasks: RecapStatsTask[] = input.tasks
    .map((t) => ({
      title: t.title,
      category: taskTypeToCategory(t.type),
      status: t.status,
      hours: roundHours(hoursByTask.get(t.id) ?? 0),
      isBillable: t.isBillable,
      projectName: t.projectName,
    }))
    .sort((a, b) => b.hours - a.hours || a.title.localeCompare(b.title))

  const categoryMap = new Map<string, RecapStatsCategory>()
  for (const task of tasks) {
    const current = categoryMap.get(task.category) ?? { name: task.category, tasks: 0, hours: 0 }
    current.tasks += 1
    current.hours = roundHours(current.hours + task.hours)
    categoryMap.set(task.category, current)
  }

  const taskHours = tasks.reduce((sum, t) => sum + t.hours, 0)
  const untrackedHours = roundHours(hoursLogged - taskHours)
  if (untrackedHours > 0) {
    const other = categoryMap.get('Other') ?? { name: 'Other', tasks: 0, hours: 0 }
    other.hours = roundHours(other.hours + untrackedHours)
    categoryMap.set('Other', other)
  }

  const categories = [...categoryMap.values()].sort(
    (a, b) => b.hours - a.hours || b.tasks - a.tasks || a.name.localeCompare(b.name)
  )

  const weeklyHours: RecapStatsWeek[] = buckets.map((b, i) => ({
    label: b.label,
    hours: roundHours(weekHours[i]),
  }))

  const roundedNonBillable = roundHours(nonBillableHours)
  const savings =
    input.plan === 'full'
      ? {
          nonBillableHours: roundedNonBillable,
          hourlyRate,
          amount: Math.round(roundedNonBillable * hourlyRate * 100) / 100,
        }
      : null

  return {
    version: 1,
    tasksCompleted: input.tasksCompleted,
    hoursLogged: roundHours(hoursLogged),
    phasesCompleted: input.phasesCompleted,
    categories,
    tasks,
    weeklyHours,
    plan: input.plan,
    savings,
  }
}

export function parseRecapStats(value: unknown): RecapStats | null {
  if (!value || typeof value !== 'object') return null
  const stats = value as Partial<RecapStats>
  if (stats.version !== 1 || !Array.isArray(stats.tasks) || !Array.isArray(stats.categories)) {
    return null
  }
  return {
    version: 1,
    tasksCompleted: Number(stats.tasksCompleted) || 0,
    hoursLogged: Number(stats.hoursLogged) || 0,
    phasesCompleted: Array.isArray(stats.phasesCompleted) ? stats.phasesCompleted.map(String) : [],
    categories: stats.categories,
    tasks: stats.tasks,
    weeklyHours: Array.isArray(stats.weeklyHours) ? stats.weeklyHours : [],
    plan: resolveRecapPlanKey({ subscriptionPlan: stats.plan }),
    savings: stats.savings ?? null,
  }
}
