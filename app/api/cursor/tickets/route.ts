import { NextResponse } from 'next/server'
import { z } from 'zod'
import { CURSOR_STAGES, stageToTaskStatus, type CursorStage } from '@/lib/cursor-workflow'
import { formatTicket, getJoinedClientName, ticketSelect } from '@/lib/cursor-ticket-format'
import { hubTaskUrl, sendSlackAlert, slackOpenHub } from '@/lib/slack'
import { getTeamMemberName, slackPeopleContext } from '@/lib/team-member'
import { authenticateCursorRequest, cursorAuthFailed } from '@/lib/cursor-auth'

const createTicketSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().optional(),
  type: z.enum(['feature', 'bug', 'revision', 'content', 'design', 'admin']).default('feature'),
  priority: z.enum(['p0', 'p1', 'p2', 'p3']).default('p2'),
  stage: z.enum(CURSOR_STAGES).default('pm'),
  assigned_to: z.string().uuid().optional(),
  note: z.string().min(1).optional(),
})

export async function GET(req: Request) {
  const auth = await authenticateCursorRequest(req)
  if (cursorAuthFailed(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('project_id')
  const stage = searchParams.get('stage') as CursorStage | null
  const limit = Number(searchParams.get('limit') ?? '50')

  let query = auth.service
    .from('tasks')
    .select(ticketSelect)
    .order('created_at', { ascending: false })
    .limit(Number.isNaN(limit) ? 50 : Math.min(limit, 200))

  if (projectId) query = query.eq('project_id', projectId)
  if (stage && CURSOR_STAGES.includes(stage)) query = query.eq('workflow_stage', stage)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tickets = (data ?? []).map((ticket) => formatTicket(ticket as Record<string, unknown>))

  return NextResponse.json({ tickets })
}

export async function POST(req: Request) {
  const auth = await authenticateCursorRequest(req)
  if (cursorAuthFailed(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const parsed = createTicketSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const payload = parsed.data
  const status = stageToTaskStatus(payload.stage)

  const { data: inserted, error } = await auth.service
    .from('tasks')
    .insert({
      project_id: payload.project_id,
      title: payload.title,
      description: payload.description ?? null,
      type: payload.type,
      priority: payload.priority,
      status,
      workflow_stage: payload.stage,
      assigned_to: payload.assigned_to ?? null,
      created_by: auth.teamUserId,
    })
    .select('id, project_id, title, status, workflow_stage, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: project } = await auth.service
    .from('projects')
    .select('client_id, name, clients(company_name)')
    .eq('id', payload.project_id)
    .single()
  const projectName = (project as { name?: string } | null)?.name ?? 'Project'
  const clientName = getJoinedClientName((project as { clients?: unknown } | null)?.clients) ?? 'Unknown client'

  await auth.service.from('activity_log').insert({
    entity_type: 'task',
    entity_id: inserted.id,
    client_id: project?.client_id ?? null,
    action: 'cursor_ticket_created',
    description: `[${payload.stage.toUpperCase()}] ${payload.title}`,
    performed_by: auth.teamUserId,
  })

  if (payload.note) {
    await auth.service.from('activity_log').insert({
      entity_type: 'task',
      entity_id: inserted.id,
      client_id: project?.client_id ?? null,
      action: 'cursor_note',
      description: payload.note,
      performed_by: auth.teamUserId,
    })
  }

  const assigneeName = payload.assigned_to
    ? await getTeamMemberName(auth.service, payload.assigned_to)
    : 'Unassigned'

  await sendSlackAlert('tasks', {
    text: `New ticket: ${payload.title}`,
    title: 'New ticket',
    fields: [
      { label: 'Task', value: payload.title },
      { label: 'Project', value: `${projectName} (${clientName})` },
      { label: 'Priority', value: payload.priority.toUpperCase() },
      { label: 'Stage', value: payload.stage },
      { label: 'Status', value: status },
      { label: 'Assigned to', value: assigneeName ?? 'Unassigned' },
    ],
    body: payload.note ?? null,
    bodyLabel: payload.note ? 'Note' : undefined,
    context: slackPeopleContext({ requestedBy: auth.teamMemberName }),
    action: slackOpenHub(hubTaskUrl(inserted.id)),
  })

  return NextResponse.json({ ticket: inserted }, { status: 201 })
}
