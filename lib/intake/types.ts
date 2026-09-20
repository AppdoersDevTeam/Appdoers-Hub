export type IntakeStatus = 'sent' | 'submitted' | 'updated' | 'locked'

export type ColorMode = 'palette' | 'custom' | 'unsure'
export type FontMode = 'pairing' | 'custom' | 'unsure'
export type LogoMode = 'upload' | 'need_designed' | 'text_logo' | 'unsure'
export type DomainStatus = 'own' | 'buy' | 'unsure'
export type PreferredContact = 'email' | 'phone' | 'both'
export type CopySource = 'client' | 'appdoers' | 'mix' | 'unsure'
export type ToneId =
  | 'professional'
  | 'friendly'
  | 'bold'
  | 'calm'
  | 'luxury'
  | 'unsure'
export type HostingOwnership = 'have' | 'appdoers' | 'unsure'
export type DomainLoginStatus = 'have' | 'later' | 'appdoers'

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
    what_we_do: string
    audience: string
    location: string
    preferred_contact: PreferredContact
    primary: IntakeContact
    extras: IntakeContact[]
  }
  domain: {
    status: DomainStatus
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
    socials: {
      instagram: string
      facebook: string
      linkedin: string
      other: string
    }
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

export function emptyIntakeAnswers(): IntakeAnswers {
  return {
    people: {
      company_name: '',
      what_we_do: '',
      audience: '',
      location: '',
      preferred_contact: 'email',
      primary: emptyIntakeContact(),
      extras: [],
    },
    domain: {
      status: 'unsure',
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
      pages: ['home', 'about', 'services', 'contact'],
      custom_pages: '',
      copy_source: 'mix',
    },
    features: {
      items: ['contact_form'],
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
      socials: {
        instagram: '',
        facebook: '',
        linkedin: '',
        other: '',
      },
      google_business: '',
      analytics: '',
      notes: '',
    },
  }
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback
  return value.filter((item): item is string => typeof item === 'string')
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

  return {
    people: {
      company_name: asString(people.company_name, base.people.company_name),
      what_we_do: asString(people.what_we_do),
      audience: asString(people.audience),
      location: asString(people.location),
      preferred_contact: (['email', 'phone', 'both'].includes(asString(people.preferred_contact))
        ? people.preferred_contact
        : base.people.preferred_contact) as PreferredContact,
      primary: mergeContact(people.primary),
      extras,
    },
    domain: {
      status: (['own', 'buy', 'unsure'].includes(asString(domain.status))
        ? domain.status
        : base.domain.status) as DomainStatus,
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
      tone: (['professional', 'friendly', 'bold', 'calm', 'luxury', 'unsure'].includes(
        asString(content.tone)
      )
        ? content.tone
        : base.content.tone) as ToneId,
      pages: asStringArray(content.pages, base.content.pages),
      custom_pages: asString(content.custom_pages),
      copy_source: (['client', 'appdoers', 'mix', 'unsure'].includes(asString(content.copy_source))
        ? content.copy_source
        : base.content.copy_source) as CopySource,
    },
    features: {
      items: asStringArray(features.items, base.features.items),
      must_haves: asString(features.must_haves),
      nice_to_haves: asString(features.nice_to_haves),
      references: asString(features.references),
      launch_date: asString(features.launch_date),
      no_deadline: asBool(features.no_deadline, true),
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
  if (!answers.people.company_name.trim()) return 'Please enter your business name.'
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
