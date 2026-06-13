import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { formatCurrency, formatDate, formatMonthDay, formatRelativeTime } from '@/lib/utils/format'
import Link from 'next/link'
import {
  TrendingUp,
  DollarSign,
  FolderOpen,
  CheckSquare,
  AlertCircle,
  CreditCard,
} from 'lucide-react'

async function getDashboardMetrics() {
  const supabase = await createClient()

  const [pipeline, mrr, projects, tasks, invoices, activity, renewals] =
    await Promise.all([
      // Pipeline value: sum of estimated_value for active leads
      supabase
        .from('leads')
        .select('estimated_value')
        .not('status', 'in', '("won","lost")'),

      // MRR: sum of monthly_fee for active clients
      supabase
        .from('clients')
        .select('monthly_fee')
        .eq('status', 'active'),

      // Active projects
      supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),

      // Open tasks
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'closed'),

      // Overdue invoices
      supabase
        .from('invoices')
        .select('id, invoice_number, total, due_date, clients(company_name)')
        .in('status', ['sent', 'overdue'])
        .lt('due_date', new Date().toISOString().split('T')[0])
        .order('due_date', { ascending: true })
        .limit(5),

      // Activity feed — last 20 entries with team user info
      supabase
        .from('activity_log')
        .select('*, team_users(full_name)')
        .order('created_at', { ascending: false })
        .limit(20),

      // Subscriptions renewing in next 30 days
      supabase
        .from('agency_subscriptions')
        .select('id, name, plan_name, billing_cycle, cost, renewal_date, url')
        .eq('status', 'active')
        .not('renewal_date', 'is', null)
        .lte('renewal_date', new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0])
        .gte('renewal_date', new Date().toISOString().split('T')[0])
        .order('renewal_date', { ascending: true }),
    ])

  const pipelineValue = (pipeline.data ?? []).reduce(
    (sum, l) => sum + (l.estimated_value ?? 0),
    0
  )
  const mrrTotal = (mrr.data ?? []).reduce(
    (sum, c) => sum + (c.monthly_fee ?? 0),
    0
  )
  const overdueInvoices = invoices.data ?? []
  const overdueCount = overdueInvoices.length
  const overdueValue = overdueInvoices.reduce((sum, i) => sum + Number(i.total ?? 0), 0)

  return {
    pipelineValue,
    mrrTotal,
    activeProjects: projects.count ?? 0,
    openTasks: tasks.count ?? 0,
    overdueCount,
    overdueValue,
    overdueInvoices,
    activityFeed: activity.data ?? [],
    renewingSoon: renewals.data ?? [],
  }
}

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics()

  const cards = [
    {
      label: 'Pipeline Value',
      value: formatCurrency(metrics.pipelineValue),
      sub: 'Active leads',
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Monthly Revenue',
      value: formatCurrency(metrics.mrrTotal),
      sub: 'MRR across active clients',
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Active Projects',
      value: String(metrics.activeProjects),
      sub: 'Currently in progress',
      icon: FolderOpen,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Open Tasks',
      value: String(metrics.openTasks),
      sub: 'Across all projects',
      icon: CheckSquare,
      color: 'text-slate-500',
      bg: 'bg-slate-100',
    },
    {
      label: 'Overdue Invoices',
      value: String(metrics.overdueCount),
      sub:
        metrics.overdueValue > 0
          ? `${formatCurrency(metrics.overdueValue)} outstanding`
          : 'None outstanding',
      icon: AlertCircle,
      color: metrics.overdueCount > 0 ? 'text-red-600' : 'text-slate-500',
      bg: metrics.overdueCount > 0 ? 'bg-red-50' : 'bg-slate-100',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Welcome to Appdoers Hub"
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="hub-card flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {card.label}
                </p>
                <div className={`rounded-md p-1.5 ${card.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-semibold text-slate-900">
                {card.value}
              </p>
              <p className="text-xs text-slate-500">{card.sub}</p>
            </div>
          )
        })}
      </div>

      {/* Overdue invoices quick panel */}
      {metrics.overdueCount > 0 && (
        <div className="hub-card border-l-4 border-l-red-500">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">
              ⚠️ Overdue Invoices ({metrics.overdueCount})
            </h2>
            <Link href="/app/invoices?status=overdue" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-200">
            {metrics.overdueInvoices.map((inv: Record<string, unknown>) => (
              <div key={inv.id as string} className="flex items-center justify-between py-2">
                <div>
                  <Link href={`/app/invoices/${inv.id as string}`} className="text-sm font-mono font-medium text-slate-900 hover:text-blue-600 transition-colors">
                    {inv.invoice_number as string}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {(inv.clients as { company_name?: string } | null)?.company_name ?? '—'} · Due {formatDate(inv.due_date as string)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-red-600">{formatCurrency(Number(inv.total))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscription Renewals */}
      {metrics.renewingSoon.length > 0 && (
        <div className="hub-card border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-amber-600" />
              Upcoming Renewals ({metrics.renewingSoon.length})
            </h2>
            <Link href="/app/subscriptions" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-200">
            {(metrics.renewingSoon as Record<string, unknown>[]).map((sub) => {
              const days = Math.ceil((new Date(sub.renewal_date as string).getTime() - Date.now()) / 86400000)
              const isUrgent = days <= 7
              const isWarning = days <= 14
              return (
                <div key={sub.id as string} className="flex items-center justify-between py-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{sub.name as string}</span>
                      {!!sub.plan_name && <span className="rounded px-1.5 py-0.5 text-xs bg-slate-100 text-slate-500">{sub.plan_name as string}</span>}
                    </div>
                    <p className={`text-xs mt-0.5 ${isUrgent ? 'text-red-600 font-semibold' : isWarning ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
                      {isUrgent ? '🔴' : isWarning ? '🟡' : '🟠'} Renews in {days} day{days !== 1 ? 's' : ''} · {formatMonthDay(sub.renewal_date as string)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-slate-900">
                      {new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(Number(sub.cost))}
                      <span className="text-xs font-normal text-slate-500">/{(sub.billing_cycle as string) === 'yearly' ? 'yr' : 'mo'}</span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div className="hub-card">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          Recent Activity
        </h2>

        {metrics.activityFeed.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No activity yet. Start by adding your first client or lead.
          </p>
        ) : (
          <div className="divide-y divide-slate-200">
            {metrics.activityFeed.map((entry: Record<string, unknown>) => (
              <div
                key={entry.id as string}
                className="flex items-start gap-3 py-3"
              >
                <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-600">
                    {entry.description as string}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {(entry.team_users as { full_name?: string } | null)
                      ?.full_name ?? 'System'}{' '}
                    ·{' '}
                    {formatRelativeTime(entry.created_at as string)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
