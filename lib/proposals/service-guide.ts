export interface ServiceCatalogEntry {
  id: string
  name: string
  description: string | null
  type: string
  plan_key: string | null
  setup_fee: number
  monthly_fee: number
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
      body: 'Plans run for 12, 24, or 48 months from your launch date. Longer terms can reduce the monthly rate. Your contract term is agreed before build starts.',
    },
    {
      heading: 'Setup fee',
      body: 'The setup fee covers discovery, design, build, feedback rounds, QA, and go-live. A minimum upfront payment is required when you sign; the remainder is spread across your monthly payments.',
    },
    {
      heading: 'Monthly billing',
      body: 'Monthly fees begin after the build period (typically 8 weeks) or within 7 days of an early launch. Billing is in advance each month and includes hosting, SSL security, updates, and direct access to the Appdoers team.',
    },
    {
      heading: 'What is included ongoing',
      body: 'Hosting on fast NZ-friendly infrastructure, security monitoring, software updates, backups, and support for issues within your plan scope. Changes outside scope are billed at $49 NZD/hour.',
    },
    {
      heading: 'Add-ons',
      body: 'Email mailboxes, online donations setup, and extra design or content work are optional add-ons. Add-on monthly fees must match your website contract length unless noted otherwise.',
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
        'Unlimited pages with mobile-first design',
        'Domain, hosting, and security managed by Appdoers',
        'Google setup and YouTube video catalogue',
        'Contact form and 3 design feedback rounds',
        'Ongoing hosting, security, and maintenance',
      ],
      idealFor: 'Churches, businesses, and organisations that need a fast, professional public site.',
      pricingNote: '12-month plan from $165.13/mo + $1,499 setup ($799 min upfront).',
    },
    {
      name: 'Full Website',
      tagline: 'Public site plus member and team tools',
      includes: [
        'Everything in Basic Website',
        'Private team management area',
        'Member-only portal (events, newsletters, prayer requests)',
        'Directory, rosters, groups, and login management',
        'Online donations (Stripe setup billed separately)',
      ],
      idealFor: 'Active organisations that need member areas, rosters, and admin tools day to day.',
      pricingNote: '12-month plan from $349/mo + $2,999 setup ($1,199 min upfront).',
    },
  ],
}

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
