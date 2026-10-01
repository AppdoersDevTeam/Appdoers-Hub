import type { SupabaseClient } from '@supabase/supabase-js'
import { incrementTaskTimeSpent, getTaskIsBillable, getTaskTimeSpent } from '@/lib/task-time'
import { todayYmd } from '@/lib/utils/format'

export interface LogCursorTaskTimeInput {
  taskId: string
  projectId: string
  teamUserId: string
  hours: number
  date?: string
  description?: string
  /** Ignored: task-linked entries inherit the task's billable flag. */
  isBillable?: boolean
}

export async function logCursorTaskTime(
  service: SupabaseClient,
  input: LogCursorTaskTimeInput
): Promise<{ id: string } | { error: string }> {
  const isBillable = await getTaskIsBillable(service, input.taskId)
  const { data, error } = await service
    .from('time_entries')
    .insert({
      project_id: input.projectId,
      task_id: input.taskId,
      team_user_id: input.teamUserId,
      date: input.date ?? todayYmd(),
      hours: input.hours,
      description: input.description?.trim() || null,
      is_billable: isBillable,
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
