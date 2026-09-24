'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { logActivity } from './activity'
import { buildSlackAlert, hubTaskUrl, notifyTaskActivity, type SlackAlertField } from '@/lib/slack'
import { getTeamMemberName, slackPeopleContext } from '@/lib/team-member'
import type { TaskStatus, TaskType, TaskPriority, WorkflowStage } from '@/lib/types/database'
import { stageToTaskStatus, statusToWorkflowStage } from '@/lib/cursor-workflow'
import { WORKFLOW_STAGE_CONFIG, TASK_STATUS_CONFIG } from '@/lib/tasks/constants'
import { setTaskTimeSpent } from '@/lib/task-time'
import { closedAtForStatus } from '@/lib/tasks/closed-at'
import { createNotifications, listActiveTeamUsers, mentionedUserIds } from '@/lib/notifications'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

const statusLabel: Record<TaskStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  awaiting_review: 'Awaiting Review',
  closed: 'Closed',
}

type TaskSlackProject = {
  name: string
  clientId: string | null
  clientName: string
}

function clientFromProject(project: {
  clients?: { company_name?: string } | { company_name?: string }[] | null
} | null) {
  const clients = project?.clients
  return (Array.isArray(clients) ? clients[0] : clients) ?? null
}

async function loadTaskSlackProject(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
  projectId: string
): Promise<TaskSlackProject> {
  const { data: project } = await supabase
    .from('projects')
    .select('name, client_id, clients(company_name)')
    .eq('id', projectId)
    .single()

  const client = clientFromProject(project)
  return {
    name: (project as { name?: string } | null)?.name ?? 'project',
    clientId: (project as { client_id?: string } | null)?.client_id ?? null,
    clientName: client?.company_name ?? '',
  }
}

async function loadCurrentMemberName(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return getTeamMemberName(supabase, user?.id)
}

function taskProjectValue(project: TaskSlackProject): string {
  return project.clientName ? `${project.name} (${project.clientName})` : project.name
}

