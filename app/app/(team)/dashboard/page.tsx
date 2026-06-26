import { Suspense } from 'react'
import Link from 'next/link'
import { CreditCard } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { getDashboardAnalytics } from '@/lib/dashboard/metrics'
import { PeriodToggle } from '@/components/team/dashboard/period-toggle'
import { KpiSection, type KpiCardData } from '@/components/team/dashboard/kpi-grid'
import { DashboardSection } from '@/components/team/dashboard/chart-card'
import { HoursTrendChart } from '@/components/team/dashboard/hours-trend-chart'
import { LeadFunnelChart } from '@/components/team/dashboard/lead-funnel-chart'
import { TaskWorkflowChart } from '@/components/team/dashboard/task-workflow-chart'
import { TeamHoursChart } from '@/components/team/dashboard/team-hours-chart'
import { OverdueTasksPanel } from '@/components/team/dashboard/overdue-tasks-panel'
import { FollowUpsPanel } from '@/components/team/dashboard/follow-ups-panel'
import { ProjectHealthPanel } from '@/components/team/dashboard/project-health-panel'
import { OverdueInvoicesPanel } from '@/components/team/dashboard/overdue-invoices-panel'
import {
  formatCurrency,
  formatMonthDay,
  formatRelativeTime,
} from '@/lib/utils/format'
import {
  TrendingUp,
  DollarSign,
  FolderOpen,
  CheckSquare,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Briefcase,
} from 'lucide-react'

function PeriodToggleFallback() {
  return (
    <div className="inline-flex h-8 w-[180px] animate-pulse rounded-lg border border-slate-200 bg-slate-50" />
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period: periodParam } = await searchParams
  const metrics = await getDashboardAnalytics(periodParam)

  const businessKpis: KpiCardData[] = [
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
      sub: 'MRR from active clients',
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Active Projects',
      value: String(metrics.activeProjects),
      sub:
        metrics.onHoldProjects > 0
          ? `${metrics.onHoldProjects} on hold`
          : 'In progress',
      icon: FolderOpen,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Billable WIP',
      value: formatCurrency(metrics.billableWipValue),
      sub: 'Uninvoiced billable time',
      icon: Briefcase,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ]

  const workKpis: KpiCardData[] = [
    {
      label: 'Open Tasks',
      value: String(metrics.openTasks),
      sub: 'Across all projects',
      icon: CheckSquare,
      color: 'text-slate-500',
      bg: 'bg-slate-100',
    },
    {
      label: 'Overdue Tasks',
      value: String(metrics.overdueTasks),
      sub: metrics.overdueTasks > 0 ? 'Need attention' : 'All on track',
      icon: AlertTriangle,
      color: metrics.overdueTasks > 0 ? 'text-red-600' : 'text-slate-500',
      bg: metrics.overdueTasks > 0 ? 'bg-red-50' : 'bg-slate-100',
      highlight: metrics.overdueTasks > 0,
    },
    {
      label: 'Hours Logged',
      value: `${metrics.hoursLogged}h`,
      sub: `${metrics.billableHoursLogged}h billable`,
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Tasks Closed',
      value: String(metrics.tasksClosed),
      sub: `${metrics.leadsWon} leads won · ${metrics.leadsLost} lost`,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Dashboard"
          subtitle="Welcome to Appdoers Hub"
        />
        <Suspense fallback={<PeriodToggleFallback />}>
          <PeriodToggle current={metrics.period} />
        </Suspense>
      </div>

      <div className="space-y-6">
        <KpiSection
          title="Business overview"
          description="Current snapshot across revenue and delivery"
          cards={businessKpis}
        />
        <KpiSection
          title={`Work this ${metrics.period === 'week' ? 'week' : metrics.period === 'quarter' ? 'quarter' : 'month'}`}
          description={metrics.periodLabel}
          cards={workKpis}
        />
      </div>

      <DashboardSection
        title="Trends & breakdown"
        description="How time, leads, and tasks are distributed"
      >
        <div className="space-y-4">
          <HoursTrendChart
            data={metrics.hoursByDate}
            periodLabel={metrics.periodLabel}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <LeadFunnelChart data={metrics.leadsByStatus} />
            <TaskWorkflowChart data={metrics.tasksByWorkflowStage} />
            <TeamHoursChart
              data={metrics.hoursByMember}
              periodLabel={metrics.periodLabel}
            />
          </div>
        </div>
      </DashboardSection>

      <DashboardSection title="Needs attention" description="Items that may need action soon">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <OverdueTasksPanel
          items={metrics.overdueTaskItems}
          totalCount={metrics.overdueTasks}
        />
        <FollowUpsPanel items={metrics.followUpItems} />
        <ProjectHealthPanel items={metrics.projectHealthItems} />
        <OverdueInvoicesPanel
          items={metrics.overdueInvoices}
          totalCount={metrics.overdueInvoiceCount}
        />
      </div>
      </DashboardSection>

      {metrics.renewingSoon.length > 0 && (
        <div className="hub-card border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-amber-600" />
              Upcoming Renewals ({metrics.renewingSoon.length})
            </h2>
            <Link href="/app/subscriptions" className="text-xs text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-slate-200">
            {metrics.renewingSoon.map((sub) => {
              const days = Math.ceil(
                (new Date(sub.renewalDate).getTime() - Date.now()) / 86400000
              )
              const isUrgent = days <= 7
              const isWarning = days <= 14
              return (
                <div key={sub.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        {sub.name}
                      </span>
                      {sub.planName && (
                        <span className="rounded px-1.5 py-0.5 text-xs bg-slate-100 text-slate-500">
                          {sub.planName}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs mt-0.5 ${isUrgent ? 'text-red-600 font-semibold' : isWarning ? 'text-amber-600 font-medium' : 'text-slate-500'}`}
                    >
                      Renews in {days} day{days !== 1 ? 's' : ''} ·{' '}
                      {formatMonthDay(sub.renewalDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-slate-900">
                      {new Intl.NumberFormat('en-NZ', {
                        style: 'currency',
                        currency: 'NZD',
                      }).format(sub.cost)}
                      <span className="text-xs font-normal text-slate-500">
                        /{sub.billingCycle === 'yearly' ? 'yr' : 'mo'}
                      </span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="hub-card">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Recent Activity</h2>
        {metrics.activityFeed.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No activity yet. Start by adding your first client or lead.
          </p>
        ) : (
          <div className="divide-y divide-slate-200">
            {metrics.activityFeed.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 py-3">
                <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-600">{entry.description}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {entry.performerName} · {formatRelativeTime(entry.createdAt)}
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
