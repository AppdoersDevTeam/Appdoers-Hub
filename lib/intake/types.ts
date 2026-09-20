import { normalizeIndustry, type IndustryId } from '@/lib/industries'
import { DOMAIN_TLDS, type DomainTldPreference } from './domain-suggestions'
import type { PlanInterest } from './profiles'

export type IntakeStatus = 'sent' | 'submitted' | 'updated' | 'locked'
export type ColorMode = 'palette' | 'custom' | 'unsure'
export type FontMode = 'pairing' | 'custom' | 'unsure'
export type LogoMode = 'upload' | 'need_designed' | 'text_logo' | 'unsure'
export type DomainStatus = 'own' | 'buy' | 'unsure'
export type PreferredContact = 'email' | 'phone' | 'both'
export type CopySource = 'client' | 'appdoers' | 'mix' | 'unsure'
export type ToneId = 'professional' | 'friendly' | 'bold' | 'calm' | 'luxury' | 'unsure'
export type HostingOwnership = 'have' | 'appdoers' | 'unsure'
export type DomainLoginStatus = 'have' | 'later' | 'appdoers'
export type SellOnline = '' | 'yes' | 'no' | 'planning'

export type { DomainTldPreference, IndustryId }
export type CompanyTypeId = IndustryId

export interface IntakeProfileDetails {
  denomination: string
  congregation_size: string
  service_times: string
  organisation_kind: string
  community_size: string
  product_types: string
  sell_online: SellOnline
  trade_type: string
  years_operating: string
  youtube_url: string
  mailbox_count: string
}

export interface IntakeContact {
  name: string
  role: string
  email: string
  phone: string
}

export interface IntakeColors {
  primary: string
  secondary: string
  accent: string
  background: string
}

export interface IntakeAnswers {
  people: {
    company_name: string
    company_type: IndustryId | ''
    what_we_do: string
    audience: string
    location: string
    preferred_contact: PreferredContact
    primary: IntakeContact
    extras: IntakeContact[]
    profile: IntakeProfileDetails
  }
  domain: {
    status: DomainStatus
    tld_preference: DomainTldPreference
    domain_name: string
    current_site: string
    has_current_site: 'yes' | 'none'
    registrar: string
    registrar_other: string
  }
  brand: {
    logo_mode: LogoMode
    logo_path: string | null
    logo_name: string | null
    color_mode: ColorMode
    palette_id: string | null
    custom_colors: IntakeColors
    font_mode: FontMode
    pairing_id: string | null
    custom_heading_font: string
    custom_body_font: string
    mood_id: string | null
    sites_i_like: string
  }
  content: {
    tagline: string
    tone: ToneId
    pages: string[]
    custom_pages: string
    copy_source: CopySource
  }
  features: {
    plan_interest: PlanInterest
    items: string[]
    must_haves: string
    nice_to_haves: string
    references: string
    launch_date: string
    no_deadline: boolean
  }
  access: {
    hosting: HostingOwnership
    domain_login: DomainLoginStatus
    registrar_username: string
    registrar_password: string
    hosting_username: string
    hosting_password: string
    socials: { instagram: string; facebook: string; linkedin: string; other: string }
    google_business: string
    analytics: string
    notes: string
  }
}

export const INTAKE_STATUS_LABELS: Record<IntakeStatus, string> = {
  sent: 'Awaiting client',
  submitted: 'Submitted',
  updated: 'Updated',
  locked: 'Locked',
}

export function emptyIntakeContact(): IntakeContact {
  return { name: '', role: '', email: '', phone: '' }
}

export function emptyIntakeProfile(): IntakeProfileDetails {
  return {
    denomination: '',
    congregation_size: '',
    service_times: '',
    organisation_kind: '',
    community_size: '',
    product_types: '',
    sell_online: '',
    trade_type: '',
    years_operating: '',
    youtube_url: '',
    mailbox_count: '',
  }
}

