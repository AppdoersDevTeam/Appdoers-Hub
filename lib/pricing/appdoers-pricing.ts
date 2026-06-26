/**
 * Appdoers website pricing — keep in sync with
 * Appdoers Current Website/appdoers/src/content/siteContent.ts
 */

export const HOURLY_RATE = 49
export const FREE_EMAIL_TERM_MONTHS = 48
export const MAX_EMAIL_MAILBOXES = 30

export type ContractMonths = 12 | 24 | 48
export type WebsitePlanKey = 'basic' | 'full'

export const TERM_LABELS: Record<ContractMonths, string> = {
  12: '12 months',
  24: '24 months',
  48: '48 months',
}

export interface WebsitePlanTier {
  planKey: WebsitePlanKey
  name: string
  setupFee: number
  minUpfront: number
  includedEmail: { storage: string; users: number }
  termOptions: { months: ContractMonths; monthly: number }[]
}

export const WEBSITE_PLANS: WebsitePlanTier[] = [
  {
    planKey: 'basic',
    name: 'Basic Website',
    setupFee: 1499,
    minUpfront: 799,
    includedEmail: { storage: '5GB', users: 5 },
    termOptions: [
      { months: 12, monthly: 106.8 },
      { months: 24, monthly: 97.9 },
      { months: 48, monthly: 89 },
    ],
  },
  {
    planKey: 'full',
    name: 'Full Website',
    setupFee: 2999,
    minUpfront: 1199,
    includedEmail: { storage: '20GB', users: 5 },
    termOptions: [
      { months: 12, monthly: 199 },
      { months: 24, monthly: 179.1 },
      { months: 48, monthly: 159.2 },
    ],
  },
]

export type EmailPlanKey = 'basic_email' | 'standard_email' | 'premium_email'

export interface EmailAddOn {
  planKey: EmailPlanKey
  name: string
  storageNote: string
  prices: Record<ContractMonths, number>
}

export const EMAIL_ADDONS: EmailAddOn[] = [
  {
    planKey: 'basic_email',
    name: 'Basic Email',
    storageNote: '5GB per mailbox',
    prices: { 12: 3, 24: 2.5, 48: 2 },
  },
  {
    planKey: 'standard_email',
    name: 'Standard Email',
    storageNote: '20GB per mailbox',
    prices: { 12: 6.5, 24: 6, 48: 5.5 },
  },
  {
    planKey: 'premium_email',
    name: 'Premium Email',
    storageNote: '50GB per mailbox',
    prices: { 12: 12.5, 24: 11.5, 48: 10.5 },
  },
]

export const ONE_OFF_ADDONS = {
  donations_setup: {
    name: 'Online Donations Setup',
    setupFee: 147,
    monthlyFee: 0,
    description:
      'Stripe giving integration. Billed at $49/hr — usually about 3 hours (~$147).',
  },
  additional_work: {
    name: 'Additional Work',
    setupFee: 0,
    monthlyFee: 0,
    description:
      'Extra design rounds, post-launch updates, and one-off requests outside your plan. Billed at $49 NZD/hour.',
  },
} as const

export function getWebsitePlan(planKey: WebsitePlanKey): WebsitePlanTier {
  return WEBSITE_PLANS.find((p) => p.planKey === planKey) ?? WEBSITE_PLANS[0]
}

export function getTermOption(planKey: WebsitePlanKey, termMonths: ContractMonths) {
  const tier = getWebsitePlan(planKey)
  return tier.termOptions.find((t) => t.months === termMonths) ?? tier.termOptions[0]
}

/** Default monthly total at minimum upfront (matches appdoers.co.nz pricing cards). */
export function calculateDefaultMonthlyTotal(
  planKey: WebsitePlanKey,
  termMonths: ContractMonths,
  upfrontDev?: number
): number {
  const tier = getWebsitePlan(planKey)
  const term = getTermOption(planKey, termMonths)
  const upfront = upfrontDev ?? tier.minUpfront
  const spread = (tier.setupFee - upfront) / termMonths
  return roundMoney(term.monthly + spread)
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function formatPlanCatalogName(planKey: WebsitePlanKey, termMonths: ContractMonths): string {
  const tier = getWebsitePlan(planKey)
  return `${tier.name} (${TERM_LABELS[termMonths]})`
}

export function formatEmailCatalogName(emailKey: EmailPlanKey, termMonths: ContractMonths): string {
  const addon = EMAIL_ADDONS.find((a) => a.planKey === emailKey)!
  return `${addon.name} (${TERM_LABELS[termMonths]})`
}
