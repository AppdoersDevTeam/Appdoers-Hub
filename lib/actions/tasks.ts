'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { logActivity } from './activity'
import { sendToChannel } from '@/lib/slack'
import type { TaskStatus, TaskType, TaskPriority } from '@/lib/types/database'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

const statusLabel: Record<TaskStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  awaiting_review: 'Awaiting Review',
  closed: 'Closed',
}

export interface CreateTaskInput {
  project_id: string
  title: string
  description?: string
  type: TaskType
  priority: TaskPriority
  assigned_to?: string
  due_date?: string
  live_url?: string
}

export async function createTaskAction(
  input: CreateTaskInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({ ...input, status: 'open', created_by: user?.id })
      .select('id, title')
      .single()

    if (error) return { success: false, error: error.message }

    // Get project + client info for Slack
    const { data: project } = await supabase
      .from('projects')
      .select('name, client_id, clients(company_name)')
      .eq('id', input.project_id)
      .single()

    const projectName = (project as { name?: string } | null)?.name ?? 'project'
    const clientName =
      ((project as { clients?: { company_name?: string } } | null)?.clients
        ?.company_name) ?? ''

    // Get assignee name
    let assigneeName = 'Unassigned'
    if (input.assigned_to) {
      const { data: member } = await supabase
        .from('team_users')
        .select('full_name')
        .eq('id', input.assigned_to)
        .single()
      assigneeName = member?.full_name ?? 'Unassigned'
    }

    await logActivity({
      entityType: 'task',
      entityId: task.id,
      clientId: (project as { client_id?: string } | null)?.client_id ?? null,
      action: 'created',
      description: `Task "${task.title}" created in ${projectName}`,
    })

    await sendToChannel('tasks', `🎫 New Task: ${task.title}`, [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🎫 New Task Created*\n*Task:* ${task.title}\n*Project:* ${projectName}${clientName ? ` (${clientName})` : ''}\n*Priority:* ${input.priority.toUpperCase()}\n*Type:* ${input.type}\n*Assigned To:* ${assigneeName}`,
        },
      },
    ])

    revalidatePath('/app/tasks')
    revalidatePath(`/app/projects/${input.project_id}`)
    return { success: true, data: { id: task.id } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function deleteTaskAction(
  id: string,
  projectId: string
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/app/tasks')
    revalidatePath(`/app/projects/${projectId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function updateTaskAction(
  id: string,
  projectId: string,
  input: Partial<CreateTaskInput>
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { error } = await supabase.from('tasks').update(input).eq('id', id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/app/tasks')
    revalidatePath(`/app/projects/${projectId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function updateTaskStatusAction(
  id: string,
  projectId: string,
  status: TaskStatus
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()

    const { data: task } = await supabase
      .from('tasks')
      .select('title')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    await logActivity({
      entityType: 'task',
      entityId: id,
      action: 'status_changed',
      description: `Task "${task?.title}" → ${statusLabel[status]}`,
    })

    revalidatePath('/app/tasks')
    revalidatePath(`/app/projects/${projectId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function addTaskNoteAction(
  taskId: string,
  projectId: string,
  note: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const content = note.trim()
    if (!content) return { success: false, error: 'Note is required.' }

    const supabase = await createSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'You must be signed in to add a note.' }

    const { data: task } = await supabase
      .from('tasks')
      .select('title, project_id, projects(name, client_id, clients(company_name))')
      .eq('id', taskId)
      .single()

    const { data: inserted, error: insertError } = await supabase
      .from('activity_log')
      .insert({
        entity_type: 'task',
        entity_id: taskId,
        client_id: (task?.projects as { client_id?: string } | null)?.client_id ?? null,
        action: 'user_note',
        description: content,
        performed_by: user.id,
      })
      .select('id')
      .single()

    if (insertError || !inserted) {
      return { success: false, error: insertError?.message ?? 'Failed to save note.' }
    }

    await supabase.from('tasks').update({ updated_at: new Date().toISOString() }).eq('id', taskId)

    const projectName = (task?.projects as { name?: string } | null)?.name ?? 'project'
    const clientName =
      ((task?.projects as { clients?: { company_name?: string } } | null)?.clients?.company_name as
        | string
        | undefined) ?? ''

    await sendToChannel('tasks', `📝 Task note added: ${task?.title ?? 'Task'}`, [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📝 Task Note Added*\n*Task:* ${task?.title ?? 'Task'}\n*Project:* ${projectName}${clientName ? ` (${clientName})` : ''}\n*Note:* ${content}`,
        },
      },
    ])

    revalidatePath('/app/tasks')
    revalidatePath(`/app/tasks/${taskId}`)
    revalidatePath(`/app/projects/${projectId}`)
    return { success: true, data: { id: inserted.id } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
