import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Users,
  UserCheck,
  Percent,
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

function profitTone(amount: number): Pick<KpiCardData, 'icon' | 'color' | 'bg' | 'highlight'> {
  const positive = amount >= 0
  return {
    icon: positive ? TrendingUp : TrendingDown,
    color: positive ? 'text-emerald-600' : 'text-red-600',
    bg: positive ? 'bg-emerald-50' : 'bg-red-50',
    highlight: !positive,
  }
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

  const profitKpis: KpiCardData[] = [
    {
      label: 'Monthly Profit',
      value: formatCurrency(metrics.monthlyProfit),
      sub: 'MRR minus company-wide tool spend',
      ...profitTone(metrics.monthlyProfit),
    },
    {
      label: 'Yearly Profit',
      value: formatCurrency(metrics.yearlyProfit),
      sub: 'Yearly revenue minus company-wide yearly spend',
      ...profitTone(metrics.yearlyProfit),
    },
    {
      label: 'Yearly Revenue',
      value: formatCurrency(metrics.yearlyRevenue),
      sub: 'MRR × 12 (projected)',
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Gross Margin',
      value: formatPercent(metrics.grossMarginPercent),
      sub:
        metrics.toolCostAsPercentOfRevenue !== null
          ? `Company tools are ${metrics.toolCostAsPercentOfRevenue.toFixed(1)}% of revenue`
          : 'Revenue vs company-wide tool spend',
      icon: Percent,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
  ]

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
      label: 'Company-wide Spend',
      value: formatCurrency(metrics.companyMonthlySpend),
      sub: `${metrics.companyToolCount} shared tool${metrics.companyToolCount !== 1 ? 's' : ''} · ${formatCurrency(metrics.companyYearlySpend)}/yr`,
      icon: TrendingDown,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'Client-assigned Spend',
      value: formatCurrency(metrics.clientMonthlySpend),
      sub: `${metrics.clientToolCount} client tool${metrics.clientToolCount !== 1 ? 's' : ''} · ${formatCurrency(metrics.clientYearlySpend)}/yr`,
      icon: CreditCard,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Paying Clients',
      value: String(metrics.payingClientCount),
      sub: 'Active with a recurring fee > $0',
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
  ]

  const unitEconomicsKpis: KpiCardData[] = [
    {
      label: 'Cost per Paying Client',
      value: formatNullableCurrency(metrics.costPerPayingClient),
      sub: 'Company-wide tool spend ÷ paying clients',
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
      label: 'Avg Revenue / Client',
      value: formatNullableCurrency(metrics.avgRevenuePerPayingClient),
      sub: 'MRR ÷ paying clients',
      icon: DollarSign,
      color: 'text-slate-600',
      bg: 'bg-slate-100',
    },
    {
      label: 'Tool Cost of Revenue',
      value: formatPercent(metrics.toolCostAsPercentOfRevenue),
      sub: 'Company-wide tool spend ÷ MRR',
      icon: Percent,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        subtitle="Profit, revenue, costs, and unit economics"
      />

      <div className="space-y-6">
        <KpiSection
          title="Profit"
          description="Monthly and yearly profit after company-wide tool spend"
          cards={profitKpis}
        />
        <KpiSection
          title="Revenue & costs"
          description="MRR plus company-wide vs client-assigned tool spend"
          cards={revenueCostKpis}
        />
        <KpiSection
          title="Unit economics"
          description="Per-client costs using company-wide overhead only"
          cards={unitEconomicsKpis}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SpendByCategoryChart data={metrics.spendByCategory} />
        <RevenueVsCostChart
          mrr={metrics.mrr}
          yearlyRevenue={metrics.yearlyRevenue}
          monthlySpend={metrics.companyMonthlySpend}
          yearlySpend={metrics.companyYearlySpend}
          clientMonthlySpend={metrics.clientMonthlySpend}
          clientYearlySpend={metrics.clientYearlySpend}
          monthlyProfit={metrics.monthlyProfit}
          yearlyProfit={metrics.yearlyProfit}
        />
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
