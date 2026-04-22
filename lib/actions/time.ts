'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'

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

    revalidatePath(`/app/projects/${input.project_id}`)
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

    // Cannot edit invoiced entries
    const { data: entry } = await supabase
      .from('time_entries')
      .select('is_invoiced')
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
      .select('is_invoiced')
      .eq('id', id)
      .single()

    if (entry?.is_invoiced) {
      return { success: false, error: 'Cannot delete an invoiced time entry.' }
    }

    const { error } = await supabase.from('time_entries').delete().eq('id', id)
    if (error) return { success: false, error: error.message }

    revalidatePath(`/app/projects/${projectId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
