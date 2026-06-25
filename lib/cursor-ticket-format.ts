type JoinedClient = { company_name?: string } | { company_name?: string }[] | null | undefined

type JoinedProject = {
  name?: string
  clients?: JoinedClient
} | null | undefined

export function getJoinedClientName(clients: unknown): string | null {
  if (!clients) return null
  if (Array.isArray(clients)) {
    const first = clients[0] as { company_name?: string } | undefined
    return first?.company_name ?? null
  }
  if (typeof clients === 'object' && clients !== null && 'company_name' in clients) {
    return (clients as { company_name?: string }).company_name ?? null
  }
  return null
}

export const ticketSelect =
  'id, project_id, title, description, type, priority, status, workflow_stage, assigned_to, created_by, created_at, updated_at, projects(name, clients(company_name))'

export function formatTicket(ticket: Record<string, unknown>) {
  const projects = ticket.projects as JoinedProject
  const { projects: _projects, ...rest } = ticket
  return {
    ...rest,
    project_name: projects?.name ?? null,
    client_name: getJoinedClientName(projects?.clients),
  }
}
