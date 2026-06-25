'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { logActivity } from './activity'
import { sendToChannel } from '@/lib/slack'
import type { TaskStatus, TaskType, TaskPriority, WorkflowStage } from '@/lib/types/database'
import { stageToTaskStatus } from '@/lib/cursor-workflow'
import { WORKFLOW_STAGE_CONFIG, TASK_STATUS_CONFIG } from '@/lib/tasks/constants'

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

export interface UpdateTaskDetailsInput {
  title?: string
  description?: string | null
  type?: TaskType
  priority?: TaskPriority
  status?: TaskStatus
  workflow_stage?: WorkflowStage
  project_id?: string
  assigned_to?: string | null
  due_date?: string | null
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
  const result = await updateTaskDetailsAction(id, projectId, input)
  if (!result.success) return result
  return { success: true, data: undefined }
}

export async function updateTaskDetailsAction(
  id: string,
  previousProjectId: string,
  input: UpdateTaskDetailsInput
): Promise<ActionResult<{ projectId: string }>> {
  try {
    const supabase = await createSupabaseClient()

    const { data: existing } = await supabase
      .from('tasks')
      .select('title, project_id, status, workflow_stage')
      .eq('id', id)
      .single()

    if (!existing) return { success: false, error: 'Task not found' }

    const updateData: Record<string, string | null> = {
      updated_at: new Date().toISOString(),
    }

    if (input.title !== undefined) updateData.title = input.title
    if (input.description !== undefined) updateData.description = input.description
    if (input.type !== undefined) updateData.type = input.type
    if (input.priority !== undefined) updateData.priority = input.priority
    if (input.assigned_to !== undefined) updateData.assigned_to = input.assigned_to
    if (input.due_date !== undefined) updateData.due_date = input.due_date
    if (input.project_id !== undefined) updateData.project_id = input.project_id

    if (input.workflow_stage !== undefined) {
      updateData.workflow_stage = input.workflow_stage
      updateData.status = input.status ?? stageToTaskStatus(input.workflow_stage)
    } else if (input.status !== undefined) {
      updateData.status = input.status
    }

    const nextProjectId = input.project_id ?? existing.project_id

    const { error } = await supabase.from('tasks').update(updateData).eq('id', id)
    if (error) return { success: false, error: error.message }

    const { data: nextProject } = await supabase
      .from('projects')
      .select('name, client_id, clients(company_name)')
      .eq('id', nextProjectId)
      .single()

    const clientId = nextProject?.client_id ?? null
    const clientName =
      ((nextProject as { clients?: { company_name?: string } } | null)?.clients?.company_name as
        | string
        | undefined) ?? 'Unknown client'
    const projectName = (nextProject as { name?: string } | null)?.name ?? 'Project'

    if (input.project_id && input.project_id !== previousProjectId) {
      const { data: previousProject } = await supabase
        .from('projects')
        .select('name, clients(company_name)')
        .eq('id', previousProjectId)
        .single()

      await supabase
        .from('activity_log')
        .update({ client_id: clientId })
        .eq('entity_type', 'task')
        .eq('entity_id', id)

      const previousClientName =
        ((previousProject as { clients?: { company_name?: string } } | null)?.clients?.company_name as
          | string
          | undefined) ?? 'Unknown client'

      await logActivity({
        entityType: 'task',
        entityId: id,
        clientId,
        action: 'project_changed',
        description: `Moved from ${(previousProject as { name?: string } | null)?.name ?? 'Unknown project'} (${previousClientName}) to ${projectName} (${clientName})`,
      })
    }

    const changes: string[] = []
    if (input.title !== undefined && input.title !== existing.title) changes.push(`title updated`)
    if (input.description !== undefined) changes.push('description updated')
    if (input.type !== undefined) changes.push(`type → ${input.type}`)
    if (input.priority !== undefined) changes.push(`priority → ${input.priority.toUpperCase()}`)
    if (input.status !== undefined && input.workflow_stage === undefined) {
      changes.push(`status → ${statusLabel[input.status]}`)
    }
    if (input.workflow_stage !== undefined) {
      changes.push(
        `workflow → ${WORKFLOW_STAGE_CONFIG[input.workflow_stage].label}`
      )
    }
    if (input.assigned_to !== undefined) changes.push('assignee updated')
    if (input.due_date !== undefined) changes.push('due date updated')

    if (changes.length > 0 && !(input.project_id && input.project_id !== previousProjectId)) {
      await logActivity({
        entityType: 'task',
        entityId: id,
        clientId,
        action: 'updated',
        description: `Task "${input.title ?? existing.title}" updated: ${changes.join(', ')}`,
      })
    }

    revalidatePath('/app/tasks')
    revalidatePath(`/app/tasks/${id}`)
    revalidatePath(`/app/projects/${previousProjectId}`)
    if (nextProjectId !== previousProjectId) {
      revalidatePath(`/app/projects/${nextProjectId}`)
    }

    return { success: true, data: { projectId: nextProjectId } }
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
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    await logActivity({
      entityType: 'task',
      entityId: id,
      action: 'status_changed',
      description: `Task "${task?.title}" → ${statusLabel[status]}`,
    })

    revalidatePath('/app/tasks')
    revalidatePath(`/app/tasks/${id}`)
    revalidatePath(`/app/projects/${projectId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function updateTaskWorkflowStageAction(
  id: string,
  projectId: string,
  workflowStage: WorkflowStage
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()

    const { data: task } = await supabase
      .from('tasks')
      .select('title')
      .eq('id', id)
      .single()

    const status = stageToTaskStatus(workflowStage)

    const { error } = await supabase
      .from('tasks')
      .update({
        workflow_stage: workflowStage,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    await logActivity({
      entityType: 'task',
      entityId: id,
      action: 'workflow_stage_changed',
      description: `Task "${task?.title}" → ${WORKFLOW_STAGE_CONFIG[workflowStage].label} (${TASK_STATUS_CONFIG[status].label})`,
    })

    revalidatePath('/app/tasks')
    revalidatePath(`/app/tasks/${id}`)
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
