import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  DollarSign,
  TrendingDown,
  Calendar,
  Users,
  UserCheck,
  Percent,
  Receipt,
  CreditCard,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { KpiSection, type KpiCardData } from '@/components/team/dashboard/kpi-grid'
import { SpendByCategoryChart } from '@/components/team/analytics/spend-by-category-chart'
import { RevenueVsCostChart } from '@/components/team/analytics/revenue-vs-cost-chart'
import { CategoryBreakdownTable } from '@/components/team/analytics/category-breakdown-table'
import { TopToolsTable } from '@/components/team/analytics/top-tools-table'
import { getFinanceAnalytics } from '@/lib/analytics/finance'
import { createClient } from '@/lib/supabase/server'
import { getEffectivePermissions, can } from '@/lib/permissions'
import { formatCurrency } from '@/lib/utils/format'

function formatNullableCurrency(value: number | null): string {
  return value === null ? '—' : formatCurrency(value)
}

function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)}%`
}

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/app/login')

  const { data: teamUser } = await supabase
    .from('team_users')
    .select('role, permissions')
    .eq('id', user.id)
    .single()

  const effective = getEffectivePermissions(
    teamUser?.role ?? 'member',
    (teamUser?.permissions ?? {}) as Record<string, string>
  )

  if (!can(effective, 'analytics', 'view')) {
    redirect('/app/dashboard')
  }

  const metrics = await getFinanceAnalytics()

  const revenueCostKpis: KpiCardData[] = [
    {
      label: 'Monthly Revenue',
      value: formatCurrency(metrics.mrr),
      sub: 'MRR across active clients',
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Monthly Tool Spend',
      value: formatCurrency(metrics.monthlySpend),
      sub: `${metrics.activeToolCount} active tool${metrics.activeToolCount !== 1 ? 's' : ''}`,
      icon: TrendingDown,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'Projected Yearly Spend',
      value: formatCurrency(metrics.yearlyProjected),
      sub: 'Based on active subscriptions',
      icon: Calendar,
      color: 'text-slate-600',
      bg: 'bg-slate-100',
    },
    {
      label: 'Paying Clients',
      value: String(metrics.payingClientCount),
      sub: 'Active with monthly fee > $0',
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
  ]

  const unitEconomicsKpis: KpiCardData[] = [
    {
      label: 'Cost per Paying Client',
      value: formatNullableCurrency(metrics.costPerPayingClient),
      sub: 'Tool spend ÷ paying clients',
      icon: UserCheck,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Margin per Paying Client',
      value: formatNullableCurrency(metrics.marginPerPayingClient),
      sub: 'Avg revenue − cost per client',
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Gross Margin',
      value: formatPercent(metrics.grossMarginPercent),
      sub:
        metrics.toolCostAsPercentOfRevenue !== null
          ? `Tools are ${metrics.toolCostAsPercentOfRevenue.toFixed(1)}% of revenue`
          : undefined,
      icon: Percent,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Outstanding Invoices',
      value: formatCurrency(metrics.outstandingTotal),
      sub:
        metrics.overdueCount > 0
          ? `${metrics.overdueCount} overdue (${formatCurrency(metrics.overdueTotal)})`
          : 'Sent, awaiting payment',
      icon: Receipt,
      color: metrics.overdueCount > 0 ? 'text-red-600' : 'text-slate-500',
      bg: metrics.overdueCount > 0 ? 'bg-red-50' : 'bg-slate-100',
      highlight: metrics.overdueCount > 0,
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        subtitle="Revenue, costs, and unit economics"
      />

      <div className="space-y-6">
        <KpiSection
          title="Revenue & costs"
          description="MRR, tool spend, and paying client base"
          cards={revenueCostKpis}
        />
        <KpiSection
          title="Unit economics & invoices"
          description="Per-client costs, margins, and receivables"
          cards={unitEconomicsKpis}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SpendByCategoryChart data={metrics.spendByCategory} />
        <RevenueVsCostChart mrr={metrics.mrr} monthlySpend={metrics.monthlySpend} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryBreakdownTable data={metrics.spendByCategory} />
        <TopToolsTable data={metrics.topToolsByCost} />
      </div>

      <div className="flex justify-end">
        <Link
          href="/app/subscriptions"
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
        >
          <CreditCard className="h-4 w-4" />
          Manage subscriptions
        </Link>
      </div>
    </div>
  )
}