export function emptyIntakeAnswers(): IntakeAnswers {
  return {
    people: {
      company_name: '',
      company_type: '',
      what_we_do: '',
      audience: '',
      location: '',
      preferred_contact: 'email',
      primary: emptyIntakeContact(),
      extras: [],
      profile: emptyIntakeProfile(),
    },
    domain: {
      status: 'unsure',
      tld_preference: 'unsure',
      domain_name: '',
      current_site: '',
      has_current_site: 'none',
      registrar: 'unsure',
      registrar_other: '',
    },
    brand: {
      logo_mode: 'unsure',
      logo_path: null,
      logo_name: null,
      color_mode: 'unsure',
      palette_id: null,
      custom_colors: {
        primary: '#1e3a5f',
        secondary: '#64748b',
        accent: '#3b82f6',
        background: '#ffffff',
      },
      font_mode: 'unsure',
      pairing_id: null,
      custom_heading_font: '',
      custom_body_font: '',
      mood_id: 'unsure',
      sites_i_like: '',
    },
    content: {
      tagline: '',
      tone: 'unsure',
      pages: [],
      custom_pages: '',
      copy_source: 'mix',
    },
    features: {
      plan_interest: 'unsure',
      items: [],
      must_haves: '',
      nice_to_haves: '',
      references: '',
      launch_date: '',
      no_deadline: true,
    },
    access: {
      hosting: 'unsure',
      domain_login: 'later',
      registrar_username: '',
      registrar_password: '',
      hosting_username: '',
      hosting_password: '',
      socials: { instagram: '', facebook: '', linkedin: '', other: '' },
      google_business: '',
      analytics: '',
      notes: '',
    },
  }
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function mergeContact(value: unknown): IntakeContact {
  const row = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    name: asString(row.name),
    role: asString(row.role),
    email: asString(row.email),
    phone: asString(row.phone),
  }
}

