import { NextRequest } from 'next/server'
import { renderPdfRoute } from '@/lib/pdf/render-route'
import { requireTeamAccess } from '@/lib/supabase/route-access'
import { formatDateTime } from '@/lib/utils/format'
import type { TasksPdfFilter, TasksPdfRow } from '@/lib/pdf/tasks-pdf-document'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_IDS = 2000
const CHUNK_SIZE = 100
const MAX_FILTERS = 12
const MAX_TEXT = 80

type TaskJoin = {
  id: string
  title: string
  type: string
  priority: string
  status: string
  project_id: string
  assigned_to: string | null
  time_spent: number | string | null
  due_date: string | null
  updated_at: string
  team_users: { full_name?: string } | null
  projects: {
    name?: string
    client_id?: string
    clients?: { company_name?: string } | null
  } | null
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size))
  }
  return groups
}

function asTrimmedString(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback
  return value.trim().slice(0, MAX_TEXT)
}

function parseFilters(raw: unknown): TasksPdfFilter[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, MAX_FILTERS).flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const label = asTrimmedString((item as { label?: unknown }).label)
    const value = asTrimmedString((item as { value?: unknown }).value)
    if (!label || !value) return []
    return [{ label, value }]
  })
}

function mapTask(row: TaskJoin): TasksPdfRow {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    priority: row.priority,
    status: row.status,
    project_name: row.projects?.name ?? '—',
    client_name: row.projects?.clients?.company_name ?? '—',
    assigned_to_name: row.team_users?.full_name ?? null,
    due_date: row.due_date,
    time_spent: Number(row.time_spent ?? 0),
  }
}

export async function POST(req: NextRequest) {
  const access = await requireTeamAccess()
  if (!access.ok) {
    return Response.json({ error: access.message }, { status: access.status })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const idsRaw = (body as { ids?: unknown }).ids
  if (!Array.isArray(idsRaw) || idsRaw.length === 0) {
    return Response.json({ error: 'No filtered tasks to export' }, { status: 400 })
  }
  if (idsRaw.length > MAX_IDS) {
    return Response.json({ error: `Cannot export more than ${MAX_IDS} tasks` }, { status: 400 })
  }

  const ids = [...new Set(idsRaw.filter((id): id is string => typeof id === 'string' && UUID_RE.test(id)))]
  if (ids.length === 0) {
    return Response.json({ error: 'No valid task ids provided' }, { status: 400 })
  }

  const showProjectCol = (body as { showProjectCol?: unknown }).showProjectCol !== false
  const title = asTrimmedString((body as { title?: unknown }).title, 'Tasks') || 'Tasks'
  const filters = parseFilters((body as { filters?: unknown }).filters)

  const fetched: TaskJoin[] = []
  for (const group of chunk(ids, CHUNK_SIZE)) {
    const { data, error } = await access.db
      .from('tasks')
      .select(`
        id, title, type, priority, status, project_id, assigned_to, time_spent,
        due_date, updated_at,
        team_users!assigned_to(full_name),
        projects(name, client_id, clients(company_name))
      `)
      .in('id', group)

    if (error) {
      console.error('Tasks PDF fetch error:', error.message)
      return Response.json({ error: 'Failed to load tasks' }, { status: 500 })
    }
    fetched.push(...((data ?? []) as unknown as TaskJoin[]))
  }

  const order = new Map(ids.map((id, index) => [id, index]))
  const tasks = fetched
    .map(mapTask)
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))

  if (tasks.length === 0) {
    return Response.json({ error: 'No matching tasks found' }, { status: 404 })
  }

  const generatedAt = formatDateTime(new Date())
  const filename = `${title}_${new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' }).format(new Date())}.pdf`

  return renderPdfRoute(async () => {
    const { renderTasksPdfToBuffer } = await import('@/lib/pdf/render-tasks-pdf')
    return renderTasksPdfToBuffer({
      title,
      generatedAt,
      tasks,
      filters,
      showProjectCol,
    })
  }, filename)
}
