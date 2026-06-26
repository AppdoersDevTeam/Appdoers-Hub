import { createClient } from '@/lib/supabase/server'
import type { LeadStatus, WorkflowStage } from '@/lib/types/database'
import { WORKFLOW_STAGE_CONFIG } from '@/lib/tasks/constants'
import {
  buildDateBuckets,
  bucketKeyForDate,
  getPeriodRange,
  parseDashboardPeriod,
  type DashboardPeriod,
} from './periods'
import {
  LEAD_STATUS_LABELS,
  PIPELINE_LEAD_STATUSES,
  WORKFLOW_STAGE_ORDER,
  type DashboardAnalytics,
} from './types'

export async function getDashboardAnalytics(
  periodInput?: string
): Promise<DashboardAnalytics> {
  const period = parseDashboardPeriod(periodInput)
  const range = getPeriodRange(period)
  const today = new Date().toISOString().split('T')[0]
  const periodStartIso = `${range.start}T00:00:00.000Z`
  const periodEndIso = `${range.end}T23:59:59.999Z`

  const supabase = await createClient()

  const [
    leadsRes,
    clientsRes,
    projectsRes,
    openTasksRes,
    closedTasksRes,
    timeInPeriodRes,
    uninvoicedTimeRes,
    overdueInvoicesRes,
    paidInvoicesRes,
    activityRes,
    renewalsRes,
  ] = await Promise.all([
    supabase
      .from('leads')
      .select(
        'id, contact_name, company_name, status, estimated_value, next_action, next_action_date, updated_at'
      ),

    supabase.from('clients').select('monthly_fee').eq('status', 'active'),

    supabase
      .from('projects')
      .select(
        `
        id, name, status, estimated_hours,
        clients(company_name),
        tasks(time_spent),
        time_entries(hours, task_id)
      `
      ),

    supabase
      .from('tasks')
      .select(
        `
        id, title, due_date, status, workflow_stage, priority, updated_at,
        team_users!assigned_to(full_name),
        projects(name)
      `
      )
      .neq('status', 'closed'),

    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'closed')
      .gte('updated_at', periodStartIso)
      .lte('updated_at', periodEndIso),

    supabase
      .from('time_entries')
      .select('date, hours, is_billable, team_user_id, team_users(full_name, hourly_rate)')
      .gte('date', range.start)
      .lte('date', range.end),

    supabase
      .from('time_entries')
      .select('hours, team_users(hourly_rate)')
      .eq('is_billable', true)
      .eq('is_invoiced', false),

    supabase
      .from('invoices')
      .select('id, invoice_number, total, due_date, clients(company_name)')
      .in('status', ['sent', 'overdue'])
      .lt('due_date', today)
      .order('due_date', { ascending: true })
      .limit(5),

    supabase
      .from('invoices')
      .select('total')
      .eq('status', 'paid')
      .gte('paid_at', range.start)
      .lte('paid_at', range.end),

    supabase
      .from('activity_log')
      .select('id, description, created_at, team_users(full_name)')
      .order('created_at', { ascending: false })
      .limit(20),

    supabase
      .from('agency_subscriptions')
      .select('id, name, plan_name, billing_cycle, cost, renewal_date, url')
      .eq('status', 'active')
      .not('renewal_date', 'is', null)
      .lte('renewal_date', new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0])
      .gte('renewal_date', today)
      .order('renewal_date', { ascending: true }),
  ])

  const leads = leadsRes.data ?? []
  const projects = projectsRes.data ?? []
  const openTasks = openTasksRes.data ?? []
  const timeInPeriod = timeInPeriodRes.data ?? []
  const uninvoicedTime = uninvoicedTimeRes.data ?? []
  const overdueInvoices = overdueInvoicesRes.data ?? []
  const paidInvoices = paidInvoicesRes.data ?? []

  // --- Snapshot KPIs ---
  const activeLeads = leads.filter((l) => !['won', 'lost'].includes(l.status))
  const pipelineValue = activeLeads.reduce(
    (sum, l) => sum + (Number(l.estimated_value) || 0),
    0
  )
  const mrrTotal = (clientsRes.data ?? []).reduce(
    (sum, c) => sum + (Number(c.monthly_fee) || 0),
    0
  )
  const activeProjects = projects.filter((p) => p.status === 'active').length
  const onHoldProjects = projects.filter((p) => p.status === 'on_hold').length
  const openTasksCount = openTasks.length
  const overdueTasksCount = openTasks.filter(
    (t) => t.due_date && t.due_date < today
  ).length

  const billableWipValue = uninvoicedTime.reduce((sum, entry) => {
    const rate = Number(
      (entry.team_users as { hourly_rate?: number } | null)?.hourly_rate ?? 0
    )
    return sum + Number(entry.hours) * rate
  }, 0)

  // --- Period KPIs ---
  const hoursLogged = timeInPeriod.reduce(
    (sum, e) => sum + Number(e.hours),
    0
  )
  const billableHoursLogged = timeInPeriod
    .filter((e) => e.is_billable)
    .reduce((sum, e) => sum + Number(e.hours), 0)
  const tasksClosed = closedTasksRes.count ?? 0

  const leadsWon = leads.filter(
    (l) =>
      l.status === 'won' &&
      l.updated_at >= periodStartIso &&
      l.updated_at <= periodEndIso
  ).length
  const leadsLost = leads.filter(
    (l) =>
      l.status === 'lost' &&
      l.updated_at >= periodStartIso &&
      l.updated_at <= periodEndIso
  ).length

  const paidThisPeriod = paidInvoices.reduce(
    (sum, inv) => sum + Number(inv.total ?? 0),
    0
  )

  // --- Hours by date (chart) ---
  const bucketTotals = new Map<string, { hours: number; billableHours: number }>()
  for (const bucket of buildDateBuckets(range)) {
    bucketTotals.set(bucket.key, { hours: 0, billableHours: 0 })
  }
  for (const entry of timeInPeriod) {
    const key = bucketKeyForDate(entry.date, range)
    const current = bucketTotals.get(key) ?? { hours: 0, billableHours: 0 }
    const hrs = Number(entry.hours)
    current.hours += hrs
    if (entry.is_billable) current.billableHours += hrs
    bucketTotals.set(key, current)
  }
  const hoursByDate = buildDateBuckets(range).map((bucket) => {
    const totals = bucketTotals.get(bucket.key) ?? { hours: 0, billableHours: 0 }
    return {
      date: bucket.key,
      label: bucket.label,
      hours: parseFloat(totals.hours.toFixed(1)),
      billableHours: parseFloat(totals.billableHours.toFixed(1)),
    }
  })

  // --- Leads by status (chart) ---
  const leadsByStatus = PIPELINE_LEAD_STATUSES.map((status) => ({
    key: status,
    label: LEAD_STATUS_LABELS[status as LeadStatus],
    value: leads.filter((l) => l.status === status).length,
  }))

  // --- Tasks by workflow stage (chart) ---
  const workflowCounts = new Map<WorkflowStage, number>()
  for (const stage of WORKFLOW_STAGE_ORDER) {
    workflowCounts.set(stage, 0)
  }
  for (const task of openTasks) {
    const stage = (task.workflow_stage ?? 'pm') as WorkflowStage
    workflowCounts.set(stage, (workflowCounts.get(stage) ?? 0) + 1)
  }
  const tasksByWorkflowStage = WORKFLOW_STAGE_ORDER.map((stage) => ({
    key: stage,
    label: WORKFLOW_STAGE_CONFIG[stage].label,
    value: workflowCounts.get(stage) ?? 0,
  }))

  // --- Hours by team member (chart) ---
  const memberHours = new Map<string, { name: string; hours: number }>()
  for (const entry of timeInPeriod) {
    const userId = entry.team_user_id as string
    const name =
      (entry.team_users as { full_name?: string } | null)?.full_name ?? 'Unknown'
    const existing = memberHours.get(userId) ?? { name, hours: 0 }
    existing.hours += Number(entry.hours)
    memberHours.set(userId, existing)
  }
  const hoursByMember = [...memberHours.values()]
    .sort((a, b) => b.hours - a.hours)
    .map((m) => ({
      label: m.name,
      value: parseFloat(m.hours.toFixed(1)),
    }))

  // --- Overdue tasks panel ---
  const overdueTaskItems = openTasks
    .filter((t) => t.due_date && t.due_date < today)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
    .slice(0, 5)
    .map((t) => ({
      id: t.id as string,
      title: t.title as string,
      dueDate: t.due_date as string,
      projectName:
        (t.projects as { name?: string } | null)?.name ?? '—',
      assigneeName:
        (t.team_users as { full_name?: string } | null)?.full_name ?? null,
    }))

  // --- Follow-ups panel ---
  const followUpItems = leads
    .filter(
      (l) =>
        !['won', 'lost'].includes(l.status) &&
        l.next_action_date &&
        l.next_action_date <= today
    )
    .sort((a, b) =>
      (a.next_action_date! < b.next_action_date! ? -1 : 1)
    )
    .slice(0, 5)
    .map((l) => ({
      id: l.id as string,
      companyName: (l.company_name as string) || (l.contact_name as string),
      contactName: l.contact_name as string,
      nextAction: l.next_action as string | null,
      nextActionDate: l.next_action_date as string,
    }))

  // --- Project health panel ---
  const projectHealthItems = projects
    .map((p) => {
      const taskHours = (p.tasks as { time_spent: number }[] ?? []).reduce(
        (sum, t) => sum + (Number(t.time_spent) || 0),
        0
      )
      const orphanHours = (
        p.time_entries as { hours: number; task_id: string | null }[] ?? []
      )
        .filter((e) => !e.task_id)
        .reduce((sum, e) => sum + (Number(e.hours) || 0), 0)
      const loggedHours = parseFloat((taskHours + orphanHours).toFixed(1))
      const estimatedHours = p.estimated_hours ? Number(p.estimated_hours) : 0
      return {
        id: p.id as string,
        name: p.name as string,
        clientName:
          (p.clients as { company_name?: string } | null)?.company_name ?? '—',
        estimatedHours,
        loggedHours,
        overByHours: parseFloat(Math.max(0, loggedHours - estimatedHours).toFixed(1)),
      }
    })
    .filter((p) => p.estimatedHours > 0 && p.loggedHours > p.estimatedHours)
    .sort((a, b) => b.overByHours - a.overByHours)
    .slice(0, 5)

  const overdueInvoiceValue = overdueInvoices.reduce(
    (sum, i) => sum + Number(i.total ?? 0),
    0
  )

  return {
    period,
    periodLabel: range.label,

    pipelineValue,
    mrrTotal,
    activeProjects,
    onHoldProjects,
    openTasks: openTasksCount,
    overdueTasks: overdueTasksCount,
    billableWipValue,

    hoursLogged: parseFloat(hoursLogged.toFixed(1)),
    billableHoursLogged: parseFloat(billableHoursLogged.toFixed(1)),
    tasksClosed,
    leadsWon,
    leadsLost,
    paidThisPeriod,

    hoursByDate,
    leadsByStatus,
    tasksByWorkflowStage,
    hoursByMember,

    overdueTaskItems,
    followUpItems,
    projectHealthItems,
    overdueInvoices: overdueInvoices.map((inv) => ({
      id: inv.id as string,
      invoiceNumber: inv.invoice_number as string,
      clientName:
        (inv.clients as { company_name?: string } | null)?.company_name ?? '—',
      dueDate: inv.due_date as string,
      total: Number(inv.total),
    })),
    overdueInvoiceCount: overdueInvoices.length,
    overdueInvoiceValue,

    renewingSoon: (renewalsRes.data ?? []).map((sub) => ({
      id: sub.id as string,
      name: sub.name as string,
      planName: (sub.plan_name as string) || null,
      billingCycle: sub.billing_cycle as string,
      cost: Number(sub.cost),
      renewalDate: sub.renewal_date as string,
    })),

    activityFeed: (activityRes.data ?? []).map((entry) => ({
      id: entry.id as string,
      description: entry.description as string,
      performerName:
        (entry.team_users as { full_name?: string } | null)?.full_name ??
        'System',
      createdAt: entry.created_at as string,
    })),
  }
}

export type { DashboardPeriod }
