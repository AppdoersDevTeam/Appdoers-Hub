import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { TasksTable } from '@/components/team/tasks/tasks-table'

export default async function TasksPage() {
  const supabase = await createClient()

  const [{ data: tasks }, { data: projects }, { data: teamMembers }] =
    await Promise.all([
      supabase
        .from('tasks')
        .select(`
          id, title, type, priority, status, project_id,
          due_date, updated_at,
          team_users!assigned_to(full_name),
          projects(name, clients(company_name))
        `)
        .order('updated_at', { ascending: false }),
      supabase
        .from('projects')
        .select('id, name')
        .eq('status', 'active')
        .order('name'),
      supabase
        .from('team_users')
        .select('id, full_name')
        .eq('is_active', true)
        .order('full_name'),
    ])

  const today = new Date().toISOString().split('T')[0]
  const allTasks = tasks ?? []
  const openCount = allTasks.filter((t) => t.status !== 'closed').length
  const overdueCount = allTasks.filter(
    (t) => t.due_date && t.due_date < today && t.status !== 'closed'
  ).length

  const rows = allTasks.map((t) => ({
    id: t.id,
    title: t.title,
    type: t.type,
    priority: t.priority,
    status: t.status,
    project_id: t.project_id,
    project_name:
      (t.projects as { name?: string } | null)?.name ?? '—',
    client_name:
      ((t.projects as { clients?: { company_name?: string } } | null)?.clients
        ?.company_name) ?? '—',
    assigned_to_name:
      (t.team_users as { full_name?: string } | null)?.full_name ?? null,
    due_date: t.due_date,
    updated_at: t.updated_at,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        subtitle={`${openCount} open${overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}`}
      />
      <TasksTable
        tasks={rows}
        projects={projects ?? []}
        teamMembers={teamMembers ?? []}
        showProjectCol={true}
      />
    </div>
  )
}
