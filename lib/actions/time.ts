'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { adjustTaskTimeSpent, incrementTaskTimeSpent } from '@/lib/task-time'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface LogTimeInput {
  project_id: string
  task_id?: string
  team_user_id: string
  date: string
  hours: number
  description?: string
  is_billable: boolean
}

export async function logTimeAction(
  input: LogTimeInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createSupabaseClient()

    const { data, error } = await supabase
      .from('time_entries')
      .insert({ ...input, is_invoiced: false })
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }

    if (input.task_id) {
      await incrementTaskTimeSpent(supabase, input.task_id, input.hours)
    }

    revalidatePath(`/app/projects/${input.project_id}`)
    if (input.task_id) revalidatePath(`/app/tasks/${input.task_id}`)
    return { success: true, data: { id: data.id } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function updateTimeEntryAction(
  id: string,
  projectId: string,
  input: Partial<Omit<LogTimeInput, 'project_id'>>
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()

    const { data: entry } = await supabase
      .from('time_entries')
      .select('is_invoiced, task_id, hours')
      .eq('id', id)
      .single()

    if (entry?.is_invoiced) {
      return { success: false, error: 'Cannot edit an invoiced time entry.' }
    }

    const { error } = await supabase
      .from('time_entries')
      .update(input)
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    if (entry?.task_id && input.hours !== undefined) {
      const delta = parseFloat((input.hours - Number(entry.hours)).toFixed(2))
      await adjustTaskTimeSpent(supabase, entry.task_id, delta)
      revalidatePath(`/app/tasks/${entry.task_id}`)
    }

    revalidatePath(`/app/projects/${projectId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function deleteTimeEntryAction(
  id: string,
  projectId: string
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()

    const { data: entry } = await supabase
      .from('time_entries')
      .select('is_invoiced, task_id, hours')
      .eq('id', id)
      .single()

    if (entry?.is_invoiced) {
      return { success: false, error: 'Cannot delete an invoiced time entry.' }
    }

    const { error } = await supabase.from('time_entries').delete().eq('id', id)
    if (error) return { success: false, error: error.message }

    if (entry?.task_id) {
      await adjustTaskTimeSpent(supabase, entry.task_id, -Number(entry.hours))
      revalidatePath(`/app/tasks/${entry.task_id}`)
    }

    revalidatePath(`/app/projects/${projectId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
