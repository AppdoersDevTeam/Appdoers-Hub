import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { ProjectsTable } from '@/components/team/projects/projects-table'

export default async function ProjectsPage() {
  const supabase = await createClient()

  const [{ data: projects }, { data: clients }] = await Promise.all([
    supabase
      .from('projects')
      .select(`
        id, client_id, name, type, current_phase, client_status, status,
        start_date, target_launch_date, estimated_hours,
        clients(company_name),
        time_entries(hours)
      `)
      .order('created_at', { ascending: false }),
    supabase
      .from('clients')
      .select('id, company_name')
      .eq('status', 'active')
      .order('company_name'),
  ])

  const rows = (projects ?? []).map((p) => {
    const loggedHours = (p.time_entries as { hours: number }[] ?? []).reduce(
      (sum, t) => sum + (Number(t.hours) || 0),
      0
    )
    return {
      id: p.id,
      name: p.name,
      type: p.type,
      current_phase: p.current_phase,
      client_status: p.client_status,
      status: p.status,
      start_date: p.start_date,
      target_launch_date: p.target_launch_date,
      estimated_hours: p.estimated_hours ? Number(p.estimated_hours) : null,
      logged_hours: loggedHours,
      client_id: p.client_id,
      client_name:
        (p.clients as { company_name?: string } | null)?.company_name ?? '—',
    }
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        subtitle={`${rows.filter((r) => r.status === 'active').length} active project${rows.filter((r) => r.status === 'active').length !== 1 ? 's' : ''}`}
      />
      <ProjectsTable projects={rows} clients={clients ?? []} />
    </div>
  )
}