async function notifyTaskSlack(
  project: TaskSlackProject,
  input: {
    text: string
    title: string
    fields?: SlackAlertField[]
    body?: string | null
    bodyLabel?: string
    context?: string[]
    taskId?: string
  }
) {
  const url = input.taskId ? hubTaskUrl(input.taskId) : ''
  await notifyTaskActivity({
    text: input.text,
    blocks: buildSlackAlert({
      text: input.text,
      title: input.title,
      fields: [
        ...(input.fields ?? []),
        { label: 'Project', value: taskProjectValue(project) },
      ],
      body: input.body,
      bodyLabel: input.bodyLabel,
      context: input.context,
      action: url ? { label: 'Open in Hub', url } : null,
    }),
  })
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
  time_spent?: number
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

    const project = await loadTaskSlackProject(supabase, input.project_id)

    const requestedBy = await getTeamMemberName(supabase, user?.id)
    const assigneeName = (await getTeamMemberName(supabase, input.assigned_to)) ?? 'Unassigned'

    await logActivity({
      entityType: 'task',
      entityId: task.id,
      clientId: project.clientId,
      action: 'created',
      description: `Task "${task.title}" created in ${project.name}`,
    })

    await notifyTaskSlack(project, {
      text: `New task: ${task.title}`,
      title: 'New task',
      fields: [
        { label: 'Task', value: task.title },
        { label: 'Priority', value: input.priority.toUpperCase() },
        { label: 'Type', value: input.type },
        { label: 'Assigned to', value: assigneeName },
      ],
      context: slackPeopleContext({ requestedBy }),
      taskId: task.id,
    })

    if (input.assigned_to && input.assigned_to !== user?.id) {
      await createNotifications([
        {
          teamUserId: input.assigned_to,
          type: 'assigned',
          title: `Assigned: ${task.title}`,
          body: requestedBy ? `Assigned by ${requestedBy}` : null,
          entityType: 'task',
          entityId: task.id,
          href: `/app/tasks/${task.id}`,
        },
      ])
    }

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
    const { data: existing } = await supabase
      .from('tasks')
      .select('title')
      .eq('id', id)
      .single()
    const project = await loadTaskSlackProject(supabase, projectId)

    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) return { success: false, error: error.message }

    const actorName = await loadCurrentMemberName(supabase)
    await notifyTaskSlack(project, {
      text: `Task deleted: ${existing?.title ?? 'Task'}`,
      title: 'Task deleted',
      fields: [{ label: 'Task', value: existing?.title ?? 'Task' }],
      context: slackPeopleContext({ by: actorName, byLabel: 'Deleted by' }),
    })

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
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: existing } = await supabase
      .from('tasks')
      .select('title, project_id, status, workflow_stage, time_spent, created_by, closed_at, assigned_to')
      .eq('id', id)
      .single()

    if (!existing) return { success: false, error: 'Task not found' }

    const updateData: Record<string, string | number | null> = {
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
      updateData.workflow_stage = statusToWorkflowStage(
        input.status,
        existing.workflow_stage as WorkflowStage
      )
    }

    const nextStatus =
      input.workflow_stage !== undefined
        ? (input.status ?? stageToTaskStatus(input.workflow_stage))
        : input.status !== undefined
          ? input.status
          : existing.status
    if (input.workflow_stage !== undefined || input.status !== undefined) {
      updateData.closed_at = closedAtForStatus(
        nextStatus as TaskStatus,
        existing.status,
        existing.closed_at
      )
    }

    const nextProjectId = input.project_id ?? existing.project_id

    if (input.time_spent !== undefined && user) {
      const timeResult = await setTaskTimeSpent(supabase, {
        taskId: id,
        projectId: nextProjectId,
        teamUserId: user.id,
        newTotal: input.time_spent,
        description: `Time spent set to ${input.time_spent}h on ${existing.title}`,
      })
      if (timeResult.error) return { success: false, error: timeResult.error }
    }

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
    if (input.time_spent !== undefined) changes.push(`time spent → ${input.time_spent}h`)

    if (changes.length > 0 && !(input.project_id && input.project_id !== previousProjectId)) {
      await logActivity({
        entityType: 'task',
        entityId: id,
        clientId,
        action: 'updated',
        description: `Task "${input.title ?? existing.title}" updated: ${changes.join(', ')}`,
      })
    }

    const statusChanged = nextStatus !== existing.status
    const slackChanges = changes.filter((change) => !change.startsWith('workflow →'))
    if (statusChanged && !slackChanges.some((change) => change.startsWith('status →'))) {
      slackChanges.push(`status → ${statusLabel[nextStatus as TaskStatus]}`)
    }

    const slackProject = await loadTaskSlackProject(supabase, nextProjectId)
    const taskTitle = input.title ?? existing.title
    const requestedBy = await getTeamMemberName(supabase, existing.created_by)
    const updatedBy = await getTeamMemberName(supabase, user?.id)
    if (input.project_id && input.project_id !== previousProjectId) {
      await notifyTaskSlack(slackProject, {
        text: `Task moved: ${taskTitle}`,
        title: 'Task moved',
        fields: [{ label: 'Task', value: taskTitle }],
        body: `Moved to ${projectName} (${clientName})`,
        bodyLabel: 'Change',
        context: slackPeopleContext({ requestedBy, by: updatedBy }),
        taskId: id,
      })
    } else if (slackChanges.length > 0) {
      await notifyTaskSlack(slackProject, {
        text: `Task updated: ${taskTitle}`,
        title: 'Task updated',
        fields: [{ label: 'Task', value: taskTitle }],
        body: slackChanges.join('\n'),
        bodyLabel: 'Changes',
        context: slackPeopleContext({ requestedBy, by: updatedBy }),
        taskId: id,
      })
    }

    revalidatePath('/app/tasks')
    revalidatePath(`/app/tasks/${id}`)
    revalidatePath(`/app/projects/${previousProjectId}`)
    if (nextProjectId !== previousProjectId) {
      revalidatePath(`/app/projects/${nextProjectId}`)
    }

    if (
      input.assigned_to &&
      input.assigned_to !== existing.assigned_to &&
      input.assigned_to !== user?.id
    ) {
      await createNotifications([
        {
          teamUserId: input.assigned_to,
          type: 'assigned',
          title: `Assigned: ${taskTitle}`,
          entityType: 'task',
          entityId: id,
          href: `/app/tasks/${id}`,
        },
      ])
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
      .select('title, created_by, status, workflow_stage, closed_at')
      .eq('id', id)
      .single()

    const workflowStage = statusToWorkflowStage(
      status,
      (task?.workflow_stage as WorkflowStage | undefined) ?? null
    )

    const { error } = await supabase
      .from('tasks')
      .update({
        status,
        workflow_stage: workflowStage,
        closed_at: closedAtForStatus(status, task?.status, task?.closed_at),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    await logActivity({
      entityType: 'task',
      entityId: id,
      action: 'status_changed',
      description: `Task "${task?.title}" → ${statusLabel[status]}`,
    })

    const project = await loadTaskSlackProject(supabase, projectId)
    const requestedBy = await getTeamMemberName(supabase, task?.created_by)
    const updatedBy = await loadCurrentMemberName(supabase)
    await notifyTaskSlack(project, {
      text: `Task status: ${task?.title ?? 'Task'}`,
      title: 'Task status updated',
      fields: [
        { label: 'Task', value: task?.title ?? 'Task' },
        { label: 'Status', value: statusLabel[status] },
      ],
      context: slackPeopleContext({ requestedBy, by: updatedBy }),
      taskId: id,
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
      .select('title, created_by, status, closed_at')
      .eq('id', id)
      .single()

    const status = stageToTaskStatus(workflowStage)

    const { error } = await supabase
      .from('tasks')
      .update({
        workflow_stage: workflowStage,
        status,
        closed_at: closedAtForStatus(status, task?.status, task?.closed_at),
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

    if (status !== task?.status) {
      const project = await loadTaskSlackProject(supabase, projectId)
      const requestedBy = await getTeamMemberName(supabase, task?.created_by)
      const updatedBy = await loadCurrentMemberName(supabase)
      await notifyTaskSlack(project, {
        text: `Task status: ${task?.title ?? 'Task'}`,
        title: 'Task status updated',
        fields: [
          { label: 'Task', value: task?.title ?? 'Task' },
          { label: 'Status', value: statusLabel[status] },
        ],
        context: slackPeopleContext({ requestedBy, by: updatedBy }),
        taskId: id,
      })
    }

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
      .select('title, project_id, created_by, projects(name, client_id, clients(company_name))')
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

    const members = await listActiveTeamUsers()
    const mentioned = mentionedUserIds(content, members, user.id)
    if (mentioned.length > 0) {
      await createNotifications(
        mentioned.map((teamUserId) => ({
          teamUserId,
          type: 'mention' as const,
          title: `Mentioned on: ${task?.title ?? 'Task'}`,
          body: content.slice(0, 180),
          entityType: 'task',
          entityId: taskId,
          href: `/app/tasks/${taskId}`,
        }))
      )
    }

    revalidatePath('/app/tasks')
    revalidatePath(`/app/tasks/${taskId}`)
    revalidatePath(`/app/projects/${projectId}`)
    return { success: true, data: { id: inserted.id } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
