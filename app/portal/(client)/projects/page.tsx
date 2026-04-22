import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

const phaseLabels: Record<string, string> = {
  discovery: 'Discovery',
  design: 'Design',
  development: 'Development',
  review_qa: 'Review & QA',
  launch: 'Launch',
  maintenance: 'Maintenance',
}

const phaseOrder = ['discovery', 'design', 'development', 'review_qa', 'launch', 'maintenance']

const statusConfig: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Upcoming', cls: 'bg-gray-100 text-gray-500' },
  in_progress: { label: 'In Progress', cls: 'bg-blue-50 text-blue-600' },
  completed: { label: 'Completed', cls: 'bg-green-50 text-green-700' },
  on_hold: { label: 'On Hold', cls: 'bg-amber-50 text-amber-600' },
}

const clientStatusConfig: Record<string, { label: string; cls: string }> = {
  on_track: { label: 'On Track', cls: 'bg-green-50 text-green-700' },
  needs_attention: { label: 'Needs Attention', cls: 'bg-amber-50 text-amber-700' },
  behind_schedule: { label: 'Behind Schedule', cls: 'bg-red-50 text-red-600' },
  waiting_on_client: { label: 'Waiting on You', cls: 'bg-purple-50 text-purple-600' },
  completed: { label: 'Completed', cls: 'bg-gray-100 text-gray-600' },
}

export default async function PortalProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: contact } = await supabase
    .from('client_contacts')
    .select('client_id, first_name')
    .eq('portal_user_id', user?.id ?? '')
    .single()

  if (!contact) {
    return <div className="text-center py-20"><p className="text-gray-500">No account found.</p></div>
  }

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, type, status, current_phase, client_status, start_date, target_launch_date, description, project_phases(phase, status)')
    .eq('client_id', contact.client_id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
        <p className="text-gray-500 mt-1">
          {projects && projects.length > 0
            ? `${projects.length} project${projects.length !== 1 ? 's' : ''} with Appdoers`
            : 'Track the status of your projects with Appdoers.'}
        </p>
      </div>

      {(!projects || projects.length === 0) ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <span className="text-2xl">🚀</span>
          </div>
          <p className="font-medium text-gray-900 mb-1">No projects yet</p>
          <p className="text-sm text-gray-500">Your projects will appear here once work begins.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const phases = (project.project_phases ?? []) as { phase: string; status: string }[]
            const sortedPhases = phaseOrder.map(p => phases.find(ph => ph.phase === p)).filter(Boolean) as { phase: string; status: string }[]
            const currentPhaseStatus = statusConfig[project.client_status ?? ''] ?? null
            const cs = clientStatusConfig[project.client_status ?? '']

            const completedCount = sortedPhases.filter(p => p.status === 'completed').length
            const progressPct = sortedPhases.length > 0 ? Math.round((completedCount / sortedPhases.length) * 100) : 0

            return (
              <div key={project.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{project.name}</h2>
                      {project.description && (
                        <p className="text-sm text-gray-500 mt-0.5">{project.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {cs && (
                        <span className={cn('rounded-full px-3 py-1 text-xs font-medium', cs.cls)}>{cs.label}</span>
                      )}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-6 mt-3">
                    {project.start_date && (
                      <div>
                        <p className="text-xs text-gray-400">Started</p>
                        <p className="text-sm text-gray-700">{formatDate(project.start_date)}</p>
                      </div>
                    )}
                    {project.target_launch_date && (
                      <div>
                        <p className="text-xs text-gray-400">Target Launch</p>
                        <p className="text-sm font-medium text-gray-700">{formatDate(project.target_launch_date)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-400">Progress</p>
                      <p className="text-sm font-medium text-gray-700">{progressPct}% complete</p>
                    </div>
                  </div>
                </div>

                {/* Phase progress */}
                <div className="px-6 py-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">Project Phases</p>
                  <div className="flex gap-1.5">
                    {sortedPhases.map((ph, i) => {
                      const isActive = ph.phase === project.current_phase
                      const isDone = ph.status === 'completed'
                      return (
                        <div key={ph.phase} className="flex-1">
                          <div
                            className={cn(
                              'h-2 rounded-full mb-1.5 transition-colors',
                              isDone ? 'bg-green-400' : isActive ? 'bg-blue-500' : 'bg-gray-200'
                            )}
                          />
                          <p className={cn(
                            'text-xs text-center truncate',
                            isDone ? 'text-green-600 font-medium' : isActive ? 'text-blue-600 font-medium' : 'text-gray-400'
                          )}>
                            {phaseLabels[ph.phase] ?? ph.phase}
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Current phase callout */}
                  {project.current_phase && (
                    <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-4 py-2.5">
                      <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                      <p className="text-sm text-blue-700">
                        Currently in <strong>{phaseLabels[project.current_phase] ?? project.current_phase}</strong> phase
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
