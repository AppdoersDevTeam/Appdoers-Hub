import { createClient } from '@/lib/supabase/server'
import type {
  BillingCycleSplit,
  CategorySpend,
  FinanceAnalytics,
  TopToolByCost,
} from './types'

interface SubscriptionRow {
  id: string
  name: string
  category: string
  billing_cycle: string
  cost: number
  status: string
}

function toMonthly(cost: number, billingCycle: string): number {
  return billingCycle === 'monthly' ? cost : cost / 12
}

function toYearly(cost: number, billingCycle: string): number {
  return billingCycle === 'yearly' ? cost : cost * 12
}

function safeDivide(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  return numerator / denominator
}

export async function getFinanceAnalytics(): Promise<FinanceAnalytics> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const monthStart = `${today.slice(0, 7)}-01`

  const [subsRes, clientsRes, outstandingRes, overdueRes, paidThisMonthRes] =
    await Promise.all([
      supabase
        .from('agency_subscriptions')
        .select('id, name, category, billing_cycle, cost, status'),

      supabase
        .from('clients')
        .select('monthly_fee, status')
        .eq('status', 'active'),

      supabase
        .from('invoices')
        .select('total')
        .in('status', ['sent', 'overdue']),

      supabase
        .from('invoices')
        .select('total')
        .in('status', ['sent', 'overdue'])
        .lt('due_date', today),

      supabase
        .from('invoices')
        .select('total')
        .eq('status', 'paid')
        .gte('paid_at', monthStart)
        .lte('paid_at', `${today}T23:59:59.999Z`),
    ])

  const allSubs = (subsRes.data ?? []) as SubscriptionRow[]
  const activeSubs = allSubs.filter((s) => s.status === 'active')

  const monthlySpend = activeSubs.reduce(
    (sum, s) => sum + toMonthly(Number(s.cost), s.billing_cycle),
    0
  )
  const yearlyProjected = activeSubs.reduce(
    (sum, s) => sum + toYearly(Number(s.cost), s.billing_cycle),
    0
  )

  const categoryMap = new Map<string, { monthly: number; yearly: number; toolCount: number }>()
  for (const sub of activeSubs) {
    const category = sub.category || 'Other'
    const current = categoryMap.get(category) ?? { monthly: 0, yearly: 0, toolCount: 0 }
    current.monthly += toMonthly(Number(sub.cost), sub.billing_cycle)
    current.yearly += toYearly(Number(sub.cost), sub.billing_cycle)
    current.toolCount += 1
    categoryMap.set(category, current)
  }

  const spendByCategory: CategorySpend[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      monthly: data.monthly,
      yearly: data.yearly,
      toolCount: data.toolCount,
      percentOfSpend:
        monthlySpend > 0 ? (data.monthly / monthlySpend) * 100 : 0,
    }))
    .sort((a, b) => b.monthly - a.monthly)

  const topToolsByCost: TopToolByCost[] = activeSubs
    .map((sub) => {
      const monthly = toMonthly(Number(sub.cost), sub.billing_cycle)
      return {
        id: sub.id,
        name: sub.name,
        category: sub.category || 'Other',
        monthly,
        percentOfSpend: monthlySpend > 0 ? (monthly / monthlySpend) * 100 : 0,
      }
    })
    .sort((a, b) => b.monthly - a.monthly)
    .slice(0, 8)

  const billingCycleSplit: BillingCycleSplit[] = (['monthly', 'yearly'] as const).map(
    (cycle) => {
      const matching = activeSubs.filter((s) => s.billing_cycle === cycle)
      return {
        cycle,
        count: matching.length,
        monthlySpend: matching.reduce(
          (sum, s) => sum + toMonthly(Number(s.cost), s.billing_cycle),
          0
        ),
      }
    }
  )

  const activeClients = clientsRes.data ?? []
  const payingClients = activeClients.filter((c) => Number(c.monthly_fee) > 0)
  const mrr = activeClients.reduce(
    (sum, c) => sum + (Number(c.monthly_fee) || 0),
    0
  )
  const payingClientCount = payingClients.length
  const avgRevenuePerPayingClient = safeDivide(mrr, payingClientCount)

  const costPerPayingClient = safeDivide(monthlySpend, payingClientCount)
  const marginPerPayingClient =
    avgRevenuePerPayingClient !== null && costPerPayingClient !== null
      ? avgRevenuePerPayingClient - costPerPayingClient
      : null
  const grossMarginPercent =
    mrr > 0 ? ((mrr - monthlySpend) / mrr) * 100 : null
  const toolCostAsPercentOfRevenue =
    mrr > 0 ? (monthlySpend / mrr) * 100 : null

  const outstandingInvoices = outstandingRes.data ?? []
  const overdueInvoices = overdueRes.data ?? []
  const paidThisMonthInvoices = paidThisMonthRes.data ?? []

  return {
    monthlySpend,
    yearlyProjected,
    activeToolCount: activeSubs.length,
    spendByCategory,
    topToolsByCost,
    billingCycleSplit,
    mrr,
    payingClientCount,
    avgRevenuePerPayingClient,
    costPerPayingClient,
    marginPerPayingClient,
    grossMarginPercent,
    toolCostAsPercentOfRevenue,
    outstandingTotal: outstandingInvoices.reduce(
      (sum, inv) => sum + Number(inv.total ?? 0),
      0
    ),
    overdueTotal: overdueInvoices.reduce(
      (sum, inv) => sum + Number(inv.total ?? 0),
      0
    ),
    overdueCount: overdueInvoices.length,
    paidThisMonth: paidThisMonthInvoices.reduce(
      (sum, inv) => sum + Number(inv.total ?? 0),
      0
    ),
  }
}
