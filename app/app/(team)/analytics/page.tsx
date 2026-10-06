import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Users,
  Percent,
  CreditCard,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { KpiSection, type KpiCardData } from '@/components/team/dashboard/kpi-grid'
import { SpendByCategoryChart } from '@/components/team/analytics/spend-by-category-chart'
import { RevenueVsCostChart } from '@/components/team/analytics/revenue-vs-cost-chart'
import { TopToolsTable } from '@/components/team/analytics/top-tools-table'
import { PartnershipProfitCard } from '@/components/team/analytics/partnership-profit-card'
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

function runRateTone(amount: number): Pick<KpiCardData, 'icon' | 'color' | 'bg' | 'highlight'> {
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

  const { partnership } = metrics
  const partnershipKpis: KpiCardData[] = [
    {
      label: 'Shared Clients',
      value: formatCurrency(partnership.monthlyRevenue),
      sub: `${partnership.clients.length} client${partnership.clients.length !== 1 ? 's' : ''} · plan + add-ons per month`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Shared Expenses',
      value: formatCurrency(partnership.monthlyExpenses),
      sub: `${partnership.subscriptions.length} subscription${partnership.subscriptions.length !== 1 ? 's' : ''} per month`,
      icon: TrendingDown,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'Profit / Month',
      value: formatCurrency(partnership.monthlyProfit),
      sub: 'Clients − expenses',
      ...runRateTone(partnership.monthlyProfit),
    },
    {
      label: 'Each (50%) / Month',
      value: formatCurrency(partnership.monthlyShare),
      sub: `Sara & Fabiano · ${formatCurrency(partnership.yearlyShare)} each this year`,
      icon: Users,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
  ]

  const revenueKpis: KpiCardData[] = [
    {
      label: 'Recurring MRR',
      value: formatCurrency(metrics.mrr),
      sub: 'Plan + add-on fees, cycle-normalized',
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Projected ARR',
      value: formatCurrency(metrics.projectedArr),
      sub: 'MRR × 12 (run-rate, not invoiced)',
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Paying Clients',
      value: String(metrics.payingClientCount),
      sub: 'Active clients with MRR > $0',
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Avg MRR / Client',
      value: formatNullableCurrency(metrics.avgMrrPerPayingClient),
      sub: 'Recurring MRR ÷ paying clients',
      icon: DollarSign,
      color: 'text-slate-600',
      bg: 'bg-slate-100',
    },
  ]

  const costKpis: KpiCardData[] = [
    {
      label: 'Company-wide Spend',
      value: formatCurrency(metrics.companyMonthlySpend),
      sub: `${metrics.companyToolCount} shared tool${metrics.companyToolCount !== 1 ? 's' : ''} · ${formatCurrency(metrics.companyYearlySpend)}/yr projected`,
      icon: TrendingDown,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'Client-assigned Spend',
      value: formatCurrency(metrics.clientMonthlySpend),
      sub: `${metrics.clientToolCount} pass-through tool${metrics.clientToolCount !== 1 ? 's' : ''} · ${formatCurrency(metrics.clientYearlySpend)}/yr projected`,
      icon: CreditCard,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'After Company Tools',
      value: formatCurrency(metrics.runRateAfterCompanyTools),
      sub: 'MRR minus company-wide tool spend',
      ...runRateTone(metrics.runRateAfterCompanyTools),
    },
    {
      label: 'Tool Margin',
      value: formatPercent(metrics.toolMarginPercent),
      sub: 'Run-rate after company tools ÷ MRR',
      icon: Percent,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        subtitle="Recurring run-rate, tool spend, and company overhead — not invoiced P&L"
      />

      <div className="space-y-3">
        <KpiSection
          title="Sara & Fabiano"
          description="Shared clients minus shared subscriptions, split 50/50. Fabiano-only items are excluded."
          cards={partnershipKpis}
        />
        <PartnershipProfitCard data={partnership} />
      </div>

      <div className="space-y-6">
        <KpiSection
          title="Recurring revenue"
          description="Active client plan fees plus add-ons, normalized to monthly"
          cards={revenueKpis}
        />
        <KpiSection
          title="Tool costs"
          description="Company overhead vs client pass-through tools. Labour, GST, and invoices are not included."
          cards={costKpis}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <SpendByCategoryChart data={metrics.spendByCategory} />
        <RevenueVsCostChart
          mrr={metrics.mrr}
          companyMonthlySpend={metrics.companyMonthlySpend}
          clientMonthlySpend={metrics.clientMonthlySpend}
          runRateAfterCompanyTools={metrics.runRateAfterCompanyTools}
        />
      </div>

      <TopToolsTable data={metrics.topToolsByCost} />

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
