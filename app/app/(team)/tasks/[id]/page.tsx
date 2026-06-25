import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TaskDetailsEditor } from '@/components/team/tasks/task-details-editor'
import { TaskNoteComposer } from '@/components/team/tasks/task-note-composer'
import { formatRelativeTime } from '@/lib/utils/format'
import { ArrowLeft } from 'lucide-react'
import type { TaskPriority, TaskStatus, TaskType, WorkflowStage } from '@/lib/types/database'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TaskDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: task }, { data: projects }, { data: teamMembers }] = await Promise.all([
    supabase
      .from('tasks')
      .select(`
        *,
        projects(id, name, client_id, clients(company_name)),
        team_users!assigned_to(full_name),
        creator:team_users!created_by(full_name)
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('projects')
      .select('id, name, client_id, clients(company_name)')
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('team_users')
      .select('id, full_name')
      .eq('is_active', true)
      .order('full_name'),
  ])

  if (!task) notFound()

  const { data: activity } = await supabase
    .from('activity_log')
    .select('id, action, description, created_at, actor:team_users!performed_by(full_name)')
    .eq('entity_type', 'task')
    .eq('entity_id', id)
    .order('created_at', { ascending: false })
    .limit(30)

  const project = task.projects as {
    id: string
    name: string
    client_id: string
    clients: { company_name: string } | null
  } | null

  const projectOptions = (projects ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    client_id: item.client_id,
    client_name:
      ((item.clients as { company_name?: string } | null)?.company_name as string | undefined) ?? 'Unknown client',
  }))

  const creatorName = (task.creator as { full_name?: string } | null)?.full_name ?? '—'

  return (
    <div className="space-y-6">
      <Link
        href="/app/tasks"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> All Tasks
      </Link>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-4">
          <TaskDetailsEditor
            taskId={id}
            projectId={task.project_id}
            title={task.title}
            description={task.description}
            type={task.type as TaskType}
            priority={task.priority as TaskPriority}
            status={task.status as TaskStatus}
            workflowStage={task.workflow_stage as WorkflowStage}
            assignedTo={task.assigned_to}
            dueDate={task.due_date}
            createdAt={task.created_at}
            updatedAt={task.updated_at}
            createdByName={creatorName}
            projects={projectOptions}
            teamMembers={teamMembers ?? []}
          />
        </div>

        <div className="space-y-6 xl:col-span-8">
          <div className="hub-card">
            <p className="text-xs text-slate-500">Current project</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {project ? (
                <Link href={`/app/projects/${project.id}`} className="hover:text-blue-600 transition-colors">
                  {project.name}
                </Link>
              ) : (
                '—'
              )}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {project?.clients?.company_name ?? '—'} · Updated {formatRelativeTime(task.updated_at)}
            </p>
          </div>

          <TaskNoteComposer taskId={id} projectId={task.project_id} />

          <div className="hub-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Activity</h3>
              <span className="text-xs text-slate-500">{activity?.length ?? 0} items</span>
            </div>

            {!activity || activity.length === 0 ? (
              <p className="text-sm text-slate-500">No activity updates yet.</p>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {activity.map((item) => {
                  const actorName = getActorName(item.action, item.actor as { full_name?: string } | null)
                  const when = `${formatRelativeTime(item.created_at)} • ${formatNzDateTime(item.created_at)}`
                  return (
                    <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{item.description}</p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">
                          {formatActionLabel(item.action)} by {actorName}
                        </p>
                        <span className="text-xs text-slate-500">{when}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatActionLabel(action: string) {
  switch (action) {
    case 'cursor_ticket_created':
      return 'Ticket created'
    case 'cursor_claimed':
      return 'Ticket claimed'
    case 'cursor_stage_changed':
      return 'Stage changed'
    case 'cursor_project_changed':
    case 'project_changed':
      return 'Project changed'
    case 'workflow_stage_changed':
      return 'Workflow stage changed'
    case 'status_changed':
      return 'Status changed'
    case 'updated':
      return 'Details updated'
    case 'cursor_note':
      return 'Progress note'
    case 'user_note':
      return 'Team note'
    default:
      return action.replaceAll('_', ' ')
  }
}

function getActorName(action: string, actor: { full_name?: string } | null) {
  if (action.startsWith('cursor_')) return 'Cursor AI'
  return actor?.full_name ?? 'System'
}

function formatNzDateTime(value: string | Date) {
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'Pacific/Auckland',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value))
}
