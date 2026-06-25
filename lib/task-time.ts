import type { SupabaseClient } from '@supabase/supabase-js'

export async function getTaskTimeSpent(
  service: SupabaseClient,
  taskId: string
): Promise<number> {
  const { data } = await service.from('tasks').select('time_spent').eq('id', taskId).single()
  return Number(data?.time_spent ?? 0)
}

export async function incrementTaskTimeSpent(
  service: SupabaseClient,
  taskId: string,
  hours: number
): Promise<void> {
  if (hours <= 0) return

  const current = await getTaskTimeSpent(service, taskId)
  const next = parseFloat((current + hours).toFixed(2))

  await service
    .from('tasks')
    .update({ time_spent: next, updated_at: new Date().toISOString() })
    .eq('id', taskId)
}

export async function adjustTaskTimeSpent(
  service: SupabaseClient,
  taskId: string,
  hoursDelta: number
): Promise<void> {
  if (hoursDelta === 0) return

  const current = await getTaskTimeSpent(service, taskId)
  const next = Math.max(0, parseFloat((current + hoursDelta).toFixed(2)))

  await service
    .from('tasks')
    .update({ time_spent: next, updated_at: new Date().toISOString() })
    .eq('id', taskId)
}

export interface SetTaskTimeSpentInput {
  taskId: string
  projectId: string
  teamUserId: string
  newTotal: number
  description?: string
}

/** Set task time_spent directly; positive deltas also create a time entry for monthly reporting. */
export async function setTaskTimeSpent(
  service: SupabaseClient,
  input: SetTaskTimeSpentInput
): Promise<{ error?: string }> {
  const newTotal = Math.max(0, parseFloat(input.newTotal.toFixed(2)))
  const current = await getTaskTimeSpent(service, input.taskId)
  const delta = parseFloat((newTotal - current).toFixed(2))

  const { error: updateError } = await service
    .from('tasks')
    .update({ time_spent: newTotal, updated_at: new Date().toISOString() })
    .eq('id', input.taskId)

  if (updateError) return { error: updateError.message }

  if (delta > 0) {
    const { error: entryError } = await service.from('time_entries').insert({
      project_id: input.projectId,
      task_id: input.taskId,
      team_user_id: input.teamUserId,
      date: new Date().toISOString().split('T')[0],
      hours: delta,
      description: input.description?.trim() || 'Time spent updated on task',
      is_billable: true,
      is_invoiced: false,
    })

    if (entryError) return { error: entryError.message }
  }

  return {}
}
