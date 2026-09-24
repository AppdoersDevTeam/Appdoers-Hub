import type { SupabaseClient } from '@supabase/supabase-js'
import { APP_TIMEZONE, formatHours, formatMonthDay } from '@/lib/utils/format'
import { hubClientUrl, type SlackBlock } from '@/lib/slack'

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

export function getNzWeekRange(now = new Date()): {
  startDate: string
  endDate: string
  startIso: string
  label: string
} {
  const parts = new Intl.DateTimeFormat('en-NZ', {
    timeZone: APP_TIMEZONE,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const year = Number(get('year'))
  const month = Number(get('month'))
  const day = Number(get('day'))
  const weekday = get('weekday')
  const offset = WEEKDAY_INDEX[weekday] ?? 0

  const monday = new Date(Date.UTC(year, month - 1, day - offset))
  const startDate = ymd(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate())
  const endDate = ymd(year, month, day)

  return {
    startDate,
    endDate,
    startIso: `${startDate}T00:00:00+12:00`,
    label: `${formatMonthDay(`${startDate}T12:00:00+12:00`)} – ${formatMonthDay(`${endDate}T12:00:00+12:00`)}`,
  }
}

function truncateList(lines: string[], max = 12): string {
  if (lines.length <= max) return lines.join('\n')
  const extra = lines.length - max
  return `${lines.slice(0, max).join('\n')}\n_…and ${extra} more_`
}

type TimeEntryRow = {
  hours: number | string
  task_id: string | null
  description: string | null
  team_users: { full_name?: string } | { full_name?: string }[] | null
  tasks: { id?: string; title?: string; status?: string } | { id?: string; title?: string; status?: string }[] | null
}

type ClosedTaskRow = {
  id: string
  title: string
  team_users: { full_name?: string } | { full_name?: string }[] | null
}

function relationName(
  value: { full_name?: string } | { full_name?: string }[] | null | undefined
): string {
  if (Array.isArray(value)) return value[0]?.full_name?.trim() || 'Unassigned'
  return value?.full_name?.trim() || 'Unassigned'
}

function relationTask(
  value: TimeEntryRow['tasks']
): { id?: string; title?: string; status?: string } | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

export interface ClientWeeklyDigest {
  text: string
  blocks: SlackBlock[]
}

export async function buildClientWeeklyDigest(
  supabase: SupabaseClient,
  client: { id: string; company_name: string }
): Promise<ClientWeeklyDigest | null> {
  const range = getNzWeekRange()

  const { data: projects } = await supabase
    .from('projects')
    .select('id')
    .eq('client_id', client.id)

  const projectIds = (projects ?? []).map((p) => p.id as string)
  if (projectIds.length === 0) return null

  const [{ data: entries }, { data: closedTasks }] = await Promise.all([
    supabase
      .from('time_entries')
      .select('hours, task_id, description, team_users(full_name), tasks(id, title, status)')
      .in('project_id', projectIds)
      .gte('date', range.startDate)
      .lte('date', range.endDate),
    supabase
      .from('tasks')
      .select('id, title, team_users!assigned_to(full_name)')
      .in('project_id', projectIds)
      .eq('status', 'closed')
      .gte('updated_at', range.startIso)
      .order('updated_at', { ascending: false }),
  ])

  const timeEntries = (entries ?? []) as TimeEntryRow[]
  const closed = (closedTasks ?? []) as ClosedTaskRow[]

  if (timeEntries.length === 0 && closed.length === 0) return null

  const hoursByPerson = new Map<string, number>()
  const hoursByTask = new Map<string, number>()
  const worked = new Map<string, { title: string; status: string; hours: number }>()
  const orphans: { label: string; hours: number }[] = []

  for (const entry of timeEntries) {
    const hours = Number(entry.hours) || 0
    const person = relationName(entry.team_users)
    hoursByPerson.set(person, (hoursByPerson.get(person) ?? 0) + hours)

    const task = relationTask(entry.tasks)
    if (task?.id) {
      hoursByTask.set(task.id, (hoursByTask.get(task.id) ?? 0) + hours)
      const existing = worked.get(task.id)
      worked.set(task.id, {
        title: task.title ?? 'Task',
        status: task.status ?? 'open',
        hours: (existing?.hours ?? 0) + hours,
      })
    } else {
      const label = entry.description?.trim() || 'General time'
      orphans.push({ label, hours })
    }
  }

  const totalHours = [...hoursByPerson.values()].reduce((sum, n) => sum + n, 0)

  const personLines = [...hoursByPerson.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, hours]) => `• ${name} — ${formatHours(hours, '0h')}`)

  const closedIds = new Set(closed.map((t) => t.id))
  const doneLines = closed.map((task) => {
    const hours = hoursByTask.get(task.id)
    const who = relationName(task.team_users)
    const hoursBit = hours ? ` (${formatHours(hours)})` : ''
    return `• ${task.title}${hoursBit} — ${who}`
  })

  const alsoLines = [
    ...[...worked.entries()]
      .filter(([id, item]) => !closedIds.has(id) && item.status !== 'closed')
      .sort((a, b) => b[1].hours - a[1].hours)
      .map(([, item]) => `• ${item.title} (${formatHours(item.hours)})`),
    ...orphans.map((item) => `• ${item.label} (${formatHours(item.hours)})`),
  ]

  const hubUrl = hubClientUrl(client.id)
  const text = `${client.company_name} · week of ${range.label} · ${formatHours(totalHours, '0h')} logged`

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: client.company_name.slice(0, 150), emoji: true },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Weekly digest · ${range.label}*\n*${formatHours(totalHours, '0h')}* logged`,
      },
    },
  ]

  if (personLines.length > 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*By person*\n${truncateList(personLines)}` },
    })
  }

  if (doneLines.length > 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Done*\n${truncateList(doneLines)}` },
    })
  }

  if (alsoLines.length > 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Also worked*\n${truncateList(alsoLines)}` },
    })
  }

  if (hubUrl) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Open in Hub', emoji: true },
          url: hubUrl,
        },
      ],
    })
  }

  return { text, blocks }
}
