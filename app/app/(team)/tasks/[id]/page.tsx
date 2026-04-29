import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { TaskDetailActions } from '@/components/team/tasks/task-detail-actions'
import { TaskNoteComposer } from '@/components/team/tasks/task-note-composer'
import { formatRelativeTime } from '@/lib/utils/format'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const typeConfig: Record<string, { label: string; cls: string }> = {
  feature:  { label: 'Feature',  cls: 'bg-[#3B82F6]/10 text-[#3B82F6]' },
  bug:      { label: 'Bug',      cls: 'bg-[#EF4444]/10 text-[#EF4444]' },
  revision: { label: 'Revision', cls: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
  content:  { label: 'Content',  cls: 'bg-[#10B981]/10 text-[#10B981]' },
  design:   { label: 'Design',   cls: 'bg-[#8B5CF6]/10 text-[#8B5CF6]' },
  admin:    { label: 'Admin',    cls: 'bg-[#94A3B8]/10 text-[#94A3B8]' },
}

const priorityConfig: Record<string, { label: string; cls: string }> = {
  p0: { label: 'P0', cls: 'bg-[#EF4444]/20 text-[#EF4444] font-bold' },
  p1: { label: 'P1', cls: 'bg-[#F97316]/10 text-[#F97316]' },
  p2: { label: 'P2', cls: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
  p3: { label: 'P3', cls: 'bg-[#94A3B8]/10 text-[#94A3B8]' },
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  open:            { label: 'Open',            cls: 'bg-[#94A3B8]/10 text-[#94A3B8]' },
  in_progress:     { label: 'In Progress',     cls: 'bg-[#3B82F6]/10 text-[#3B82F6]' },
  awaiting_review: { label: 'Awaiting Review', cls: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
  closed:          { label: 'Closed',          cls: 'bg-[#10B981]/10 text-[#10B981]' },
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function TaskDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: task } = await supabase
    .from('tasks')
    .select(`
      *,
      projects(id, name, client_id, clients(company_name)),
      team_users!assigned_to(full_name),
      creator:team_users!created_by(full_name)
    `)
    .eq('id', id)
    .single()

  if (!task) notFound()

  const { data: activity } = await supabase
    .from('activity_log')
    .select('id, action, description, created_at, actor:team_users!performed_by(full_name)')
    .eq('entity_type', 'task')
    .eq('entity_id', id)
    .order('created_at', { ascending: false })
    .limit(30)

  const project = task.projects as { id: string; name: string; client_id: string; clients: { company_name: string } | null } | null
  const clientName = project?.clients?.company_name ?? '—'
  const assignedName = (task.team_users as { full_name?: string } | null)?.full_name ?? '—'
  const creatorName = (task.creator as { full_name?: string } | null)?.full_name ?? '—'

  const ty = typeConfig[task.type] ?? typeConfig.admin
  const pr = priorityConfig[task.priority] ?? priorityConfig.p3
  const st = statusConfig[task.status] ?? statusConfig.open

  const lastUpdatedAt = task.updated_at
    ? `${formatNzDateTime(task.updated_at)} (${formatRelativeTime(task.updated_at)})`
    : '—'

  return (
    <div className="space-y-6">
      <Link
        href="/app/tasks"
        className="inline-flex items-center gap-1.5 text-sm text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> All Tasks
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader title={task.title} subtitle={project ? project.name : '—'} />
        <TaskDetailActions taskId={id} projectId={task.project_id} currentStatus={task.status} />
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-4">
          <div className="hub-card space-y-5 xl:sticky xl:top-6">
            <div className="flex flex-wrap gap-2">
              <span className={cn('rounded-full px-3 py-1 text-xs font-medium', ty.cls)}>{ty.label}</span>
              <span className={cn('rounded-full px-3 py-1 text-xs font-medium', pr.cls)}>{pr.label}</span>
              <span className={cn('rounded-full px-3 py-1 text-xs font-medium', st.cls)}>{st.label}</span>
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 xl:grid-cols-1">
              <InfoRow label="Project">
                {project
                  ? <Link href={`/app/projects/${project.id}`} className="text-[#3B82F6] hover:underline">{project.name}</Link>
                  : '—'}
              </InfoRow>
              <InfoRow label="Client">
                {project?.client_id
                  ? <Link href={`/app/clients/${project.client_id}`} className="text-[#3B82F6] hover:underline">{clientName}</Link>
                  : '—'}
              </InfoRow>
              <InfoRow label="Assigned To"><span className="text-[#CBD5E1]">{assignedName}</span></InfoRow>
              <InfoRow label="Created By"><span className="text-[#CBD5E1]">{creatorName}</span></InfoRow>
              <InfoRow label="Due Date"><span className="text-[#CBD5E1]">{task.due_date ? formatNzDate(task.due_date) : '—'}</span></InfoRow>
              <InfoRow label="Created"><span className="text-[#CBD5E1]">{formatNzDate(task.created_at)}</span></InfoRow>
              <InfoRow label="Last Updated"><span className="text-[#CBD5E1]">{lastUpdatedAt}</span></InfoRow>
            </div>

            {task.description && (
              <div className="border-t border-[#1F2D45] pt-4">
                <p className="text-xs text-[#475569] mb-2">Description</p>
                <p className="text-sm text-[#CBD5E1] whitespace-pre-wrap leading-relaxed">{task.description}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 xl:col-span-8">
          <TaskNoteComposer taskId={id} projectId={task.project_id} />

          <div className="hub-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#F8FAFC]">Activity</h3>
              <span className="text-xs text-[#64748B]">{activity?.length ?? 0} items</span>
            </div>

            {!activity || activity.length === 0 ? (
              <p className="text-sm text-[#64748B]">No activity updates yet.</p>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {activity.map((item) => {
                  const actorName = getActorName(item.action, item.actor as { full_name?: string } | null)
                  const when = `${formatRelativeTime(item.created_at)} • ${formatNzDateTime(item.created_at)}`
                  return (
                    <div key={item.id} className="rounded-lg border border-[#1F2D45] p-3">
                      <p className="text-sm text-[#E2E8F0] whitespace-pre-wrap leading-relaxed">{item.description}</p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="text-xs text-[#475569]">
                          {formatActionLabel(item.action)} by {actorName}
                        </p>
                        <span className="text-xs text-[#64748B]">{when}</span>
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

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-[#475569]">{label}</p>
      <div className="mt-0.5">{children}</div>
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

function formatNzDate(value: string | Date) {
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'Pacific/Auckland',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
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
