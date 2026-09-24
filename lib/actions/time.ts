'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { adjustTaskTimeSpent, incrementTaskTimeSpent } from '@/lib/task-time'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

async function requireActiveTeamSession() {
  const supabase = await createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Unauthorized' }

  const { data: teamUser } = await supabase
    .from('team_users')
    .select('id, role')
    .eq('id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!teamUser) return { ok: false as const, error: 'Forbidden' }
  return { ok: true as const, supabase, userId: user.id, role: teamUser.role as string }
}

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
    const session = await requireActiveTeamSession()
    if (!session.ok) return { success: false, error: session.error }

    const teamUserId = session.role === 'director' ? input.team_user_id : session.userId

    const { data, error } = await session.supabase
      .from('time_entries')
      .insert({ ...input, team_user_id: teamUserId, is_invoiced: false })
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }

    if (input.task_id) {
      await incrementTaskTimeSpent(session.supabase, input.task_id, input.hours)
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
    const session = await requireActiveTeamSession()
    if (!session.ok) return { success: false, error: session.error }

    const { data: entry } = await session.supabase
      .from('time_entries')
      .select('is_invoiced, task_id, hours, team_user_id')
      .eq('id', id)
      .single()

    if (entry?.is_invoiced) {
      return { success: false, error: 'Cannot edit an invoiced time entry.' }
    }

    if (session.role !== 'director' && entry?.team_user_id !== session.userId) {
      return { success: false, error: 'You can only edit your own time entries.' }
    }

    const update = { ...input }
    if (session.role !== 'director') {
      delete update.team_user_id
    }

    const { error } = await session.supabase
      .from('time_entries')
      .update(update)
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    if (entry?.task_id && input.hours !== undefined) {
      const delta = parseFloat((input.hours - Number(entry.hours)).toFixed(2))
      await adjustTaskTimeSpent(session.supabase, entry.task_id, delta)
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
    const session = await requireActiveTeamSession()
    if (!session.ok) return { success: false, error: session.error }

    const { data: entry } = await session.supabase
      .from('time_entries')
      .select('is_invoiced, task_id, hours, team_user_id')
      .eq('id', id)
      .single()

    if (entry?.is_invoiced) {
      return { success: false, error: 'Cannot delete an invoiced time entry.' }
    }

    if (session.role !== 'director' && entry?.team_user_id !== session.userId) {
      return { success: false, error: 'You can only delete your own time entries.' }
    }

    const { error } = await session.supabase.from('time_entries').delete().eq('id', id)
    if (error) return { success: false, error: error.message }

    if (entry?.task_id) {
      await adjustTaskTimeSpent(session.supabase, entry.task_id, -Number(entry.hours))
      revalidatePath(`/app/tasks/${entry.task_id}`)
    }

    revalidatePath(`/app/projects/${projectId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
