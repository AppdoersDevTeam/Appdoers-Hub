import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { CURSOR_STAGES, hashApiToken, stageToTaskStatus, type CursorStage } from '@/lib/cursor-workflow'
import { sendToChannel } from '@/lib/slack'

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

async function authenticateCursorRequest(req: Request) {
  const authHeader = req.headers.get('authorization')
  const headerToken = req.headers.get('x-appdoers-api-token')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  const token = (headerToken ?? bearerToken ?? '').trim()

  if (!token) return { error: 'Missing API token' as const }

  const service = await createServiceClient()
  const { data, error } = await service
    .from('cursor_api_tokens')
    .select('id, team_user_id')
    .eq('token_hash', hashApiToken(token))
    .eq('is_active', true)
    .single()

  if (error || !data) return { error: 'Invalid API token' as const }

  await service.from('cursor_api_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)
  return { service, teamUserId: data.team_user_id }
}

export async function GET(req: Request) {
  const auth = await authenticateCursorRequest(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('project_id')
  const stage = searchParams.get('stage') as CursorStage | null
  const limit = Number(searchParams.get('limit') ?? '50')

  let query = auth.service
    .from('tasks')
    .select('id, project_id, title, description, type, priority, status, workflow_stage, assigned_to, created_by, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(Number.isNaN(limit) ? 50 : Math.min(limit, 200))

  if (projectId) query = query.eq('project_id', projectId)
  if (stage && CURSOR_STAGES.includes(stage)) query = query.eq('workflow_stage', stage)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tickets: data ?? [] })
}

export async function POST(req: Request) {
  const auth = await authenticateCursorRequest(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: 401 })

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
  const clientName =
    ((project as { clients?: { company_name?: string } } | null)?.clients?.company_name as
      | string
      | undefined) ?? 'Unknown client'

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

  await sendToChannel('tasks', `🎫 Cursor ticket created: ${payload.title}`, [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🎫 Cursor Ticket Created*\n*Task:* ${payload.title}\n*Project:* ${projectName} (${clientName})\n*Priority:* ${payload.priority.toUpperCase()}\n*Stage:* ${payload.stage}\n*Status:* ${status}`,
      },
    },
  ])

  return NextResponse.json({ ticket: inserted }, { status: 201 })
}
