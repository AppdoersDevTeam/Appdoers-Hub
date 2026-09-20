export const SUBSCRIPTION_BILLING_CYCLES = [
  'one_off',
  'monthly',
  'quarterly',
  'yearly',
  'months_24',
  'months_36',
  'months_48',
  'months_60',
] as const

export type SubscriptionBillingCycle = (typeof SUBSCRIPTION_BILLING_CYCLES)[number]

export const SUBSCRIPTION_BILLING_CYCLE_OPTIONS: {
  value: SubscriptionBillingCycle
  label: string
}[] = [
  { value: 'one_off', label: 'One-off payment' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly (3 months)' },
  { value: 'yearly', label: 'Yearly (12 months)' },
  { value: 'months_24', label: '24 months' },
  { value: 'months_36', label: '36 months' },
  { value: 'months_48', label: '48 months' },
  { value: 'months_60', label: '60 months' },
]

const CYCLE_MONTHS: Record<Exclude<SubscriptionBillingCycle, 'one_off'>, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
  months_24: 24,
  months_36: 36,
  months_48: 48,
  months_60: 60,
}

const CYCLE_SUFFIX: Record<SubscriptionBillingCycle, string> = {
  one_off: ' once',
  monthly: '/mo',
  quarterly: '/qtr',
  yearly: '/yr',
  months_24: '/24mo',
  months_36: '/36mo',
  months_48: '/48mo',
  months_60: '/60mo',
}

export function isSubscriptionBillingCycle(
  cycle: string | null | undefined
): cycle is SubscriptionBillingCycle {
  return SUBSCRIPTION_BILLING_CYCLES.includes(cycle as SubscriptionBillingCycle)
}

export function normalizeSubscriptionBillingCycle(
  cycle: string | null | undefined
): SubscriptionBillingCycle {
  if (isSubscriptionBillingCycle(cycle)) return cycle
  return 'monthly'
}

export function isOneOffCycle(cycle: string | null | undefined): boolean {
  return normalizeSubscriptionBillingCycle(cycle) === 'one_off'
}

export function subscriptionDateFieldLabel(cycle: string | null | undefined): string {
  return isOneOffCycle(cycle) ? 'Expiry Date' : 'Renewal Date'
}

export function subscriptionCostToMonthly(
  amount: number,
  cycle: string | null | undefined
): number {
  const cost = Number(amount) || 0
  const normalized = normalizeSubscriptionBillingCycle(cycle)
  if (normalized === 'one_off') return 0
  return cost / CYCLE_MONTHS[normalized]
}

export function subscriptionCostToYearly(
  amount: number,
  cycle: string | null | undefined
): number {
  const cost = Number(amount) || 0
  const normalized = normalizeSubscriptionBillingCycle(cycle)
  if (normalized === 'one_off') return 0
  return (cost / CYCLE_MONTHS[normalized]) * 12
}

export function formatSubscriptionCost(
  amount: number,
  cycle: string | null | undefined
): string {
  const formatted = new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
  }).format(Number(amount) || 0)
  return `${formatted}${CYCLE_SUFFIX[normalizeSubscriptionBillingCycle(cycle)]}`
}
