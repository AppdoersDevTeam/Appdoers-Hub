import type { IntakeAnswers } from './types'
import { moodById, paletteById, pairingById, resolvedColors, resolvedFonts } from './brand-options'
import type { ClientBrandKit } from '@/lib/types/database'
import { createAdminClient } from '@/lib/supabase/server'

type ServiceClient = NonNullable<ReturnType<typeof createAdminClient>>

function normalizeDomain(value: string) {
  return value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .toLowerCase()
}

function websiteUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function registrarLabel(id: string, other: string) {
  const labels: Record<string, string> = {
    crazy_domains: 'Crazy Domains',
    godaddy: 'GoDaddy',
    google: 'Google Domains / Squarespace',
    cloudflare: 'Cloudflare',
    namecheap: 'Namecheap',
    other: other.trim() || 'Other',
    unsure: '',
  }
  return labels[id] || other.trim() || null
}

async function upsertContact(
  service: ServiceClient,
  clientId: string,
  contact: { name: string; email: string; phone: string; role: string },
  isPrimary: boolean
) {
  const email = contact.email.trim().toLowerCase()
  const name = contact.name.trim()
  if (!email || !name) return

  const { data: existing } = await service
    .from('client_contacts')
    .select('id')
    .eq('client_id', clientId)
    .ilike('email', email)
    .maybeSingle()

  if (isPrimary) {
    await service
      .from('client_contacts')
      .update({ is_primary: false })
      .eq('client_id', clientId)
      .eq('is_primary', true)
  }

  if (existing?.id) {
    await service
      .from('client_contacts')
      .update({
        full_name: name,
        email,
        phone: contact.phone.trim() || null,
        role: contact.role.trim() || null,
        is_primary: isPrimary,
      })
      .eq('id', existing.id)
    return
  }

  await service.from('client_contacts').insert({
    client_id: clientId,
    full_name: name,
    email,
    phone: contact.phone.trim() || null,
    role: contact.role.trim() || null,
    is_primary: isPrimary,
    has_portal_access: false,
  })
}

async function upsertDomain(service: ServiceClient, clientId: string, answers: IntakeAnswers) {
  const domainName = normalizeDomain(answers.domain.domain_name)
  if (!domainName) return

  const registrar = registrarLabel(answers.domain.registrar, answers.domain.registrar_other)
  const hosting =
    answers.access.hosting === 'appdoers'
      ? 'Appdoers'
      : answers.access.hosting === 'have'
        ? 'Client-managed'
        : null
  const notes = [
    answers.domain.status === 'buy' ? 'Client needs a domain purchased.' : null,
    answers.domain.status === 'own' ? 'Client already owns this domain.' : null,
    answers.domain.status === 'unsure' ? 'Domain ownership not confirmed.' : null,
    answers.access.domain_login === 'later' ? 'Domain login to be sent later.' : null,
    answers.access.domain_login === 'appdoers' ? 'Appdoers to manage domain login.' : null,
  ]
    .filter(Boolean)
    .join(' ')

  const { data: existing } = await service
    .from('client_domains')
    .select('id')
    .eq('client_id', clientId)
    .ilike('domain_name', domainName)
    .maybeSingle()

  const payload = {
    domain_name: domainName,
    registrar,
    hosting_provider: hosting,
    dns_notes: notes || null,
  }

  if (existing?.id) {
    await service.from('client_domains').update(payload).eq('id', existing.id)
    return
  }

  await service.from('client_domains').insert({
    client_id: clientId,
    ...payload,
    ssl_status: 'none',
    tech_stack: [],
  })
}

async function upsertCredential(
  service: ServiceClient,
  clientId: string,
  platform: string,
  username: string,
  password: string,
  url?: string | null,
  notes?: string | null
) {
  const user = username.trim()
  const pass = password.trim()
  if (!user && !pass) return

  const { data: existing } = await service
    .from('client_credentials')
    .select('id')
    .eq('client_id', clientId)
    .ilike('platform', platform)
    .maybeSingle()

  const payload = {
    platform,
    username: user || null,
    password_encrypted: pass || null,
    url: url || null,
    notes: notes || null,
  }

  if (existing?.id) {
    await service.from('client_credentials').update(payload).eq('id', existing.id)
    return
  }

  await service.from('client_credentials').insert({
    client_id: clientId,
    ...payload,
  })
}

