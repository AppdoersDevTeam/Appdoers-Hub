'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { logActivity } from './activity'
import { sendSlackMessage } from '@/lib/slack'
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

    await sendSlackMessage(`🎫 New Task: ${task.title}`, [
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
