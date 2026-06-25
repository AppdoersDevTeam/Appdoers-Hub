import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { CURSOR_STAGES, hashApiToken, stageToTaskStatus } from '@/lib/cursor-workflow'
import { formatTicket, getJoinedClientName, ticketSelect } from '@/lib/cursor-ticket-format'
import { sendToChannel } from '@/lib/slack'

const updateTicketSchema = z.object({
  project_id: z.string().uuid().optional(),
  title: z.string().min(3).optional(),
  description: z.string().nullable().optional(),
  type: z.enum(['feature', 'bug', 'revision', 'content', 'design', 'admin']).optional(),
  priority: z.enum(['p0', 'p1', 'p2', 'p3']).optional(),
  stage: z.enum(CURSOR_STAGES).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  note: z.string().min(1).optional(),
  claim: z.boolean().optional(),
  agent_name: z.string().min(1).optional(),
})

type ProjectSummary = {
  client_id: string | null
  name: string
  client_name: string
}

async function getProjectSummary(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  projectId: string
): Promise<ProjectSummary | null> {
  const { data: project } = await service
    .from('projects')
    .select('client_id, name, clients(company_name)')
    .eq('id', projectId)
    .single()

  if (!project) return null

  return {
    client_id: project.client_id ?? null,
    name: (project as { name?: string }).name ?? 'Project',
    client_name: getJoinedClientName((project as { clients?: unknown }).clients) ?? 'Unknown client',
  }
}

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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateCursorRequest(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id } = await params
  const { data, error } = await auth.service.from('tasks').select(ticketSelect).eq('id', id).single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ ticket: formatTicket(data as Record<string, unknown>) })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateCursorRequest(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id } = await params
  const parsed = updateTicketSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const payload = parsed.data
  const { data: existing, error: existingError } = await auth.service
    .from('tasks')
    .select('id, project_id, title, status, workflow_stage, assigned_to')
    .eq('id', id)
    .single()

  if (existingError || !existing) {
    return NextResponse.json({ error: existingError?.message ?? 'Ticket not found' }, { status: 404 })
  }

  let nextProject: ProjectSummary | null = null
  if (payload.project_id !== undefined && payload.project_id !== existing.project_id) {
    nextProject = await getProjectSummary(auth.service, payload.project_id)
    if (!nextProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
  }

  const previousProject = await getProjectSummary(auth.service, existing.project_id)

  const updateData: Record<string, string | null> = {}
  if (payload.project_id !== undefined) updateData.project_id = payload.project_id
  if (payload.title !== undefined) updateData.title = payload.title
  if (payload.description !== undefined) updateData.description = payload.description
  if (payload.type !== undefined) updateData.type = payload.type
  if (payload.priority !== undefined) updateData.priority = payload.priority
  if (payload.assigned_to !== undefined) updateData.assigned_to = payload.assigned_to
  if (payload.claim && payload.assigned_to === undefined) {
    updateData.assigned_to = auth.teamUserId
  }
  if (payload.stage !== undefined) {
    updateData.workflow_stage = payload.stage
    updateData.status = stageToTaskStatus(payload.stage)
  }
  if (Object.keys(updateData).length > 0 || payload.note || payload.claim) {
    updateData.updated_at = new Date().toISOString()
  }

  if (Object.keys(updateData).length > 0) {
    const { error } = await auth.service.from('tasks').update(updateData).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (nextProject) {
    await auth.service
      .from('activity_log')
      .update({ client_id: nextProject.client_id })
      .eq('entity_type', 'task')
      .eq('entity_id', id)

    await auth.service.from('activity_log').insert({
      entity_type: 'task',
      entity_id: id,
      client_id: nextProject.client_id,
      action: 'cursor_project_changed',
      description: `Moved from ${previousProject?.name ?? 'Unknown project'} (${previousProject?.client_name ?? 'Unknown client'}) to ${nextProject.name} (${nextProject.client_name})`,
      performed_by: auth.teamUserId,
    })
  }

  const { data: task } = await auth.service
    .from('tasks')
    .select('project_id, title, assigned_to, workflow_stage, status')
    .eq('id', id)
    .single()
  const project = (await getProjectSummary(auth.service, task?.project_id ?? '')) ?? {
    client_id: null,
    name: 'Project',
    client_name: 'Unknown client',
  }
  const projectName = project.name
  const clientName = project.client_name

  let assigneeName: string | null = null
  if (task?.assigned_to) {
    const { data: assignee } = await auth.service
      .from('team_users')
      .select('full_name')
      .eq('id', task.assigned_to)
      .single()
    assigneeName = assignee?.full_name ?? null
  }

  if (payload.claim) {
    const claimBy = payload.agent_name ?? 'Cursor AI'
    await auth.service.from('activity_log').insert({
      entity_type: 'task',
      entity_id: id,
      client_id: project.client_id,
      action: 'cursor_claimed',
      description: `${claimBy} claimed ${task?.title ?? 'Task'}`,
      performed_by: auth.teamUserId,
    })

    await sendToChannel('tasks', `🤖 Ticket claimed: ${task?.title ?? 'Task'}`, [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🤖 Ticket Claimed*\n*Task:* ${task?.title ?? 'Task'}\n*Project:* ${projectName} (${clientName})\n*Claimed By:* ${claimBy}\n*Assigned To:* ${assigneeName ?? 'Unassigned'}`,
        },
      },
    ])
  }

  if (payload.stage) {
    await auth.service.from('activity_log').insert({
      entity_type: 'task',
      entity_id: id,
      client_id: project.client_id,
      action: 'cursor_stage_changed',
      description: `[${payload.stage.toUpperCase()}] ${task?.title ?? 'Task'}`,
      performed_by: auth.teamUserId,
    })

    await sendToChannel('tasks', `🔄 Ticket stage update: ${task?.title ?? 'Task'}`, [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🔄 Workflow Stage Changed*\n*Task:* ${task?.title ?? 'Task'}\n*Project:* ${projectName} (${clientName})\n*New Stage:* ${payload.stage}\n*Status:* ${task?.status ?? 'unknown'}`,
        },
      },
    ])
  }

  if (payload.note) {
    await auth.service.from('activity_log').insert({
      entity_type: 'task',
      entity_id: id,
      client_id: project.client_id,
      action: 'cursor_note',
      description: payload.note,
      performed_by: auth.teamUserId,
    })

    await sendToChannel('tasks', `📝 Ticket note: ${task?.title ?? 'Task'}`, [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📝 Progress Note*\n*Task:* ${task?.title ?? 'Task'}\n*Project:* ${projectName} (${clientName})\n*Note:* ${payload.note}`,
        },
      },
    ])
  }

  if (nextProject) {
    await sendToChannel('tasks', `📁 Ticket project updated: ${task?.title ?? 'Task'}`, [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📁 Ticket Project Updated*\n*Task:* ${task?.title ?? 'Task'}\n*From:* ${previousProject?.name ?? 'Unknown project'} (${previousProject?.client_name ?? 'Unknown client'})\n*To:* ${nextProject.name} (${nextProject.client_name})`,
        },
      },
    ])
  }

  const { data: updated } = await auth.service.from('tasks').select(ticketSelect).eq('id', id).single()

  return NextResponse.json({ ticket: formatTicket(updated as Record<string, unknown>) })
}
