import type { SupabaseClient } from '@supabase/supabase-js'
import { getNzWeekRange } from '@/lib/client-weekly-digest'
import { APP_TIMEZONE } from '@/lib/utils/format'

export interface OverviewProject {
  id: string
  name: string
  type: string
  current_phase: string
  client_status: string
  status: string
  target_launch_date: string | null
}

export interface OverviewTicket {
  id: string
  title: string
  status: string
  due_date: string | null
  project_name: string
  assignee_name: string | null
}

export interface OverviewDomain {
  id: string
  domain_name: string
  expiry_date: string | null
  auto_renew: boolean
  ssl_status: string | null
  days_until_expiry: number | null
}

export interface ClientOverviewStats {
  weekLabel: string
  openProjects: number
  completedProjects: number
  onHoldProjects: number
  projects: OverviewProject[]
  openTickets: number
  overdueTickets: number
  ticketsDoneThisWeek: number
  hoursThisWeek: number
  doneThisWeek: OverviewTicket[]
  overdue: OverviewTicket[]
  domains: OverviewDomain[]
  nextDomain: OverviewDomain | null
  expiringDomains: number
  expiredDomains: number
  proposalsSent: number
  proposalsApproved: number
  contractsSent: number
  contractsSigned: number
  outstandingInvoiceTotal: number
  outstandingInvoiceCount: number
  overdueInvoiceCount: number
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function nzTodayYmd(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

function daysUntil(dateStr: string, today: string): number {
  const start = Date.parse(`${today}T00:00:00+12:00`)
  const end = Date.parse(`${dateStr}T00:00:00+12:00`)
  return Math.round((end - start) / 86_400_000)
}

export async function getClientOverviewStats(
  supabase: SupabaseClient,
  clientId: string
): Promise<ClientOverviewStats> {
  const week = getNzWeekRange()
  const today = nzTodayYmd()

  const [
    projectsRes,
    domainsRes,
    proposalsRes,
    contractsRes,
    invoicesRes,
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, type, current_phase, client_status, status, target_launch_date')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
    supabase
      .from('client_domains')
      .select('id, domain_name, expiry_date, auto_renew, ssl_status')
      .eq('client_id', clientId)
      .order('expiry_date', { ascending: true }),
    supabase.from('proposals').select('id, status').eq('client_id', clientId),
    supabase.from('contracts').select('id, status').eq('client_id', clientId),
    supabase
      .from('invoices')
      .select('id, status, total, due_date')
      .eq('client_id', clientId)
      .in('status', ['sent', 'overdue']),
  ])

  const projects = (projectsRes.data ?? []) as OverviewProject[]
  const projectIds = projects.map((p) => p.id)

  let tasks: {
    id: string
    title: string
    status: string
    due_date: string | null
    updated_at: string
    projects: { name?: string } | { name?: string }[] | null
    team_users: { full_name?: string } | { full_name?: string }[] | null
  }[] = []
  let hoursThisWeek = 0

  if (projectIds.length > 0) {
    const [openTasksRes, closedTasksRes, timeRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, status, due_date, updated_at, projects(name), team_users!assigned_to(full_name)')
        .in('project_id', projectIds)
        .neq('status', 'closed'),
      supabase
        .from('tasks')
        .select('id, title, status, due_date, updated_at, projects(name), team_users!assigned_to(full_name)')
        .in('project_id', projectIds)
        .eq('status', 'closed')
        .gte('closed_at', week.startIso)
        .order('closed_at', { ascending: false }),
      supabase
        .from('time_entries')
        .select('hours')
        .in('project_id', projectIds)
        .gte('date', week.startDate)
        .lte('date', week.endDate),
    ])
    const openTasks = (openTasksRes.data ?? []) as typeof tasks
    const closedTasks = (closedTasksRes.data ?? []) as typeof tasks
    tasks = [...openTasks, ...closedTasks]
    hoursThisWeek = parseFloat(
      ((timeRes.data ?? []).reduce((sum, row) => sum + Number(row.hours ?? 0), 0)).toFixed(1)
    )
  }

  const mapTicket = (task: (typeof tasks)[number]): OverviewTicket => ({
    id: task.id,
    title: task.title,
    status: task.status,
    due_date: task.due_date,
    project_name: one(task.projects)?.name ?? '—',
    assignee_name: one(task.team_users)?.full_name ?? null,
  })

  const openTasks = tasks.filter((t) => t.status !== 'closed')
  const doneThisWeek = tasks.filter((t) => t.status === 'closed').map(mapTicket)
  const overdue = openTasks
    .filter((t) => t.due_date && t.due_date < today)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
    .map(mapTicket)

  const domains: OverviewDomain[] = (domainsRes.data ?? [])
    .map((d) => ({
      id: d.id as string,
      domain_name: d.domain_name as string,
      expiry_date: (d.expiry_date as string | null) ?? null,
      auto_renew: Boolean(d.auto_renew),
      ssl_status: (d.ssl_status as string | null) ?? null,
      days_until_expiry: d.expiry_date ? daysUntil(d.expiry_date as string, today) : null,
    }))
    .sort((a, b) => {
      if (a.days_until_expiry == null) return 1
      if (b.days_until_expiry == null) return -1
      return a.days_until_expiry - b.days_until_expiry
    })

  const datedDomains = domains
    .filter((d) => d.days_until_expiry != null)
    .sort((a, b) => (a.days_until_expiry ?? 0) - (b.days_until_expiry ?? 0))

  const invoices = invoicesRes.data ?? []
  const outstandingInvoiceTotal = invoices.reduce((sum, inv) => sum + Number(inv.total ?? 0), 0)

  return {
    weekLabel: week.label,
    openProjects: projects.filter((p) => p.status === 'active').length,
    completedProjects: projects.filter((p) => p.status === 'completed').length,
    onHoldProjects: projects.filter((p) => p.status === 'on_hold').length,
    projects,
    openTickets: openTasks.length,
    overdueTickets: overdue.length,
    ticketsDoneThisWeek: doneThisWeek.length,
    hoursThisWeek,
    doneThisWeek: doneThisWeek.slice(0, 6),
    overdue: overdue.slice(0, 6),
    domains,
    nextDomain: datedDomains[0] ?? null,
    expiringDomains: datedDomains.filter((d) => (d.days_until_expiry ?? 0) >= 0 && (d.days_until_expiry ?? 0) <= 30).length,
    expiredDomains: datedDomains.filter((d) => (d.days_until_expiry ?? 0) < 0).length,
    proposalsSent: (proposalsRes.data ?? []).filter((p) => p.status === 'sent').length,
    proposalsApproved: (proposalsRes.data ?? []).filter((p) => p.status === 'approved').length,
    contractsSent: (contractsRes.data ?? []).filter((c) => c.status === 'sent').length,
    contractsSigned: (contractsRes.data ?? []).filter((c) => c.status === 'signed').length,
    outstandingInvoiceTotal,
    outstandingInvoiceCount: invoices.length,
    overdueInvoiceCount: invoices.filter((inv) => inv.status === 'overdue' || (inv.due_date && inv.due_date < today)).length,
  }
}
