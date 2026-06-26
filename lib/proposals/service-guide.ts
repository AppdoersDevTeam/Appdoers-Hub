import {
  calculateDefaultMonthlyTotal,
  EMAIL_ADDONS,
  HOURLY_RATE,
  TERM_LABELS,
  WEBSITE_PLANS,
  type ContractMonths,
} from '@/lib/pricing/appdoers-pricing'

export interface ServiceCatalogEntry {
  id: string
  name: string
  description: string | null
  type: string
  plan_key: string | null
  setup_fee: number
  monthly_fee: number
  contract_months?: number | null
  min_upfront?: number | null
}

export interface PricingItem {
  id?: string
  name: string
  description?: string
  setup_fee: number
  monthly_fee: number
  service_id?: string | null
  service_catalog_id?: string | null
}

export const HOW_PLANS_WORK = {
  title: 'How Appdoers Plans Work',
  intro:
    'Every Appdoers website is delivered on a clear monthly plan. You pay a one-time setup fee to design and build your site, then a fixed monthly fee for hosting, security, maintenance, and support.',
  sections: [
    {
      heading: 'Contract length',
      body: 'Plans run for 12, 24, or 48 months from your launch date. Longer terms reduce the plan rate. Your contract term is agreed before build starts. Open-ended terms are not offered.',
    },
    {
      heading: 'Setup fee',
      body: 'The setup fee covers discovery, design, build, feedback rounds, QA, and go-live. Basic Website: $1,499 total ($799 minimum upfront). Full Website: $2,999 total ($1,199 minimum upfront). Pay more upfront on a 1-year plan to lower your monthly bill — your total price stays the same.',
    },
    {
      heading: 'When payments start',
      body: 'Your setup fee is due within 7 days of signing. Your first monthly bill is due at the end of the 8-week development period, or within 7 days of launch if your site is ready sooner. All bills are paid monthly or annually in advance.',
    },
    {
      heading: 'What is included ongoing',
      body: `Hosting on fast NZ-friendly infrastructure, security monitoring, software updates, backups, and support for issues within your plan scope. Each plan includes 3 design feedback rounds during build. Changes outside scope are billed at $${HOURLY_RATE} NZD/hour.`,
    },
    {
      heading: 'Business email',
      body: 'Email contracts must match your website plan length. Free on 48-month website plans: Basic Website includes Basic email (5GB, up to 5 people); Full Website includes Standard email (20GB, up to 5 people). Additional mailboxes available up to 30.',
    },
    {
      heading: 'End of contract & cancellation',
      body: 'When your contract ends, you can sign up for another term. If no new term is chosen within 30 days, your site will be suspended. All cancellations require 30 days written notice. Early exit requires paying remaining months at your monthly price.',
    },
    {
      heading: 'What we do not include',
      body: 'We do not design logos, edit photos, create or edit videos, run ads, manage ongoing Google search campaigns, manage social media, or build phone apps. All content must be supplied ready to use.',
    },
  ],
}

export const PLAN_COMPARISON = {
  title: 'Website Plans at a Glance',
  plans: [
    {
      name: 'Basic Website',
      tagline: 'Professional public website',
      includes: [
        'Unlimited pages — works on all devices',
        'Domain, security & hosting managed by Appdoers',
        'Basic Google setup',
        'YouTube video catalogue',
        'Contact form',
        '3 design feedback rounds',
        'Fixed content; changes on request',
        'Free business email on 4-year plan (5GB, up to 5 people)',
      ],
      idealFor: 'Churches, businesses, and organisations that need a fast, professional public site.',
      pricingNote: `12-month from $${calculateDefaultMonthlyTotal('basic', 12)}/mo + $1,499 setup ($799 min upfront). Also available on 24- and 48-month terms.`,
    },
    {
      name: 'Full Website',
      tagline: 'Public site plus member and team tools',
      includes: [
        'Everything in Basic Website',
        'Private area for your team',
        'Member-only area',
        'Events, newsletters & prayer requests',
        'Directory, rosters & groups',
        'Manage who can log in',
        'Online donations (Stripe setup billed separately)',
        'Free business email on 4-year plan (20GB Standard, up to 5 people)',
      ],
      idealFor: 'Active organisations that need member areas, rosters, and admin tools day to day.',
      pricingNote: `12-month from $${calculateDefaultMonthlyTotal('full', 12)}/mo + $2,999 setup ($1,199 min upfront). Also available on 24- and 48-month terms.`,
    },
  ],
}

export const EMAIL_PRICING_GUIDE = {
  title: 'Business Email Pricing',
  intro: 'Per mailbox per month. Contract length must match your website plan.',
  tiers: EMAIL_ADDONS.map((tier) => ({
    name: tier.name,
    storage: tier.storageNote,
    prices: (Object.entries(tier.prices) as [string, number][]).map(([months, price]) => ({
      term: TERM_LABELS[Number(months) as ContractMonths],
      price: `$${price}/mailbox/mo`,
    })),
  })),
  freeNote: `Included free on 48-month website plans — Basic Website: 5GB (up to 5 people); Full Website: 20GB Standard (up to 5 people).`,
}

export const WEBSITE_TERM_PRICING = WEBSITE_PLANS.flatMap((plan) =>
  plan.termOptions.map((term) => ({
    planKey: plan.planKey,
    name: plan.name,
    termMonths: term.months,
    termLabel: TERM_LABELS[term.months],
    setupFee: plan.setupFee,
    minUpfront: plan.minUpfront,
    monthlyTotal: calculateDefaultMonthlyTotal(plan.planKey, term.months),
  }))
)

export function resolveServiceDetails(
  item: PricingItem,
  catalog: ServiceCatalogEntry[]
): { name: string; description: string; type: string } {
  const catalogId = item.service_catalog_id ?? item.service_id
  const match = catalogId ? catalog.find((s) => s.id === catalogId) : undefined
  const byName = catalog.find((s) => s.name.toLowerCase() === item.name.toLowerCase())

  const service = match ?? byName
  const description =
    item.description?.trim() ||
    service?.description?.trim() ||
    'Included as part of your Appdoers website plan.'

  return {
    name: item.name,
    description,
    type: service?.type ?? 'custom',
  }
}

export function formatCatalogOptionLabel(service: {
  name: string
  type: string
  monthly_fee: number
  setup_fee: number
  contract_months?: number | null
}): string {
  const monthly =
    service.monthly_fee > 0 ? ` — $${service.monthly_fee.toFixed(2)}/mo` : ''
  const setup =
    service.setup_fee > 0 && service.monthly_fee === 0
      ? ` — $${service.setup_fee} setup`
      : service.setup_fee > 0
        ? ` + $${service.setup_fee} setup`
        : ''
  return `${service.name}${monthly}${setup}`
}
