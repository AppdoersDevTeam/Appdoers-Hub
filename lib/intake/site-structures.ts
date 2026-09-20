import type { IndustryId } from '@/lib/industries'
import { INDUSTRY_OPTIONS, isIndustryId, industryLabel, normalizeIndustry } from '@/lib/industries'
import type { DomainTldPreference } from './domain-suggestions'

export type { IndustryId }
export type CompanyTypeId = IndustryId

export interface SitePageNode {
  id: string
  label: string
  optional?: boolean
  children?: SitePageNode[]
}

export const COMPANY_TYPES = INDUSTRY_OPTIONS

export const SITE_STRUCTURES: Record<IndustryId, SitePageNode[]> = {
  churches: [
    { id: 'home', label: 'Home' },
    {
      id: 'about',
      label: 'About',
      children: [
        { id: 'about-vision', label: 'Our Vision and Mission' },
        { id: 'about-believe', label: 'What we believe' },
        { id: 'about-leadership', label: 'Leadership' },
        { id: 'about-history', label: 'History' },
      ],
    },
    {
      id: 'whats-on',
      label: "What's On",
      children: [
        { id: 'whats-on-family', label: 'Family' },
        { id: 'whats-on-kids', label: 'Kids' },
        { id: 'whats-on-teen', label: 'Teen' },
        { id: 'whats-on-youth', label: 'Youth' },
        { id: 'whats-on-youth-adult', label: 'Youth / Adult' },
        { id: 'whats-on-couples', label: 'Couples' },
        { id: 'whats-on-worship', label: 'Worship' },
        { id: 'whats-on-mission', label: 'Mission' },
        { id: 'whats-on-cap', label: 'CAP' },
        { id: 'whats-on-services', label: 'Services' },
      ],
    },
    { id: 'listen-learn', label: 'Listen & Learn' },
    { id: 'events', label: 'Events' },
    {
      id: 'im-new',
      label: "I'm New",
      children: [
        { id: 'im-new-welcome-info', label: 'Welcome Info' },
        { id: 'im-new-welcome-pack', label: 'Welcome Pack' },
        { id: 'im-new-faq', label: 'FAQ' },
      ],
    },
    { id: 'prayers', label: 'Prayers (General)' },
    {
      id: 'giving',
      label: 'Giving',
      children: [
        { id: 'giving-direct-deposit', label: 'Direct Deposit (Bank Account Info)' },
        { id: 'giving-card', label: 'Credit Card Donation', optional: true },
      ],
    },
    { id: 'contact', label: 'Contact (Church)' },
    { id: 'faqs', label: 'FAQs' },
  ],
  businesses: [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    {
      id: 'services',
      label: 'Services',
      children: [
        { id: 'services-one', label: 'Service 1' },
        { id: 'services-two', label: 'Service 2' },
        { id: 'services-three', label: 'Service 3' },
      ],
    },
    { id: 'work', label: 'Work / case studies' },
    { id: 'team', label: 'Team' },
    { id: 'testimonials', label: 'Testimonials' },
    { id: 'resources', label: 'Resources / YouTube' },
    { id: 'blog', label: 'News / insights' },
    { id: 'contact', label: 'Contact' },
    { id: 'faqs', label: 'FAQs' },
    { id: 'client-login', label: 'Client / member login', optional: true },
    { id: 'shop', label: 'Shop', optional: true },
  ],
  schools: [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'programmes', label: 'Programmes' },
    { id: 'term-dates', label: 'Term dates / calendar' },
    { id: 'enrolment', label: 'Enrolment / join us' },
    { id: 'news', label: 'News & announcements' },
    { id: 'events', label: 'Events' },
    { id: 'staff', label: 'Staff / team' },
    { id: 'involved', label: 'Get involved / volunteer' },
    { id: 'donate', label: 'Donate / give', optional: true },
    { id: 'contact', label: 'Contact' },
    { id: 'faqs', label: 'FAQs' },
    { id: 'family-login', label: 'Family / member login', optional: true },
  ],
  shops: [
    { id: 'home', label: 'Home' },
    { id: 'shop', label: 'Shop' },
    {
      id: 'collections',
      label: 'Collections',
      children: [
        { id: 'collections-one', label: 'Collection 1' },
        { id: 'collections-two', label: 'Collection 2' },
      ],
    },
    { id: 'about', label: 'About' },
    { id: 'lookbook', label: 'Lookbook / videos' },
    { id: 'shipping', label: 'Shipping & returns' },
    { id: 'contact', label: 'Contact' },
    { id: 'faqs', label: 'FAQs' },
    { id: 'account', label: 'Customer accounts', optional: true },
  ],
  trades: [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    {
      id: 'services',
      label: 'Services',
      children: [
        { id: 'services-residential', label: 'Residential' },
        { id: 'services-commercial', label: 'Commercial' },
      ],
    },
    { id: 'projects', label: 'Projects / gallery' },
    { id: 'areas', label: 'Service areas' },
    { id: 'testimonials', label: 'Testimonials' },
    { id: 'quote', label: 'Request a quote' },
    { id: 'contact', label: 'Contact' },
    { id: 'faqs', label: 'FAQs' },
    { id: 'bookings', label: 'Bookings / job requests', optional: true },
    { id: 'shop', label: 'Parts / products shop', optional: true },
  ],
}

