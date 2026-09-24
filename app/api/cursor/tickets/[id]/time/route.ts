import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logCursorTaskTime } from '@/lib/cursor-time'
import { authenticateCursorRequest, cursorAuthFailed } from '@/lib/cursor-auth'
import { todayYmd } from '@/lib/utils/format'

const logTimeSchema = z.object({
  hours: z.number().positive().max(24),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().optional(),
  is_billable: z.boolean().optional(),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateCursorRequest(req)
  if (cursorAuthFailed(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

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
        date: parsed.data.date ?? todayYmd(),
      },
    },
    { status: 201 }
  )
}
