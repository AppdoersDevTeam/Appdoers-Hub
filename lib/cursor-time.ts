import type { SupabaseClient } from '@supabase/supabase-js'
import { incrementTaskTimeSpent, getTaskTimeSpent } from '@/lib/task-time'

export interface LogCursorTaskTimeInput {
  taskId: string
  projectId: string
  teamUserId: string
  hours: number
  date?: string
  description?: string
  isBillable?: boolean
}

export async function logCursorTaskTime(
  service: SupabaseClient,
  input: LogCursorTaskTimeInput
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await service
    .from('time_entries')
    .insert({
      project_id: input.projectId,
      task_id: input.taskId,
      team_user_id: input.teamUserId,
      date: input.date ?? new Date().toISOString().split('T')[0],
      hours: input.hours,
      description: input.description?.trim() || null,
      is_billable: input.isBillable ?? true,
      is_invoiced: false,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await incrementTaskTimeSpent(service, input.taskId, input.hours)
  return { id: data.id as string }
}

export async function getTaskHoursLogged(
  service: SupabaseClient,
  taskId: string
): Promise<number> {
  return getTaskTimeSpent(service, taskId)
}
