export const OUTBOUND_LINK_KEYS = [
  'github',
  'supabase',
  'vercel',
  'slack',
  'stripe',
  'xero',
  'google_workspace',
  'google_drive',
  'cloudflare',
  'figma',
  'notion',
  'google_analytics',
  'linkedin',
  'facebook',
  'instagram',
  'youtube',
  'x',
] as const

export type OutboundLinkKey = (typeof OUTBOUND_LINK_KEYS)[number]

export interface OutboundLinkDef {
  key: OutboundLinkKey
  label: string
  placeholder: string
}

export interface OutboundLinkGroup {
  title: string
  keys: readonly OutboundLinkKey[]
}

export interface CustomOutboundLink {
  id: string
  label: string
  url: string
}

export interface VisibleOutboundLink {
  id: string
  label: string
  href: string
}

export const OUTBOUND_LINK_DEFS: Record<OutboundLinkKey, OutboundLinkDef> = {
  github: { key: 'github', label: 'GitHub', placeholder: 'https://github.com/orgs/...' },
  supabase: { key: 'supabase', label: 'Supabase', placeholder: 'https://supabase.com/dashboard/project/...' },
  vercel: { key: 'vercel', label: 'Vercel', placeholder: 'https://vercel.com/...' },
  slack: { key: 'slack', label: 'Slack', placeholder: 'https://app.slack.com/client/...' },
  stripe: { key: 'stripe', label: 'Stripe', placeholder: 'https://dashboard.stripe.com' },
  xero: { key: 'xero', label: 'Xero', placeholder: 'https://go.xero.com/...' },
  google_workspace: { key: 'google_workspace', label: 'Google Workspace', placeholder: 'https://admin.google.com' },
  google_drive: { key: 'google_drive', label: 'Google Drive', placeholder: 'https://drive.google.com/drive/...' },
  cloudflare: { key: 'cloudflare', label: 'Cloudflare', placeholder: 'https://dash.cloudflare.com' },
  figma: { key: 'figma', label: 'Figma', placeholder: 'https://www.figma.com/files/...' },
  notion: { key: 'notion', label: 'Notion', placeholder: 'https://www.notion.so/...' },
  google_analytics: { key: 'google_analytics', label: 'Google Analytics', placeholder: 'https://analytics.google.com' },
  linkedin: { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://www.linkedin.com/company/...' },
  facebook: { key: 'facebook', label: 'Facebook', placeholder: 'https://www.facebook.com/...' },
  instagram: { key: 'instagram', label: 'Instagram', placeholder: 'https://www.instagram.com/...' },
  youtube: { key: 'youtube', label: 'YouTube', placeholder: 'https://www.youtube.com/@...' },
  x: { key: 'x', label: 'X (Twitter)', placeholder: 'https://x.com/...' },
}

export const OUTBOUND_LINK_GROUPS: OutboundLinkGroup[] = [
  {
    title: 'Tools & platforms',
    keys: [
      'github',
      'supabase',
      'vercel',
      'slack',
      'stripe',
      'xero',
      'google_workspace',
      'google_drive',
      'cloudflare',
      'figma',
      'notion',
      'google_analytics',
    ],
  },
  {
    title: 'Social',
    keys: ['linkedin', 'facebook', 'instagram', 'youtube', 'x'],
  },
]

export function emptyOutboundLinkValues(): Record<OutboundLinkKey, string> {
  const values = {} as Record<OutboundLinkKey, string>
  for (const key of OUTBOUND_LINK_KEYS) {
    values[key] = ''
  }
  return values
}

export function parseOutboundLinkValues(
  raw: Record<string, unknown> | undefined
): Record<OutboundLinkKey, string> {
  const values = emptyOutboundLinkValues()
  if (!raw) return values
  for (const key of OUTBOUND_LINK_KEYS) {
    values[key] = String(raw[key] ?? '')
  }
  return values
}

export function parseCustomOutboundLinks(raw: unknown): CustomOutboundLink[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const id = String(row.id ?? '').trim() || `custom-${index}`
      return {
        id,
        label: String(row.label ?? ''),
        url: String(row.url ?? ''),
      }
    })
    .filter((item): item is CustomOutboundLink => item !== null)
}

export function normalizeExternalUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  try {
    const url = new URL(candidate)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

function hostnameLabel(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, '')
  } catch {
    return 'Link'
  }
}

export function getVisibleOutboundLinks(
  outbound: Record<string, unknown> | undefined,
  companyWebsite?: string
): VisibleOutboundLink[] {
  const values = parseOutboundLinkValues(outbound)
  const links: VisibleOutboundLink[] = []

  const companyHref = normalizeExternalUrl(companyWebsite ?? '')
  if (companyHref) {
    links.push({
      id: 'website',
      label: 'Website',
      href: companyHref,
    })
  }

  for (const key of OUTBOUND_LINK_KEYS) {
    const href = normalizeExternalUrl(values[key])
    if (!href) continue
    links.push({
      id: key,
      label: OUTBOUND_LINK_DEFS[key].label,
      href,
    })
  }

  for (const custom of parseCustomOutboundLinks(outbound?.custom)) {
    const href = normalizeExternalUrl(custom.url)
    if (!href) continue
    const label = custom.label.trim() || hostnameLabel(href)
    links.push({
      id: `custom-${custom.id}`,
      label,
      href,
    })
  }

  return links
}
