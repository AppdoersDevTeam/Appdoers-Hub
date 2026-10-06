import { clientRunRateMrr } from '@/lib/clients/billing'
import {
  subscriptionCostToMonthly,
  subscriptionCostToYearly,
} from '@/lib/subscriptions/billing'

export interface PartnershipClientInput {
  id: string
  company_name: string
  monthly_fee: number
  billing_cycle: string | null
  setup_fee: number
  subscription_start_date: string | null
  is_partnership: boolean
}

export interface PartnershipAddonInput {
  client_id: string
  monthly_fee: number
}

export interface PartnershipSubInput {
  id: string
  name: string
  cost: number
  billing_cycle: string
  is_partnership: boolean
}

export interface PartnershipLine {
  id: string
  name: string
  monthly: number
}

export interface PartnershipClientLine extends PartnershipLine {
  setupFeeThisYear: number
}

export interface PartnershipProfit {
  year: number
  monthlyRevenue: number
  monthlyExpenses: number
  monthlyProfit: number
  monthlyShare: number
  recurringYearlyRevenue: number
  yearlyExpenses: number
  setupFeesThisYear: number
  yearlyProfit: number
  yearlyShare: number
  clients: PartnershipClientLine[]
  subscriptions: PartnershipLine[]
  excluded: {
    clients: PartnershipLine[]
    subscriptions: PartnershipLine[]
    monthlyRevenue: number
    monthlyExpenses: number
  }
}

function startYear(date: string | null): number | null {
  if (!date) return null
  const year = Number(date.slice(0, 4))
  return Number.isFinite(year) ? year : null
}

function byMonthlyDesc<T extends PartnershipLine>(a: T, b: T): number {
  return b.monthly - a.monthly
}

function sumMonthly(lines: PartnershipLine[]): number {
  return lines.reduce((sum, line) => sum + line.monthly, 0)
}

/**
 * Sara & Fabiano profit split. Expects active, non-internal clients and
 * active subscriptions only; `is_partnership` decides shared vs Fabiano-only.
 */
export function computePartnershipProfit(input: {
  clients: PartnershipClientInput[]
  addons: PartnershipAddonInput[]
  subscriptions: PartnershipSubInput[]
  now?: Date
}): PartnershipProfit {
  const year = (input.now ?? new Date()).getFullYear()

  const addonByClient = new Map<string, number>()
  for (const addon of input.addons) {
    addonByClient.set(
      addon.client_id,
      (addonByClient.get(addon.client_id) ?? 0) + (Number(addon.monthly_fee) || 0)
    )
  }

  const clients: PartnershipClientLine[] = []
  const excludedClients: PartnershipLine[] = []
  for (const client of input.clients) {
    const monthly = clientRunRateMrr(
      Number(client.monthly_fee),
      client.billing_cycle,
      addonByClient.get(client.id) ?? 0
    )
    if (client.is_partnership) {
      const setupFeeThisYear =
        startYear(client.subscription_start_date) === year ? Number(client.setup_fee) || 0 : 0
      if (monthly > 0 || setupFeeThisYear > 0) {
        clients.push({ id: client.id, name: client.company_name, monthly, setupFeeThisYear })
      }
    } else {
      excludedClients.push({ id: client.id, name: client.company_name, monthly })
    }
  }

  const subscriptions: PartnershipLine[] = []
  const excludedSubs: PartnershipLine[] = []
  let yearlyExpenses = 0
  for (const sub of input.subscriptions) {
    const cost = Number(sub.cost)
    const line = {
      id: sub.id,
      name: sub.name,
      monthly: subscriptionCostToMonthly(cost, sub.billing_cycle),
    }
    if (sub.is_partnership) {
      subscriptions.push(line)
      yearlyExpenses += subscriptionCostToYearly(cost, sub.billing_cycle)
    } else {
      excludedSubs.push(line)
    }
  }

  const monthlyRevenue = sumMonthly(clients)
  const monthlyExpenses = sumMonthly(subscriptions)
  const monthlyProfit = monthlyRevenue - monthlyExpenses
  const recurringYearlyRevenue = monthlyRevenue * 12
  const setupFeesThisYear = clients.reduce((sum, c) => sum + c.setupFeeThisYear, 0)
  const yearlyProfit = recurringYearlyRevenue + setupFeesThisYear - yearlyExpenses

  return {
    year,
    monthlyRevenue,
    monthlyExpenses,
    monthlyProfit,
    monthlyShare: monthlyProfit / 2,
    recurringYearlyRevenue,
    yearlyExpenses,
    setupFeesThisYear,
    yearlyProfit,
    yearlyShare: yearlyProfit / 2,
    clients: clients.sort(byMonthlyDesc),
    subscriptions: subscriptions.sort(byMonthlyDesc),
    excluded: {
      clients: excludedClients.sort(byMonthlyDesc),
      subscriptions: excludedSubs.sort(byMonthlyDesc),
      monthlyRevenue: sumMonthly(excludedClients),
      monthlyExpenses: sumMonthly(excludedSubs),
    },
  }
}
