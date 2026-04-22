import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { PhasesTab } from '@/components/team/projects/phases-tab'
import { TimeTab } from '@/components/team/projects/time-tab'
import { TasksTable } from '@/components/team/tasks/tasks-table'
import { EmptyState } from '@/components/ui/empty-state'
import { ClientStatusSelector } from '@/components/team/projects/client-status-selector'
import { formatDate } from '@/lib/utils/format'
import { ArrowLeft, Folder, StickyNote } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { ProjectPhase } from '@/lib/types/database'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'phases', label: 'Phases' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'time', label: 'Time' },
  { key: 'files', label: 'Files' },
  { key: 'notes', label: 'Notes' },
]

const phaseLabel: Record<string, string> = {
  discovery: 'Discovery', design: 'Design', development: 'Development',
  review_qa: 'Review & QA', launch: 'Launch', maintenance: 'Maintenance',
}

const clientStatusConfig: Record<string, { label: string; cls: string }> = {
  new: { label: 'New', cls: 'bg-[#94A3B8]/10 text-[#94A3B8]' },
  in_progress: { label: 'In Progress', cls: 'bg-[#3B82F6]/10 text-[#3B82F6]' },
  awaiting_appdoers: { label: 'Awaiting Appdoers', cls: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
  awaiting_client: { label: 'Awaiting Client', cls: 'bg-[#F97316]/10 text-[#F97316]' },
  completed: { label: 'Completed', cls: 'bg-[#10B981]/10 text-[#10B981]' },
  on_hold: { label: 'On Hold', cls: 'bg-[#EF4444]/10 text-[#EF4444]' },
}

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function ProjectDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { tab = 'overview' } = await searchParams
  const supabase = await createClient()

  const [{ data: project }, { data: phases }, { data: teamMembers }, { data: timeEntries }, { data: tasks }] =
    await Promise.all([
      supabase.from('projects').select('*, clients(company_name)').eq('id', id).single(),
      supabase.from('project_phases').select('*').eq('project_id', id).order('created_at'),
      supabase.from('team_users').select('id, full_name, hourly_rate').eq('is_active', true),
      supabase.from('time_entries').select('*, team_users(full_name, hourly_rate), tasks(title)').eq('project_id', id).order('date', { ascending: false }),
      supabase.from('tasks').select('*, team_users(full_name)').eq('project_id', id).order('created_at', { ascending: false }),
    ])

  if (!project) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const clientName =
    (project.clients as { company_name?: string } | null)?.company_name ?? '—'
  const cs = clientStatusConfig[project.client_status] ?? clientStatusConfig.new

  return (
    <div className="space-y-6">
      <Link href="/app/projects" className="inline-flex items-center gap-1.5 text-sm text-[#94A3B8] hover:text-[#F1F5F9] transition-colors">
        <ArrowLeft className="h-4 w-4" /> All Projects
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageHeader title={project.name} subtitle={clientName} />
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('rounded-full px-3 py-1 text-sm font-medium', cs.cls)}>{cs.label}</span>
          <ClientStatusSelector projectId={id} currentStatus={project.client_status} />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#1F2D45]">
        <nav className="flex gap-0.5">
          {TABS.map(({ key, label }) => (
            <Link
              key={key}
              href={`/app/projects/${id}?tab=${key}`}
              className={cn(
                'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                tab === key ? 'border-[#3B82F6] text-[#3B82F6]' : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 hub-card space-y-4">
            <h3 className="text-sm font-semibold text-[#F1F5F9]">Project Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <InfoRow label="Client" value={<Link href={`/app/clients/${project.client_id}`} className="text-[#3B82F6] hover:underline">{clientName}</Link>} />
              <InfoRow label="Type" value={<span className="capitalize">{project.type}</span>} />
              <InfoRow label="Current Phase" value={phaseLabel[project.current_phase] ?? project.current_phase} />
              <InfoRow label="Status" value={project.status} />
              <InfoRow label="Start Date" value={project.start_date ? formatDate(project.start_date) : '—'} />
              <InfoRow label="Target Launch" value={project.target_launch_date ? formatDate(project.target_launch_date) : '—'} />
              {project.actual_launch_date && (
                <InfoRow label="Actual Launch" value={formatDate(project.actual_launch_date)} />
              )}
              <InfoRow label="Estimated Hours" value={project.estimated_hours ? `${project.estimated_hours}h` : '—'} />
            </div>
            {project.description && (
              <div className="border-t border-[#1F2D45] pt-4">
                <p className="text-xs text-[#475569]">Description</p>
                <p className="mt-1 text-sm text-[#CBD5E1]">{project.description}</p>
              </div>
            )}
          </div>
          <div className="hub-card space-y-3 text-sm">
            <h3 className="text-sm font-semibold text-[#F1F5F9]">Phase Progress</h3>
            {['discovery', 'design', 'development', 'review_qa', 'launch', 'maintenance'].map((p) => {
              const phaseIndex = ['discovery', 'design', 'development', 'review_qa', 'launch', 'maintenance'].indexOf(p)
              const currentIndex = ['discovery', 'design', 'development', 'review_qa', 'launch', 'maintenance'].indexOf(project.current_phase)
              const done = phaseIndex < currentIndex
              const active = phaseIndex === currentIndex
              return (
                <div key={p} className="flex items-center gap-2">
                  <div className={cn('h-2 w-2 rounded-full flex-shrink-0', done ? 'bg-[#10B981]' : active ? 'bg-[#3B82F6]' : 'bg-[#1F2D45]')} />
                  <span className={cn('text-xs', done ? 'text-[#10B981]' : active ? 'text-[#3B82F6] font-medium' : 'text-[#475569]')}>
                    {phaseLabel[p]}
                    {active && ' ← current'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'phases' && (
        <PhasesTab
          projectId={id}
          currentPhase={project.current_phase as ProjectPhase}
          phases={phases ?? []}
          teamMembers={teamMembers ?? []}
        />
      )}

      {tab === 'tasks' && (
        <TasksTable
          tasks={(tasks ?? []).map((t) => ({
            id: t.id,
            title: t.title,
            type: t.type,
            priority: t.priority,
            status: t.status,
            project_id: t.project_id,
            project_name: project.name,
            client_name: clientName,
            assigned_to_name: (t.team_users as { full_name?: string } | null)?.full_name ?? null,
            due_date: t.due_date,
            updated_at: t.updated_at,
          }))}
          projects={[{ id: project.id, name: project.name }]}
          teamMembers={teamMembers ?? []}
          defaultProjectId={id}
        />
      )}

      {tab === 'time' && (
        <TimeTab
          projectId={id}
          clientId={project.client_id}
          entries={(timeEntries ?? []) as Parameters<typeof TimeTab>[0]['entries']}
          estimatedHours={project.estimated_hours ? Number(project.estimated_hours) : null}
          teamMembers={teamMembers ?? []}
          currentUserId={user?.id ?? ''}
          tasks={(tasks ?? []).map((t) => ({ id: t.id, title: t.title }))}
        />
      )}

      {tab === 'files' && (
        <EmptyState icon={Folder} title="No files yet" description="Upload project files and deliverables here." />
      )}
      {tab === 'notes' && (
        <EmptyState icon={StickyNote} title="No notes yet" description="Internal project notes will appear here." />
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-[#475569]">{label}</p>
      <p className="mt-0.5 text-[#CBD5E1]">{value}</p>
    </div>
  )
}
