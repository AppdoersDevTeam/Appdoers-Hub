import { createClient } from '@/lib/supabase/server'
import { aggregateClientMrr } from '@/lib/analytics/mrr'
import {
  subscriptionCostToMonthly,
  subscriptionCostToYearly,
} from '@/lib/subscriptions/billing'
import type { CategorySpend, FinanceAnalytics, TopToolByCost } from './types'

interface SubscriptionRow {
  id: string
  name: string
  category: string
  billing_cycle: string
  cost: number
  status: string
  client_id: string | null
  client_name: string | null
}

function safeDivide(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  return numerator / denominator
}

function nestedClientName(
  nested: { company_name?: string } | { company_name?: string }[] | null
): string | null {
  const client = Array.isArray(nested) ? nested[0] : nested
  return client?.company_name ?? null
}

function sumMonthly(subs: SubscriptionRow[]): number {
  return subs.reduce(
    (sum, s) => sum + subscriptionCostToMonthly(Number(s.cost), s.billing_cycle),
    0
  )
}

function sumYearly(subs: SubscriptionRow[]): number {
  return subs.reduce(
    (sum, s) => sum + subscriptionCostToYearly(Number(s.cost), s.billing_cycle),
    0
  )
}

export async function getFinanceAnalytics(): Promise<FinanceAnalytics> {
  const supabase = await createClient()

  const [subsRes, clientsRes, addonsRes] = await Promise.all([
    supabase
      .from('agency_subscriptions')
      .select('id, name, category, billing_cycle, cost, status, client_id, clients(company_name)'),

    supabase
      .from('clients')
      .select('id, monthly_fee, billing_cycle, status')
      .eq('status', 'active'),

    supabase.from('client_services').select('client_id, monthly_fee'),
  ])

  const allSubs: SubscriptionRow[] = (subsRes.data ?? []).map((row) => {
    const client_id = (row.client_id as string | null) ?? null
    return {
      id: row.id as string,
      name: row.name as string,
      category: row.category as string,
      billing_cycle: row.billing_cycle as string,
      cost: Number(row.cost),
      status: row.status as string,
      client_id,
      client_name: nestedClientName(
        row.clients as { company_name?: string } | { company_name?: string }[] | null
      ),
    }
  })
  const activeSubs = allSubs.filter((s) => s.status === 'active')
  const companySubs = activeSubs.filter((s) => !s.client_id)
  const clientSubs = activeSubs.filter((s) => Boolean(s.client_id))

  const monthlySpend = sumMonthly(activeSubs)
  const yearlyProjected = sumYearly(activeSubs)
  const companyMonthlySpend = sumMonthly(companySubs)
  const clientMonthlySpend = sumMonthly(clientSubs)
  const companyYearlySpend = sumYearly(companySubs)
  const clientYearlySpend = sumYearly(clientSubs)

  const categoryMap = new Map<string, { monthly: number; yearly: number; toolCount: number }>()
  for (const sub of activeSubs) {
    const category = sub.category || 'Other'
    const current = categoryMap.get(category) ?? { monthly: 0, yearly: 0, toolCount: 0 }
    current.monthly += subscriptionCostToMonthly(Number(sub.cost), sub.billing_cycle)
    current.yearly += subscriptionCostToYearly(Number(sub.cost), sub.billing_cycle)
    current.toolCount += 1
    categoryMap.set(category, current)
  }

  const spendByCategory: CategorySpend[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      monthly: data.monthly,
      yearly: data.yearly,
      toolCount: data.toolCount,
      percentOfSpend: monthlySpend > 0 ? (data.monthly / monthlySpend) * 100 : 0,
    }))
    .sort((a, b) => b.monthly - a.monthly)

  const topToolsByCost: TopToolByCost[] = activeSubs
    .map((sub) => {
      const monthly = subscriptionCostToMonthly(Number(sub.cost), sub.billing_cycle)
      return {
        id: sub.id,
        name: sub.name,
        category: sub.category || 'Other',
        assignedTo: sub.client_name ?? 'Company-wide',
        monthly,
        percentOfSpend: monthlySpend > 0 ? (monthly / monthlySpend) * 100 : 0,
      }
    })
    .sort((a, b) => b.monthly - a.monthly)
    .slice(0, 8)

  const activeClients = (clientsRes.data ?? []).map((c) => ({
    id: c.id as string,
    monthly_fee: Number(c.monthly_fee),
    billing_cycle: (c.billing_cycle as string | null) ?? null,
  }))
  const addons = (addonsRes.data ?? []).map((row) => ({
    client_id: row.client_id as string,
    monthly_fee: Number(row.monthly_fee),
  }))
  const { mrr, payingClientCount } = aggregateClientMrr(activeClients, addons)
  const projectedArr = mrr * 12
  const avgMrrPerPayingClient = safeDivide(mrr, payingClientCount)
  const runRateAfterCompanyTools = mrr - companyMonthlySpend
  const toolMarginPercent =
    mrr > 0 ? ((mrr - companyMonthlySpend) / mrr) * 100 : null

  return {
    monthlySpend,
    yearlyProjected,
    activeToolCount: activeSubs.length,
    companyMonthlySpend,
    clientMonthlySpend,
    companyYearlySpend,
    clientYearlySpend,
    companyToolCount: companySubs.length,
    clientToolCount: clientSubs.length,
    spendByCategory,
    topToolsByCost,
    mrr,
    projectedArr,
    payingClientCount,
    avgMrrPerPayingClient,
    runRateAfterCompanyTools,
    toolMarginPercent,
  }
}