export const MAINTENANCE_PAGES_NOTE =
  'This is an example of services included in the website maintenance plans and is not a complete list.'

export function isCompanyType(value: string): value is IndustryId {
  return isIndustryId(normalizeIndustry(value) || value)
}

export function companyTypeLabel(id: string | null | undefined) {
  const industry = normalizeIndustry(id)
  return industry ? industryLabel(industry) : null
}

export function flattenSitePages(nodes: SitePageNode[]): SitePageNode[] {
  return nodes.flatMap((node) => [node, ...(node.children ? flattenSitePages(node.children) : [])])
}

export function defaultPageIds(type: IndustryId) {
  return flattenSitePages(SITE_STRUCTURES[type])
    .filter((node) => !node.optional)
    .map((node) => node.id)
}

function ancestorIds(nodes: SitePageNode[], targetId: string, trail: string[] = []): string[] | null {
  for (const node of nodes) {
    if (node.id === targetId) return trail
    if (node.children) {
      const found = ancestorIds(node.children, targetId, [...trail, node.id])
      if (found) return found
    }
  }
  return null
}

function descendantIds(node: SitePageNode): string[] {
  return node.children ? flattenSitePages(node.children).map((child) => child.id) : []
}

export function toggleSitePage(type: IndustryId, selected: string[], pageId: string) {
  const nodes = SITE_STRUCTURES[type]
  const node = flattenSitePages(nodes).find((item) => item.id === pageId)
  if (!node) {
    return selected.includes(pageId) ? selected.filter((id) => id !== pageId) : [...selected, pageId]
  }

  if (selected.includes(pageId)) {
    const remove = new Set([pageId, ...descendantIds(node)])
    return selected.filter((id) => !remove.has(id))
  }

  const ancestors = ancestorIds(nodes, pageId) ?? []
  return [...new Set([...selected, pageId, ...ancestors])]
}

export function pageLabel(type: IndustryId | '', pageId: string) {
  const industry = normalizeIndustry(type)
  if (industry) {
    const match = flattenSitePages(SITE_STRUCTURES[industry]).find((node) => node.id === pageId)
    if (match) return match.label
  }
  return pageId.replaceAll('-', ' ')
}

export function selectedPageOutline(
  type: IndustryId | '',
  selected: string[]
): { id: string; label: string; depth: number; optional?: boolean }[] {
  const industry = normalizeIndustry(type)
  const nodes = industry ? SITE_STRUCTURES[industry] : []
  const out: { id: string; label: string; depth: number; optional?: boolean }[] = []

  function walk(list: SitePageNode[], depth: number) {
    for (const node of list) {
      if (selected.includes(node.id)) {
        out.push({ id: node.id, label: node.label, depth, optional: node.optional })
      }
      if (node.children) walk(node.children, depth + 1)
    }
  }

  walk(nodes, 0)

  if (out.length === 0) {
    return selected.map((id) => ({ id, label: pageLabel(industry, id), depth: 0 }))
  }
  return out
}

export function defaultTldForIndustry(type: IndustryId): DomainTldPreference {
  if (type === 'churches' || type === 'schools') return 'org.nz'
  return 'co.nz'
}
