export const DOMAIN_TLDS = [
  { id: 'com', label: '.com' },
  { id: 'co.nz', label: '.co.nz' },
  { id: 'nz', label: '.nz' },
  { id: 'org.nz', label: '.org.nz' },
  { id: 'org', label: '.org' },
  { id: 'net', label: '.net' },
  { id: 'kiwi', label: '.kiwi' },
] as const

export type DomainTldId = (typeof DOMAIN_TLDS)[number]['id']
export type DomainTldPreference = DomainTldId | 'unsure'

export function compactDomainSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 60)
}

export function hyphenDomainSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 60)
}

export function recommendedDomains(companyName: string, preferredTld: DomainTldPreference = 'unsure') {
  const compact = compactDomainSlug(companyName)
  if (!compact) return []

  const hyphen = hyphenDomainSlug(companyName)
  const slugs = hyphen && hyphen !== compact ? [compact, hyphen] : [compact]
  const tlds = [...DOMAIN_TLDS]
  if (preferredTld !== 'unsure') {
    tlds.sort((a, b) => Number(b.id === preferredTld) - Number(a.id === preferredTld))
  }

  const seen = new Set<string>()
  const results: { domain: string; tld: DomainTldId; preferred: boolean }[] = []
  for (const tld of tlds) {
    for (const slug of slugs) {
      const domain = `${slug}${tld.label}`
      if (seen.has(domain)) continue
      seen.add(domain)
      results.push({ domain, tld: tld.id, preferred: preferredTld !== 'unsure' && tld.id === preferredTld })
    }
  }
  return results
}

export function tldLabel(id: DomainTldPreference) {
  if (id === 'unsure') return 'No preference'
  return DOMAIN_TLDS.find((item) => item.id === id)?.label ?? id
}
