import { formatCurrency } from '@/lib/utils/format'

export interface CatalogServiceOption {
  id: string
  name: string
  type: 'plan' | 'addon'
  plan_key: string | null
  setup_fee: number
  monthly_fee: number
  min_upfront: number | null
  contract_months: number | null
}

export function formatPlanOptionLabel(s: CatalogServiceOption): string {
  const parts = [s.name]
  if (s.monthly_fee > 0) parts.push(`${formatCurrency(s.monthly_fee)}/mo`)
  if (s.min_upfront != null && s.min_upfront > 0) {
    parts.push(`${formatCurrency(s.min_upfront)} upfront`)
  }
  if (s.setup_fee > 0) parts.push(`${formatCurrency(s.setup_fee)} setup total`)
  return parts.join(' · ')
}

export function isEmailAddon(planKey: string | null): boolean {
  return planKey?.endsWith('_email') ?? false
}

export function planKeyFromCatalog(planKey: string | null): 'basic' | 'full' | 'none' {
  if (planKey === 'basic' || planKey === 'full') return planKey
  return 'none'
}
