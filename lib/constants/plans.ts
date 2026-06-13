import type { SubscriptionPlan } from '@/lib/types/database'

export const PLAN_LABELS: Record<string, string> = {
  basic: 'Basic Website',
  full: 'Full Website',
  none: 'No Plan',
}

export const FALLBACK_PLANS: { value: SubscriptionPlan; label: string; fee: number; setup: number }[] = [
  { value: 'basic', label: 'Basic Website — $165.13/mo', fee: 165.13, setup: 1499 },
  { value: 'full', label: 'Full Website — $349/mo', fee: 349, setup: 2999 },
  { value: 'none', label: 'No Plan', fee: 0, setup: 0 },
]
