import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { hashApiToken } from '@/lib/cursor-workflow'
import { logCursorTaskTime } from '@/lib/cursor-time'

const logTimeSchema = z.object({
  hours: z.number().positive().max(24),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().optional(),
  is_billable: z.boolean().optional(),
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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateCursorRequest(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id } = await params
  const parsed = logTimeSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data: task, error: taskError } = await auth.service
    .from('tasks')
    .select('id, project_id, title')
    .eq('id', id)
    .single()

  if (taskError || !task) {
    return NextResponse.json({ error: taskError?.message ?? 'Ticket not found' }, { status: 404 })
  }

  const result = await logCursorTaskTime(auth.service, {
    taskId: task.id,
    projectId: task.project_id,
    teamUserId: auth.teamUserId,
    hours: parsed.data.hours,
    date: parsed.data.date,
    description: parsed.data.description ?? `Work on: ${task.title}`,
    isBillable: parsed.data.is_billable,
  })

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  const { data: project } = await auth.service
    .from('projects')
    .select('client_id')
    .eq('id', task.project_id)
    .single()

  await auth.service.from('activity_log').insert({
    entity_type: 'task',
    entity_id: task.id,
    client_id: project?.client_id ?? null,
    action: 'cursor_time_logged',
    description: `Logged ${parsed.data.hours}h on ${task.title}`,
    performed_by: auth.teamUserId,
  })

  return NextResponse.json(
    {
      time_entry: {
        id: result.id,
        task_id: task.id,
        hours: parsed.data.hours,
        date: parsed.data.date ?? new Date().toISOString().split('T')[0],
      },
    },
    { status: 201 }
  )
}