export function mergeIntakeAnswers(raw: unknown): IntakeAnswers {
  const base = emptyIntakeAnswers()
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const people = (input.people ?? {}) as Record<string, unknown>
  const domain = (input.domain ?? {}) as Record<string, unknown>
  const brand = (input.brand ?? {}) as Record<string, unknown>
  const content = (input.content ?? {}) as Record<string, unknown>
  const features = (input.features ?? {}) as Record<string, unknown>
  const access = (input.access ?? {}) as Record<string, unknown>
  const colors = (brand.custom_colors ?? {}) as Record<string, unknown>
  const socials = (access.socials ?? {}) as Record<string, unknown>
  const extras = Array.isArray(people.extras) ? people.extras.map(mergeContact) : []
  const pages = Array.isArray(content.pages) ? content.pages.filter((x): x is string => typeof x === 'string') : base.content.pages
  const items = Array.isArray(features.items) ? features.items.filter((x): x is string => typeof x === 'string') : base.features.items
  const profileRaw = (people.profile ?? {}) as Record<string, unknown>
  const sellOnline = asString(profileRaw.sell_online)
  const planInterest = asString(features.plan_interest)

  return {
    people: {
      company_name: asString(people.company_name),
      company_type: normalizeIndustry(asString(people.company_type)),
      what_we_do: asString(people.what_we_do),
      audience: asString(people.audience),
      location: asString(people.location),
      preferred_contact: (['email', 'phone', 'both'].includes(asString(people.preferred_contact))
        ? people.preferred_contact
        : base.people.preferred_contact) as PreferredContact,
      primary: mergeContact(people.primary),
      extras,
      profile: {
        denomination: asString(profileRaw.denomination),
        congregation_size: asString(profileRaw.congregation_size),
        service_times: asString(profileRaw.service_times),
        organisation_kind: asString(profileRaw.organisation_kind),
        community_size: asString(profileRaw.community_size),
        product_types: asString(profileRaw.product_types),
        sell_online: (['yes', 'no', 'planning'].includes(sellOnline) ? sellOnline : '') as SellOnline,
        trade_type: asString(profileRaw.trade_type),
        years_operating: asString(profileRaw.years_operating),
        youtube_url: asString(profileRaw.youtube_url),
        mailbox_count: asString(profileRaw.mailbox_count),
      },
    },
    domain: {
      status: (['own', 'buy', 'unsure'].includes(asString(domain.status)) ? domain.status : base.domain.status) as DomainStatus,
      tld_preference: (DOMAIN_TLDS.some((item) => item.id === asString(domain.tld_preference))
        ? domain.tld_preference
        : 'unsure') as DomainTldPreference,
      domain_name: asString(domain.domain_name),
      current_site: asString(domain.current_site),
      has_current_site: asString(domain.has_current_site) === 'yes' ? 'yes' : 'none',
      registrar: asString(domain.registrar, base.domain.registrar),
      registrar_other: asString(domain.registrar_other),
    },
    brand: {
      logo_mode: (['upload', 'need_designed', 'text_logo', 'unsure'].includes(asString(brand.logo_mode))
        ? brand.logo_mode
        : base.brand.logo_mode) as LogoMode,
      logo_path: asString(brand.logo_path) || null,
      logo_name: asString(brand.logo_name) || null,
      color_mode: (['palette', 'custom', 'unsure'].includes(asString(brand.color_mode))
        ? brand.color_mode
        : base.brand.color_mode) as ColorMode,
      palette_id: asString(brand.palette_id) || null,
      custom_colors: {
        primary: asString(colors.primary, base.brand.custom_colors.primary),
        secondary: asString(colors.secondary, base.brand.custom_colors.secondary),
        accent: asString(colors.accent, base.brand.custom_colors.accent),
        background: asString(colors.background, base.brand.custom_colors.background),
      },
      font_mode: (['pairing', 'custom', 'unsure'].includes(asString(brand.font_mode))
        ? brand.font_mode
        : base.brand.font_mode) as FontMode,
      pairing_id: asString(brand.pairing_id) || null,
      custom_heading_font: asString(brand.custom_heading_font),
      custom_body_font: asString(brand.custom_body_font),
      mood_id: asString(brand.mood_id, 'unsure') || 'unsure',
      sites_i_like: asString(brand.sites_i_like),
    },
    content: {
      tagline: asString(content.tagline),
      tone: (['professional', 'friendly', 'bold', 'calm', 'luxury', 'unsure'].includes(asString(content.tone))
        ? content.tone
        : base.content.tone) as ToneId,
      pages,
      custom_pages: asString(content.custom_pages),
      copy_source: (['client', 'appdoers', 'mix', 'unsure'].includes(asString(content.copy_source))
        ? content.copy_source
        : base.content.copy_source) as CopySource,
    },
    features: {
      plan_interest: (['basic', 'full', 'unsure'].includes(planInterest) ? planInterest : 'unsure') as PlanInterest,
      items,
      must_haves: asString(features.must_haves),
      nice_to_haves: asString(features.nice_to_haves),
      references: asString(features.references),
      launch_date: asString(features.launch_date),
      no_deadline: typeof features.no_deadline === 'boolean' ? features.no_deadline : true,
    },
    access: {
      hosting: (['have', 'appdoers', 'unsure'].includes(asString(access.hosting))
        ? access.hosting
        : base.access.hosting) as HostingOwnership,
      domain_login: (['have', 'later', 'appdoers'].includes(asString(access.domain_login))
        ? access.domain_login
        : base.access.domain_login) as DomainLoginStatus,
      registrar_username: asString(access.registrar_username),
      registrar_password: asString(access.registrar_password),
      hosting_username: asString(access.hosting_username),
      hosting_password: asString(access.hosting_password),
      socials: {
        instagram: asString(socials.instagram),
        facebook: asString(socials.facebook),
        linkedin: asString(socials.linkedin),
        other: asString(socials.other),
      },
      google_business: asString(access.google_business),
      analytics: asString(access.analytics),
      notes: asString(access.notes),
    },
  }
}

export function validateIntakeAnswers(answers: IntakeAnswers): string | null {
  if (!answers.people.company_type) return 'Please choose whether you are a church, business, school/nonprofit, shop, or trade.'
  if (!answers.people.company_name.trim()) return 'Please enter your organisation name.'
  if (!answers.people.primary.name.trim()) return 'Please enter a primary contact name.'
  if (!answers.people.primary.email.trim()) return 'Please enter a primary contact email.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.people.primary.email.trim())) {
    return 'Please enter a valid primary contact email.'
  }
  if (answers.domain.status === 'own' && !answers.domain.domain_name.trim()) {
    return 'Please enter the domain you already own.'
  }
  return null
}
