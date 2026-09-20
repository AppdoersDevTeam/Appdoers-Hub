'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { lockClientIntakeAction } from '@/lib/actions/intakes'
import {
  REGISTRARS,
  TONE_OPTIONS,
  moodById,
  paletteById,
  pairingById,
  resolvedColors,
  resolvedFonts,
} from '@/lib/intake/brand-options'
import { tldLabel } from '@/lib/intake/domain-suggestions'
import { MAINTENANCE_PAGES_NOTE, companyTypeLabel, selectedPageOutline } from '@/lib/intake/site-structures'
import { intakeProfile } from '@/lib/intake/profiles'
import { INTAKE_STATUS_LABELS, type IntakeAnswers, type IntakeStatus } from '@/lib/intake/types'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="hub-card space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-0.5 text-sm text-slate-700">{value || '—'}</div>
    </div>
  )
}

const STATUS_VARIANT: Record<IntakeStatus, 'blue' | 'success' | 'warning' | 'neutral'> = {
  sent: 'blue',
  submitted: 'success',
  updated: 'warning',
  locked: 'neutral',
}

export function ClientIntakeSection({
  clientId,
  intake,
  answers,
  logoUrl,
}: {
  clientId: string
  intake: {
    id: string
    status: IntakeStatus
    url: string
    submitted_at: string | null
    last_submitted_at: string | null
    locked_at: string | null
  } | null
  answers: IntakeAnswers | null
  logoUrl: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [confirmLock, setConfirmLock] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!intake) {
    return (
      <div className="hub-card">
        <h3 className="text-sm font-semibold text-slate-900">No intake yet</h3>
        <p className="mt-2 text-sm text-slate-500">
          Create an intake form from the header to send a unique link to this client.
        </p>
      </div>
    )
  }

  const colors = answers ? resolvedColors(answers) : null
  const fonts = answers ? resolvedFonts(answers) : null
  const palette = answers ? paletteById(answers.brand.palette_id) : null
  const pairing = answers ? pairingById(answers.brand.pairing_id) : null
  const mood = answers ? moodById(answers.brand.mood_id) : null
  const submitted = intake.status !== 'sent'
  const pageOutline = answers ? selectedPageOutline(answers.people.company_type, answers.content.pages) : []
  const profile = answers ? intakeProfile(answers.people.company_type) : null
  const featureLabels = answers
    ? (profile?.features.filter((f) => answers.features.items.includes(f.id)).map((f) => f.label) ?? answers.features.items)
    : []

  const lock = () => {
    setError(null)
    startTransition(async () => {
      const result = await lockClientIntakeAction(intake.id, clientId)
      setConfirmLock(false)
      if (!result.success) setError(result.error)
    })
  }

  return (
    <div className="space-y-6">
      <div className="hub-card flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Kickoff intake</h3>
            <Badge variant={STATUS_VARIANT[intake.status]}>{INTAKE_STATUS_LABELS[intake.status]}</Badge>
          </div>
          <p className="text-xs text-slate-500">
            {intake.last_submitted_at
              ? `Last submitted ${new Date(intake.last_submitted_at).toLocaleString()}`
              : 'Waiting for the client to submit'}
          </p>
        </div>
        {intake.status !== 'locked' && submitted && (
          <Button type="button" size="sm" variant="outline" onClick={() => setConfirmLock(true)}>
            Lock intake
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!submitted && (
        <div className="hub-card text-sm text-slate-600">
          The client has not submitted yet. Copy the intake link from the header and send it to them.
        </div>
      )}

      {submitted && answers && (
        <>
          <Section title="Brand">
            <div className="flex flex-wrap items-start gap-6">
              {logoUrl && (
                <img src={logoUrl} alt="Client logo" className="h-16 w-16 rounded-lg object-contain border border-slate-200 bg-white" />
              )}
              {colors && (
                <div className="flex h-12 overflow-hidden rounded-lg border border-slate-200">
                  {Object.entries(colors).map(([key, hex]) => (
                    <div key={key} className="w-10" style={{ background: hex }} title={`${key}: ${hex}`} />
                  ))}
                </div>
              )}
              <div className="space-y-1 text-sm">
                <p>
                  Colours: {answers.brand.color_mode === 'unsure' ? 'Appdoers to choose' : palette?.name ?? 'Custom'}
                </p>
                <p>
                  Fonts:{' '}
                  {fonts ? `${fonts.heading} / ${fonts.body}` : pairing?.name ?? 'Appdoers to choose'}
                </p>
                <p>Mood: {mood?.name ?? 'Appdoers to choose'}</p>
                <p>Logo: {answers.brand.logo_name || answers.brand.logo_mode.replaceAll('_', ' ')}</p>
              </div>
            </div>
            {answers.brand.sites_i_like && (
              <Row label="Sites they like" value={answers.brand.sites_i_like} />
            )}
          </Section>

          <Section title="People & organisation">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Row label="Name" value={answers.people.company_name} />
              <Row label="Industry" value={companyTypeLabel(answers.people.company_type)} />
              <Row label="Location" value={answers.people.location} />
              <Row label="What they do" value={answers.people.what_we_do} />
              <Row label="Audience" value={answers.people.audience} />
              <Row
                label="Primary contact"
                value={`${answers.people.primary.name} · ${answers.people.primary.email}${answers.people.primary.phone ? ` · ${answers.people.primary.phone}` : ''}`}
              />
              <Row label="Preferred contact" value={answers.people.preferred_contact} />
              <Row label="Denomination" value={answers.people.profile.denomination} />
              <Row label="Attendance" value={answers.people.profile.congregation_size} />
              <Row label="Service times" value={answers.people.profile.service_times} />
              <Row label="Organisation kind" value={answers.people.profile.organisation_kind} />
              <Row label="Community size" value={answers.people.profile.community_size} />
              <Row label="Products" value={answers.people.profile.product_types} />
              <Row label="Selling online" value={answers.people.profile.sell_online} />
              <Row label="Trade" value={answers.people.profile.trade_type} />
              <Row label="Years operating" value={answers.people.profile.years_operating} />
              <Row label="YouTube" value={answers.people.profile.youtube_url} />
              <Row label="Email mailboxes" value={answers.people.profile.mailbox_count} />
            </div>
            <Link href={`/app/clients/${clientId}?tab=overview`} className="text-xs font-medium text-blue-600">
              View contacts on Overview
            </Link>
          </Section>

          <Section title="Domain & current site">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Row
                label="Domain status"
                value={
                  answers.domain.status === 'own'
                    ? 'Already owns a domain'
                    : answers.domain.status === 'buy'
                      ? 'Needs a domain purchased'
                      : 'Not sure'
                }
              />
              <Row label="Domain" value={answers.domain.domain_name} />
              <Row
                label="Preferred ending"
                value={tldLabel(answers.domain.tld_preference)}
              />
              <Row
                label="Current site"
                value={answers.domain.has_current_site === 'yes' ? answers.domain.current_site : 'None'}
              />
              <Row
                label="Registrar"
                value={
                  answers.domain.registrar === 'other'
                    ? answers.domain.registrar_other
                    : REGISTRARS.find((r) => r.id === answers.domain.registrar)?.label
                }
              />
            </div>
            <Link href={`/app/clients/${clientId}?tab=domains`} className="text-xs font-medium text-blue-600">
              Open Domains
            </Link>
          </Section>

          <Section title="Content & voice">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Row label="Tagline" value={answers.content.tagline} />
              <Row label="Tone" value={TONE_OPTIONS.find((t) => t.id === answers.content.tone)?.label} />
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-500">Pages needed</p>
                {pageOutline.length > 0 ? (
                  <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
                    {pageOutline.map((page) => (
                      <li key={page.id} style={{ paddingLeft: page.depth * 16 }}>
                        {page.label}
                        {page.optional ? ' (Optional)' : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-0.5 text-sm text-slate-700">—</p>
                )}
                {answers.content.custom_pages ? (
                  <p className="mt-2 text-sm text-slate-700">Other: {answers.content.custom_pages}</p>
                ) : null}
                <p className="mt-2 text-xs text-slate-500">{MAINTENANCE_PAGES_NOTE}</p>
              </div>
              <Row
                label="Copy"
                value={
                  answers.content.copy_source === 'client'
                    ? 'Client will provide'
                    : answers.content.copy_source === 'appdoers'
                      ? 'Appdoers to write'
                      : answers.content.copy_source === 'mix'
                        ? 'Mix'
                        : 'Not sure'
                }
              />
            </div>
          </Section>

          <Section title="Plan, tools & references">
            <Row
              label="Plan interest"
              value={
                answers.features.plan_interest === 'full'
                  ? 'Full Website'
                  : answers.features.plan_interest === 'basic'
                    ? 'Basic Website'
                    : 'Not sure'
              }
            />
            <Row label="Requested tools" value={featureLabels.join(', ')} />
            <Row label="Must-haves" value={answers.features.must_haves} />
            <Row label="Nice-to-haves" value={answers.features.nice_to_haves} />
            <Row label="References" value={answers.features.references} />
            <Row
              label="Launch"
              value={answers.features.no_deadline ? 'No deadline' : answers.features.launch_date}
            />
          </Section>

          <Section title="Access">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Row label="Hosting" value={answers.access.hosting} />
              <Row label="Domain login" value={answers.access.domain_login} />
              <Row label="Instagram" value={answers.access.socials.instagram} />
              <Row label="Facebook" value={answers.access.socials.facebook} />
              <Row label="LinkedIn" value={answers.access.socials.linkedin} />
              <Row label="Google Business" value={answers.access.google_business} />
              <Row label="Analytics" value={answers.access.analytics} />
              <Row label="Notes" value={answers.access.notes} />
            </div>
          </Section>
        </>
      )}

      <ConfirmModal
        open={confirmLock}
        title="Lock this intake?"
        message="The client will no longer be able to edit the form. You can create a new link later if needed."
        confirmLabel="Lock intake"
        danger={false}
        isPending={isPending}
        onConfirm={lock}
        onCancel={() => setConfirmLock(false)}
      />
    </div>
  )
}
