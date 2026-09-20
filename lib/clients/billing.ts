import type { ClientBillingCycle } from '@/lib/types/database'
import { formatCurrency } from '@/lib/utils/format'

export type { ClientBillingCycle }

export const BILLING_CYCLE_OPTIONS: { value: ClientBillingCycle; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

const CYCLE_SUFFIX: Record<ClientBillingCycle, string> = {
  weekly: '/wk',
  monthly: '/mo',
  yearly: '/yr',
}

export function normalizeBillingCycle(cycle: string | null | undefined): ClientBillingCycle {
  if (cycle === 'weekly' || cycle === 'yearly') return cycle
  return 'monthly'
}

export function recurringFeeToMonthly(amount: number, cycle: string | null | undefined): number {
  const fee = Number(amount) || 0
  const normalized = normalizeBillingCycle(cycle)
  if (normalized === 'weekly') return (fee * 52) / 12
  if (normalized === 'yearly') return fee / 12
  return fee
}

/** Monthly run-rate for one client: cycle-normalized plan fee plus add-on monthly fees. */
export function clientRunRateMrr(
  planFee: number,
  cycle: string | null | undefined,
  addonMonthlyTotal = 0
): number {
  return recurringFeeToMonthly(planFee, cycle) + (Number(addonMonthlyTotal) || 0)
}

export function formatRecurringFee(amount: number, cycle: string | null | undefined): string {
  return `${formatCurrency(Number(amount) || 0)}${CYCLE_SUFFIX[normalizeBillingCycle(cycle)]}`
}

export function billingCycleFeeLabel(cycle: string | null | undefined): string {
  if (cycle === 'weekly') return 'Weekly Fee (NZD)'
  if (cycle === 'yearly') return 'Yearly Fee (NZD)'
  if (cycle === 'monthly') return 'Monthly Fee (NZD)'
  return 'Fee (NZD)'
}
