export const INDUSTRY_OPTIONS = [
  { id: 'churches', label: 'Churches' },
  { id: 'businesses', label: 'Businesses' },
  { id: 'schools', label: 'Schools & nonprofits' },
  { id: 'shops', label: 'Shops & retail' },
  { id: 'trades', label: 'Trades & services' },
] as const

export type IndustryId = (typeof INDUSTRY_OPTIONS)[number]['id']

const LEGACY_INDUSTRY: Record<string, IndustryId> = {
  church: 'churches',
  churches: 'churches',
  ministry: 'churches',
  business: 'businesses',
  businesses: 'businesses',
  other: 'businesses',
  health: 'businesses',
  hospitality: 'businesses',
  cafe: 'businesses',
  school: 'schools',
  schools: 'schools',
  education: 'schools',
  nonprofit: 'schools',
  'non-profit': 'schools',
  charity: 'schools',
  shop: 'shops',
  shops: 'shops',
  retail: 'shops',
  trade: 'trades',
  trades: 'trades',
  construction: 'trades',
}

export function isIndustryId(value: string): value is IndustryId {
  return INDUSTRY_OPTIONS.some((item) => item.id === value)
}

export function industryLabel(id: IndustryId | '' | null | undefined) {
  if (!id) return null
  return INDUSTRY_OPTIONS.find((item) => item.id === id)?.label ?? null
}

export function normalizeIndustry(value: string | null | undefined): IndustryId | '' {
  if (!value) return ''
  const raw = value.trim()
  if (!raw) return ''
  if (isIndustryId(raw)) return raw

  const lower = raw.toLowerCase()
  const byLabel = INDUSTRY_OPTIONS.find((item) => item.label.toLowerCase() === lower)
  if (byLabel) return byLabel.id
  if (LEGACY_INDUSTRY[lower]) return LEGACY_INDUSTRY[lower]

  if (lower.includes('church') || lower.includes('ministry')) return 'churches'
  if (lower.includes('school') || lower.includes('nonprofit') || lower.includes('non-profit') || lower.includes('charity')) {
    return 'schools'
  }
  if (lower.includes('shop') || lower.includes('retail')) return 'shops'
  if (lower.includes('trade') || lower.includes('plumb') || lower.includes('build') || lower.includes('electric')) {
    return 'trades'
  }
  if (lower.includes('business') || lower.includes('consult') || lower.includes('service')) return 'businesses'
  return ''
}

export function industryStoredValue(id: IndustryId) {
  return industryLabel(id) ?? id
}
