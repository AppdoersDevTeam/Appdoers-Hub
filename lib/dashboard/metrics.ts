import { createClient } from '@/lib/supabase/server'
import { aggregateClientMrr } from '@/lib/analytics/mrr'
import {
  countActiveClientWebsites,
  isInternalClient,
} from '@/lib/clients/internal'
import { selectActiveClientsForStats } from '@/lib/clients/stats-query'
import type { LeadStatus, WorkflowStage } from '@/lib/types/database'
import { WORKFLOW_STAGE_CONFIG } from '@/lib/tasks/constants'
import {
  buildDateBuckets,
  bucketKeyForDate,
  addDaysYmd,
  getPeriodRange,
  nzYmd,
  parseDashboardPeriod,
  type DashboardPeriod,
} from './periods'
import {
  LEAD_STATUS_LABELS,
  PIPELINE_LEAD_STATUSES,
  WORKFLOW_STAGE_ORDER,
  type DashboardAnalytics,
} from './types'
import { roundHours } from '@/lib/utils/format'

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export async function getDashboardAnalytics(
  periodInput?: string
): Promise<DashboardAnalytics> {
  const period = parseDashboardPeriod(periodInput)
  const range = getPeriodRange(period)
  const today = nzYmd()

  const supabase = await createClient()

  const [
    leadsRes,
    clientsRes,
    addonsRes,
    projectsRes,
    openTasksRes,
    closedTasksRes,
    timeInPeriodRes,
    uninvoicedTimeRes,
    projectTimeRes,
    activityRes,
    renewalsRes,
  ] = await Promise.all([
    supabase
      .from('leads')
      .select(
        'id, contact_name, company_name, status, estimated_value, next_action, next_action_date, outcome_at'
      ),

    selectActiveClientsForStats(supabase),

    supabase.from('client_services').select('client_id, monthly_fee'),

    supabase
      .from('projects')
      .select(
        `
        id, name, status, estimated_hours,
        clients(company_name)
      `
      ),

    supabase
      .from('tasks')
      .select(
        `
        id, title, due_date, status, workflow_stage, priority,
        team_users!assigned_to(full_name),
        projects(name)
      `
      )
      .neq('status', 'closed'),

    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'closed')
      .gte('closed_at', range.startIso)
      .lte('closed_at', range.endIso),

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

    supabase.from('time_entries').select('project_id, hours'),

    supabase
      .from('activity_log')
      .select('id, description, created_at, team_users(full_name)')
      .order('created_at', { ascending: false })
      .limit(20),

    supabase
      .from('agency_subscriptions')
      .select('id, name, plan_name, billing_cycle, cost, renewal_date, url, clients(company_name)')
      .eq('status', 'active')
      .not('renewal_date', 'is', null)
      .lte('renewal_date', addDaysYmd(today, 30))
      .gte('renewal_date', today)
      .order('renewal_date', { ascending: true }),
  ])

  const leads = leadsRes.data ?? []
  const projects = projectsRes.data ?? []
  const openTasks = openTasksRes.data ?? []
  const timeInPeriod = timeInPeriodRes.data ?? []
  const uninvoicedTime = uninvoicedTimeRes.data ?? []
  const activeExternalClients = (clientsRes.data ?? []).filter(
    (c) =>
      !isInternalClient({
        is_internal: (c as { is_internal?: boolean | null }).is_internal ?? null,
        company_name: c.company_name as string | null,
      })
  )

  const activeLeads = leads.filter((l) => !['won', 'lost'].includes(l.status))
  const pipelineValue = activeLeads.reduce(
    (sum, l) => sum + (Number(l.estimated_value) || 0),
    0
  )
  const externalClientIds = new Set(activeExternalClients.map((c) => c.id as string))
  const { mrr: mrrTotal } = aggregateClientMrr(
    activeExternalClients.map((c) => ({
      id: c.id as string,
      monthly_fee: Number(c.monthly_fee),
      billing_cycle: (c.billing_cycle as string | null) ?? null,
    })),
    (addonsRes.data ?? [])
      .filter((row) => externalClientIds.has(row.client_id as string))
      .map((row) => ({
        client_id: row.client_id as string,
        monthly_fee: Number(row.monthly_fee),
      }))
  )
  const websiteCounts = countActiveClientWebsites(
    activeExternalClients.map((c) => {
      const catalog = Array.isArray(c.service_catalog)
        ? c.service_catalog[0]
        : (c.service_catalog as { plan_key?: string | null } | null)
      return {
        company_name: c.company_name as string | null,
        is_internal: (c as { is_internal?: boolean | null }).is_internal ?? null,
        status: (c.status as string | null) ?? 'active',
        subscription_plan: c.subscription_plan as string | null,
        catalog_plan_key: (catalog?.plan_key as string | null | undefined) ?? null,
      }
    })
  )
  const activeClientWebsites = websiteCounts.total
  const basicWebsiteCount = websiteCounts.basic
  const fullWebsiteCount = websiteCounts.full
  const openTasksCount = openTasks.length
  const overdueTasksCount = openTasks.filter(
    (t) => t.due_date && t.due_date < today
  ).length

  const billableWip = uninvoicedTime.reduce(
    (acc, entry) => {
      const hours = Number(entry.hours) || 0
      const user = one(
        entry.team_users as { hourly_rate?: number } | { hourly_rate?: number }[] | null
      )
      acc.hours += hours
      acc.value += hours * Number(user?.hourly_rate ?? 0)
      return acc
    },
    { hours: 0, value: 0 }
  )
  const billableWipHours = roundHours(billableWip.hours)
  const billableWipValueFinal = billableWip.value

  const hoursLogged = timeInPeriod.reduce((sum, e) => sum + Number(e.hours), 0)
  const billableHoursLogged = timeInPeriod
    .filter((e) => e.is_billable)
    .reduce((sum, e) => sum + Number(e.hours), 0)
  const tasksClosed = closedTasksRes.count ?? 0

  const leadsWon = leads.filter(
    (l) =>
      l.status === 'won' &&
      l.outcome_at &&
      l.outcome_at >= range.startIso &&
      l.outcome_at <= range.endIso
  ).length
  const leadsLost = leads.filter(
    (l) =>
      l.status === 'lost' &&
      l.outcome_at &&
      l.outcome_at >= range.startIso &&
      l.outcome_at <= range.endIso
  ).length

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
      hours: roundHours(totals.hours),
      billableHours: roundHours(totals.billableHours),
    }
  })

  const leadsByStatus = PIPELINE_LEAD_STATUSES.map((status) => ({
    key: status,
    label: LEAD_STATUS_LABELS[status as LeadStatus],
    value: leads.filter((l) => l.status === status).length,
  }))

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

  const memberHours = new Map<string, { name: string; hours: number }>()
  for (const entry of timeInPeriod) {
    const userId = entry.team_user_id as string
    const name =
      one(entry.team_users as { full_name?: string } | { full_name?: string }[] | null)
        ?.full_name ?? 'Unknown'
    const existing = memberHours.get(userId) ?? { name, hours: 0 }
    existing.hours += Number(entry.hours)
    memberHours.set(userId, existing)
  }
  const hoursByMember = [...memberHours.values()]
    .sort((a, b) => b.hours - a.hours)
    .map((m) => ({
      label: m.name,
      value: roundHours(m.hours),
    }))

  const overdueTaskItems = openTasks
    .filter((t) => t.due_date && t.due_date < today)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
    .slice(0, 5)
    .map((t) => ({
      id: t.id as string,
      title: t.title as string,
      dueDate: t.due_date as string,
      projectName:
        one(t.projects as { name?: string } | { name?: string }[] | null)?.name ?? '—',
      assigneeName:
        one(t.team_users as { full_name?: string } | { full_name?: string }[] | null)
          ?.full_name ?? null,
    }))

  const followUpItems = leads
    .filter(
      (l) =>
        !['won', 'lost'].includes(l.status) &&
        l.next_action_date &&
        l.next_action_date <= today
    )
    .sort((a, b) => (a.next_action_date! < b.next_action_date! ? -1 : 1))
    .slice(0, 5)
    .map((l) => ({
      id: l.id as string,
      companyName: (l.company_name as string) || (l.contact_name as string),
      contactName: l.contact_name as string,
      nextAction: l.next_action as string | null,
      nextActionDate: l.next_action_date as string,
    }))

  const hoursByProject = new Map<string, number>()
  for (const entry of projectTimeRes.data ?? []) {
    const projectId = entry.project_id as string | null
    if (!projectId) continue
    hoursByProject.set(
      projectId,
      (hoursByProject.get(projectId) ?? 0) + (Number(entry.hours) || 0)
    )
  }

  const projectHealthItems = projects
    .map((p) => {
      const loggedHours = roundHours(hoursByProject.get(p.id as string) ?? 0)
      const estimatedHours = p.estimated_hours ? Number(p.estimated_hours) : 0
      return {
        id: p.id as string,
        name: p.name as string,
        clientName:
          one(p.clients as { company_name?: string } | { company_name?: string }[] | null)
            ?.company_name ?? '—',
        estimatedHours,
        loggedHours,
        overByHours: roundHours(Math.max(0, loggedHours - estimatedHours)),
      }
    })
    .filter((p) => p.estimatedHours > 0 && p.loggedHours > p.estimatedHours)
    .sort((a, b) => b.overByHours - a.overByHours)
    .slice(0, 5)

  return {
    period,
    periodLabel: range.label,

    pipelineValue,
    mrrTotal,
    activeClientWebsites,
    basicWebsiteCount,
    fullWebsiteCount,
    openTasks: openTasksCount,
    overdueTasks: overdueTasksCount,
    billableWipValue: billableWipValueFinal,
    billableWipHours,

    hoursLogged: roundHours(hoursLogged),
    billableHoursLogged: roundHours(billableHoursLogged),
    tasksClosed,
    leadsWon,
    leadsLost,

    hoursByDate,
    leadsByStatus,
    tasksByWorkflowStage,
    hoursByMember,

    overdueTaskItems,
    followUpItems,
    projectHealthItems,

    renewingSoon: (renewalsRes.data ?? []).map((sub) => {
      const nested = sub.clients as { company_name?: string } | { company_name?: string }[] | null
      const client = Array.isArray(nested) ? nested[0] : nested
      return {
        id: sub.id as string,
        name: sub.name as string,
        planName: (sub.plan_name as string) || null,
        billingCycle: sub.billing_cycle as string,
        cost: Number(sub.cost),
        renewalDate: sub.renewal_date as string,
        assignedTo: client?.company_name ?? 'Company-wide',
      }
    }),

    activityFeed: (activityRes.data ?? []).map((entry) => ({
      id: entry.id as string,
      description: entry.description as string,
      performerName:
        one(entry.team_users as { full_name?: string } | { full_name?: string }[] | null)
          ?.full_name ?? 'System',
      createdAt: entry.created_at as string,
    })),
  }
}

export type { DashboardPeriod }