function buildBrandKit(answers: IntakeAnswers): ClientBrandKit {
  const colors = resolvedColors(answers)
  const fonts = resolvedFonts(answers)
  const mood = moodById(answers.brand.mood_id)
  const palette = paletteById(answers.brand.palette_id)
  const pairing = pairingById(answers.brand.pairing_id)

  return {
    logo_path: answers.brand.logo_path,
    color_mode: answers.brand.color_mode,
    palette_id: answers.brand.color_mode === 'palette' ? palette?.id ?? answers.brand.palette_id : null,
    colors: colors ?? undefined,
    font_mode: answers.brand.font_mode,
    pairing_id: answers.brand.font_mode === 'pairing' ? pairing?.id ?? answers.brand.pairing_id : null,
    heading_font: fonts?.heading ?? null,
    body_font: fonts?.body ?? null,
    mood_id: mood?.id ?? (answers.brand.mood_id === 'unsure' ? 'unsure' : answers.brand.mood_id),
  }
}

export async function applyIntakeToClient(clientId: string, answers: IntakeAnswers) {
  const service = createAdminClient()
  if (!service) throw new Error('Service client is not configured')

  const companyName = answers.people.company_name.trim()
  const website =
    answers.domain.has_current_site === 'yes'
      ? websiteUrl(answers.domain.current_site)
      : websiteUrl(answers.domain.domain_name)
  const industry = answers.people.what_we_do.trim().slice(0, 120) || null
  const brandKit = buildBrandKit(answers)

  await service
    .from('clients')
    .update({
      company_name: companyName || undefined,
      website,
      location: answers.people.location.trim() || null,
      industry,
      logo_url: answers.brand.logo_path,
      brand_kit: brandKit,
    })
    .eq('id', clientId)

  await upsertContact(service, clientId, answers.people.primary, true)
  for (const extra of answers.people.extras) {
    await upsertContact(service, clientId, extra, false)
  }

  await upsertDomain(service, clientId, answers)

  const registrarName = registrarLabel(answers.domain.registrar, answers.domain.registrar_other)
  await upsertCredential(
    service,
    clientId,
    registrarName ? `${registrarName} (domain)` : 'Domain registrar',
    answers.access.registrar_username,
    answers.access.registrar_password,
    websiteUrl(answers.domain.domain_name)
  )
  await upsertCredential(
    service,
    clientId,
    'Hosting',
    answers.access.hosting_username,
    answers.access.hosting_password
  )

  const socialNotes = [
    answers.access.socials.instagram && `Instagram: ${answers.access.socials.instagram}`,
    answers.access.socials.facebook && `Facebook: ${answers.access.socials.facebook}`,
    answers.access.socials.linkedin && `LinkedIn: ${answers.access.socials.linkedin}`,
    answers.access.socials.other && `Other: ${answers.access.socials.other}`,
  ]
    .filter(Boolean)
    .join('\n')

  if (socialNotes) {
    await upsertCredential(
      service,
      clientId,
      'Social accounts',
      '',
      '',
      null,
      socialNotes
    )
  }

  if (answers.access.google_business.trim() || answers.access.analytics.trim()) {
    await upsertCredential(
      service,
      clientId,
      'Google / Analytics',
      answers.access.google_business.trim() || answers.access.analytics.trim(),
      '',
      null,
      [
        answers.access.google_business && `Google Business: ${answers.access.google_business}`,
        answers.access.analytics && `Analytics: ${answers.access.analytics}`,
      ]
        .filter(Boolean)
        .join('\n')
    )
  }

  if (answers.brand.logo_path) {
    const { data: existingFile } = await service
      .from('files')
      .select('id')
      .eq('client_id', clientId)
      .eq('storage_path', answers.brand.logo_path)
      .maybeSingle()

    if (!existingFile) {
      await service.from('files').insert({
        client_id: clientId,
        name: answers.brand.logo_name || 'Logo',
        storage_path: answers.brand.logo_path,
        folder: 'assets',
        is_client_visible: false,
      })
    }
  }
}
