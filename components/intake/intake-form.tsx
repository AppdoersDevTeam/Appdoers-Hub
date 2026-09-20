'use client'

import { useMemo, useState } from 'react'
import { AppdoersLogo } from '@/components/brand/appdoers-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CONTACT_ROLES,
  REGISTRARS,
  TONE_OPTIONS,
} from '@/lib/intake/brand-options'
import { isIndustryId } from '@/lib/industries'
import { DOMAIN_TLDS, recommendedDomains } from '@/lib/intake/domain-suggestions'
import { defaultFeatureIds, intakeProfile, type PlanInterest } from '@/lib/intake/profiles'
import {
  COMPANY_TYPES,
  defaultPageIds,
  defaultTldForIndustry,
  toggleSitePage,
} from '@/lib/intake/site-structures'
import { emptyIntakeContact, type IntakeAnswers, type IntakeContact } from '@/lib/intake/types'
import { ChoiceChip, FontPicker, MoodPicker, PalettePicker, ToggleChip } from './brand-pickers'
import { IndustryDetailsFields } from './industry-details-fields'
import { SiteStructurePicker } from './site-structure-picker'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <select className="hub-input" value={value} onChange={(e) => onChange(e.target.value)}>
      {children}
    </select>
  )
}

function TextArea({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <textarea
      className="hub-input min-h-[88px]"
      rows={3}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function ContactFields({
  contact,
  onChange,
  roles,
}: {
  contact: IntakeContact
  onChange: (next: IntakeContact) => void
  roles: string[]
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="Name">
        <Input value={contact.name} onChange={(e) => onChange({ ...contact, name: e.target.value })} />
      </Field>
      <Field label="Role">
        <Select value={contact.role} onChange={(role) => onChange({ ...contact, role })}>
          <option value="">Select…</option>
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Email">
        <Input type="email" value={contact.email} onChange={(e) => onChange({ ...contact, email: e.target.value })} />
      </Field>
      <Field label="Phone">
        <Input value={contact.phone} onChange={(e) => onChange({ ...contact, phone: e.target.value })} />
      </Field>
    </div>
  )
}

export function IntakeForm({
  token,
  initialAnswers,
  alreadySubmitted,
}: {
  token: string
  initialAnswers: IntakeAnswers
  alreadySubmitted: boolean
}) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState(initialAnswers)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const profile = intakeProfile(answers.people.company_type)
  const contactRoles = profile?.contactRoles ?? CONTACT_ROLES
  const steps = [
    { title: profile?.peopleTitle ?? 'People & organisation', hint: profile?.peopleHint ?? 'Who you are and how we reach you' },
    { title: 'Domain & current site', hint: 'Where the website will live' },
    { title: 'Brand visuals', hint: 'Logo, colours, fonts, and style' },
    { title: 'Content & voice', hint: 'Pages, tone, and copy' },
    { title: 'Plan, tools & references', hint: 'Basic or Full Website, and what you need' },
    { title: 'Access & accounts', hint: 'Logins, email, and profiles we may need' },
  ] as const
  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step, steps.length])
  const domainSuggestions = useMemo(
    () => recommendedDomains(answers.people.company_name, answers.domain.tld_preference),
    [answers.people.company_name, answers.domain.tld_preference]
  )

  async function uploadLogo(file: File) {
    setUploadingLogo(true)
    setError(null)
    try {
      const prepareRes = await fetch(`/api/intake/${token}/logo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'prepare',
          file_name: file.name,
          mime_type: file.type,
          file_size: file.size,
        }),
      })
      const prepareJson = await prepareRes.json()
      if (!prepareRes.ok) throw new Error(prepareJson.error || 'Could not start upload')

      const uploadRes = await fetch(String(prepareJson.signedUrl), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${String(prepareJson.token)}`,
          'Content-Type': file.type || 'application/octet-stream',
          'x-upsert': 'false',
        },
        body: file,
      })
      if (!uploadRes.ok) throw new Error('Logo upload failed')

      const completeRes = await fetch(`/api/intake/${token}/logo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'complete',
          storage_path: prepareJson.path,
          file_name: file.name,
        }),
      })
      const completeJson = await completeRes.json()
      if (!completeRes.ok) throw new Error(completeJson.error || 'Could not save logo')

      setAnswers((current) => ({
        ...current,
        brand: {
          ...current.brand,
          logo_mode: 'upload',
          logo_path: completeJson.storage_path,
          logo_name: completeJson.file_name,
        },
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setUploadingLogo(false)
    }
  }

  async function submit() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/intake/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not submit')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <AppdoersLogo variant="full" className="mx-auto" />
        <h1 className="mt-6 text-2xl font-semibold text-slate-900">Thank you</h1>
        <p className="mt-2 text-sm text-slate-600">
          We have your kickoff details. The Appdoers team has been notified and will use this to start your project.
        </p>
        <Button className="mt-6" variant="outline" onClick={() => setDone(false)}>
          Edit my answers
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <AppdoersLogo variant="full" />
        <p className="text-xs text-slate-500">
          Step {step + 1} of {steps.length}
        </p>
      </div>
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{steps[step].title}</h1>
        <p className="mt-1 text-sm text-slate-500">{steps[step].hint}</p>
        {alreadySubmitted && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            You already submitted this form. You can update your answers until Appdoers locks it.
          </p>
        )}
      </div>

      <div className="hub-card space-y-6">
        {step === 0 && (
          <>
            <Field label={profile?.nameLabel ?? 'Organisation name'}>
              <Input
                value={answers.people.company_name}
                onChange={(e) =>
                  setAnswers({ ...answers, people: { ...answers.people, company_name: e.target.value } })
                }
              />
            </Field>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">I am a…</p>
              {profile && <p className="mb-3 text-sm text-slate-600">{profile.intro}</p>}
              <div className="flex flex-wrap gap-2">
                {COMPANY_TYPES.map((type) => (
                  <ChoiceChip
                    key={type.id}
                    selected={answers.people.company_type === type.id}
                    onClick={() =>
                      setAnswers({
                        ...answers,
                        people: { ...answers.people, company_type: type.id },
                        content: { ...answers.content, pages: defaultPageIds(type.id) },
                        features: {
                          ...answers.features,
                          items: defaultFeatureIds(type.id, answers.features.plan_interest),
                        },
                        domain: {
                          ...answers.domain,
                          tld_preference:
                            answers.domain.tld_preference === 'unsure'
                              ? defaultTldForIndustry(type.id)
                              : answers.domain.tld_preference,
                        },
                      })
                    }
                  >
                    {type.label}
                  </ChoiceChip>
                ))}
              </div>
            </div>
            {isIndustryId(answers.people.company_type) && (
              <IndustryDetailsFields
                industry={answers.people.company_type}
                profile={answers.people.profile}
                onChange={(nextProfile) =>
                  setAnswers({ ...answers, people: { ...answers.people, profile: nextProfile } })
                }
              />
            )}
            <Field label={profile?.whatWeDoLabel ?? 'What do you do?'}>
              <TextArea
                value={answers.people.what_we_do}
                onChange={(what_we_do) => setAnswers({ ...answers, people: { ...answers.people, what_we_do } })}
                placeholder={profile?.whatWeDoPlaceholder ?? 'A sentence or two is perfect.'}
              />
            </Field>
            <Field label={profile?.audienceLabel ?? 'Who is it for?'}>
              <TextArea
                value={answers.people.audience}
                onChange={(audience) => setAnswers({ ...answers, people: { ...answers.people, audience } })}
                placeholder={profile?.audiencePlaceholder}
              />
            </Field>
            <Field label={profile?.locationLabel ?? 'Location / service area'}>
              <Input
                value={answers.people.location}
                onChange={(e) =>
                  setAnswers({ ...answers, people: { ...answers.people, location: e.target.value } })
                }
              />
            </Field>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Preferred contact method</p>
              <div className="flex flex-wrap gap-2">
                {(['email', 'phone', 'both'] as const).map((method) => (
                  <ChoiceChip
                    key={method}
                    selected={answers.people.preferred_contact === method}
                    onClick={() =>
                      setAnswers({ ...answers, people: { ...answers.people, preferred_contact: method } })
                    }
                  >
                    {method === 'both' ? 'Email and phone' : method[0].toUpperCase() + method.slice(1)}
                  </ChoiceChip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-medium text-slate-900">Primary contact</p>
              <ContactFields
                contact={answers.people.primary}
                roles={contactRoles}
                onChange={(primary) => setAnswers({ ...answers, people: { ...answers.people, primary } })}
              />
            </div>
            {answers.people.extras.map((extra, index) => (
              <div key={index} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-900">Extra contact {index + 1}</p>
                  <button
                    type="button"
                    className="text-xs text-slate-500 hover:text-red-600"
                    onClick={() =>
                      setAnswers({
                        ...answers,
                        people: { ...answers.people, extras: answers.people.extras.filter((_, i) => i !== index) },
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
                <ContactFields
                  contact={extra}
                  roles={contactRoles}
                  onChange={(next) =>
                    setAnswers({
                      ...answers,
                      people: {
                        ...answers.people,
                        extras: answers.people.extras.map((item, i) => (i === index ? next : item)),
                      },
                    })
                  }
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setAnswers({
                  ...answers,
                  people: { ...answers.people, extras: [...answers.people.extras, emptyIntakeContact()] },
                })
              }
            >
              Add another contact
            </Button>
          </>
        )}

        {step === 1 && (
          <>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Domain</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['own', 'We already own a domain'],
                    ['buy', 'We need to buy one'],
                    ['unsure', 'Not sure'],
                  ] as const
                ).map(([id, label]) => (
                  <ChoiceChip
                    key={id}
                    selected={answers.domain.status === id}
                    onClick={() => setAnswers({ ...answers, domain: { ...answers.domain, status: id } })}
                  >
                    {label}
                  </ChoiceChip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Preferred domain ending</p>
              <div className="flex flex-wrap gap-2">
                {DOMAIN_TLDS.map((tld) => (
                  <ChoiceChip
                    key={tld.id}
                    selected={answers.domain.tld_preference === tld.id}
                    onClick={() =>
                      setAnswers({ ...answers, domain: { ...answers.domain, tld_preference: tld.id } })
                    }
                  >
                    {tld.label}
                  </ChoiceChip>
                ))}
                <ChoiceChip
                  selected={answers.domain.tld_preference === 'unsure'}
                  onClick={() =>
                    setAnswers({ ...answers, domain: { ...answers.domain, tld_preference: 'unsure' } })
                  }
                >
                  No preference
                </ChoiceChip>
              </div>
            </div>
            {domainSuggestions.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Recommended domain names
                </p>
                <div className="flex flex-wrap gap-2">
                  {domainSuggestions.map((item) => (
                    <ChoiceChip
                      key={item.domain}
                      selected={answers.domain.domain_name.toLowerCase() === item.domain}
                      onClick={() =>
                        setAnswers({
                          ...answers,
                          domain: {
                            ...answers.domain,
                            domain_name: item.domain,
                            tld_preference: item.tld,
                            status: answers.domain.status === 'own' ? 'own' : 'buy',
                          },
                        })
                      }
                    >
                      {item.domain}
                    </ChoiceChip>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Enter a business name on the previous step to see recommended domain names.
              </p>
            )}
            <Field label="Domain name">
              <Input
                placeholder="example.co.nz"
                value={answers.domain.domain_name}
                onChange={(e) =>
                  setAnswers({ ...answers, domain: { ...answers.domain, domain_name: e.target.value } })
                }
              />
            </Field>
            <p className="text-xs text-slate-500">Domain names are subject to availability.</p>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Current website</p>
              <div className="mb-3 flex flex-wrap gap-2">
                <ChoiceChip
                  selected={answers.domain.has_current_site === 'yes'}
                  onClick={() => setAnswers({ ...answers, domain: { ...answers.domain, has_current_site: 'yes' } })}
                >
                  We have one
                </ChoiceChip>
                <ChoiceChip
                  selected={answers.domain.has_current_site === 'none'}
                  onClick={() => setAnswers({ ...answers, domain: { ...answers.domain, has_current_site: 'none' } })}
                >
                  No current site
                </ChoiceChip>
              </div>
              {answers.domain.has_current_site === 'yes' && (
                <Input
                  placeholder="https://"
                  value={answers.domain.current_site}
                  onChange={(e) =>
                    setAnswers({ ...answers, domain: { ...answers.domain, current_site: e.target.value } })
                  }
                />
              )}
            </div>
            <Field label="Registrar">
              <Select
                value={answers.domain.registrar}
                onChange={(registrar) => setAnswers({ ...answers, domain: { ...answers.domain, registrar } })}
              >
                {REGISTRARS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
            {answers.domain.registrar === 'other' && (
              <Field label="Registrar name">
                <Input
                  value={answers.domain.registrar_other}
                  onChange={(e) =>
                    setAnswers({ ...answers, domain: { ...answers.domain, registrar_other: e.target.value } })
                  }
                />
              </Field>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Logo</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['upload', 'I have a logo to upload'],
                    ['need_designed', "We'll supply a logo later"],
                    ['text_logo', 'Text / wordmark is fine'],
                    ['unsure', 'Not sure yet'],
                  ] as const
                ).map(([id, label]) => (
                  <ChoiceChip
                    key={id}
                    selected={answers.brand.logo_mode === id}
                    onClick={() => setAnswers({ ...answers, brand: { ...answers.brand, logo_mode: id } })}
                  >
                    {label}
                  </ChoiceChip>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Appdoers does not design logos. Please upload one or send it later, ready to use.
              </p>
              {answers.brand.logo_mode === 'upload' && (
                <div className="mt-3">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    disabled={uploadingLogo}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void uploadLogo(file)
                    }}
                  />
                  {uploadingLogo && <p className="mt-2 text-xs text-slate-500">Uploading…</p>}
                  {answers.brand.logo_name && (
                    <p className="mt-2 text-xs text-emerald-700">Saved: {answers.brand.logo_name}</p>
                  )}
                </div>
              )}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-900">Colours</p>
              <PalettePicker answers={answers} onChange={setAnswers} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-900">Fonts</p>
              <FontPicker answers={answers} onChange={setAnswers} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-900">Style mood</p>
              <MoodPicker answers={answers} onChange={setAnswers} />
            </div>
            <Field label="Sites whose look you like (optional)">
              <TextArea
                value={answers.brand.sites_i_like}
                onChange={(sites_i_like) => setAnswers({ ...answers, brand: { ...answers.brand, sites_i_like } })}
                placeholder="Paste a few URLs"
              />
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <Field label="Tagline / one-liner (optional)">
              <Input
                value={answers.content.tagline}
                onChange={(e) =>
                  setAnswers({ ...answers, content: { ...answers.content, tagline: e.target.value } })
                }
              />
            </Field>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Tone</p>
              <div className="flex flex-wrap gap-2">
                {TONE_OPTIONS.map((tone) => (
                  <ChoiceChip
                    key={tone.id}
                    selected={answers.content.tone === tone.id}
                    onClick={() =>
                      setAnswers({
                        ...answers,
                        content: { ...answers.content, tone: tone.id as IntakeAnswers['content']['tone'] },
                      })
                    }
                  >
                    {tone.label}
                  </ChoiceChip>
                ))}
              </div>
            </div>
            <div>
              {isIndustryId(answers.people.company_type) ? (
                <SiteStructurePicker
                  companyType={answers.people.company_type}
                  selected={answers.content.pages}
                  onToggle={(pageId) => {
                    const companyType = answers.people.company_type
                    if (!isIndustryId(companyType)) return
                    setAnswers({
                      ...answers,
                      content: {
                        ...answers.content,
                        pages: toggleSitePage(companyType, answers.content.pages, pageId),
                      },
                    })
                  }}
                />
              ) : (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Choose Churches, Businesses, Schools & nonprofits, Shops & retail, or Trades & services in the first step to see a suggested site structure.
                </p>
              )}
            </div>
            <Field label="Other pages">
              <Input
                value={answers.content.custom_pages}
                onChange={(e) =>
                  setAnswers({ ...answers, content: { ...answers.content, custom_pages: e.target.value } })
                }
              />
            </Field>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Website copy</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['client', 'We will provide the words'],
                    ['appdoers', 'Please write it'],
                    ['mix', 'A mix'],
                    ['unsure', 'Not sure'],
                  ] as const
                ).map(([id, label]) => (
                  <ChoiceChip
                    key={id}
                    selected={answers.content.copy_source === id}
                    onClick={() => setAnswers({ ...answers, content: { ...answers.content, copy_source: id } })}
                  >
                    {label}
                  </ChoiceChip>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Website plan</p>
              <p className="mb-3 text-sm text-slate-600">
                Appdoers has two website plans. Basic is a public site we update on request. Full adds member tools, admin, and extras like giving, shops, or bookings.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ['basic', 'Basic Website', profile?.basicSummary ?? 'A simple public site.'],
                    ['full', 'Full Website', profile?.fullSummary ?? 'Member tools and admin features.'],
                    ['unsure', 'Not sure yet', 'Appdoers can recommend Basic or Full after this intake.'],
                  ] as const
                ).map(([id, label, hint]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      const plan = id as PlanInterest
                      const industry = answers.people.company_type
                      setAnswers({
                        ...answers,
                        features: {
                          ...answers.features,
                          plan_interest: plan,
                          items: isIndustryId(industry) ? defaultFeatureIds(industry, plan) : answers.features.items,
                        },
                      })
                    }}
                    className={`rounded-xl border p-3 text-left text-sm ${
                      answers.features.plan_interest === id
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <p className="font-medium">{label}</p>
                    <p className="mt-1 text-xs text-slate-500">{hint}</p>
                  </button>
                ))}
              </div>
            </div>
            {profile && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Tools for your site</p>
                <div className="flex flex-wrap gap-2">
                  {profile.features.map((feature) => (
                    <ToggleChip
                      key={feature.id}
                      selected={answers.features.items.includes(feature.id)}
                      onClick={() => {
                        const items = answers.features.items.includes(feature.id)
                          ? answers.features.items.filter((id) => id !== feature.id)
                          : [...answers.features.items, feature.id]
                        setAnswers({ ...answers, features: { ...answers.features, items } })
                      }}
                    >
                      {feature.label}
                      {feature.plan === 'full' ? ' · Full' : ''}
                    </ToggleChip>
                  ))}
                </div>
              </div>
            )}
            <Field label="Must-haves">
              <TextArea
                value={answers.features.must_haves}
                onChange={(must_haves) => setAnswers({ ...answers, features: { ...answers.features, must_haves } })}
              />
            </Field>
            <Field label="Nice-to-haves">
              <TextArea
                value={answers.features.nice_to_haves}
                onChange={(nice_to_haves) =>
                  setAnswers({ ...answers, features: { ...answers.features, nice_to_haves } })
                }
              />
            </Field>
            <Field label="Reference websites">
              <TextArea
                value={answers.features.references}
                onChange={(references) => setAnswers({ ...answers, features: { ...answers.features, references } })}
              />
            </Field>
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={answers.features.no_deadline}
                  onChange={(e) =>
                    setAnswers({ ...answers, features: { ...answers.features, no_deadline: e.target.checked } })
                  }
                />
                No deadline
              </label>
              {!answers.features.no_deadline && (
                <Field label="Launch date">
                  <Input
                    type="date"
                    value={answers.features.launch_date}
                    onChange={(e) =>
                      setAnswers({ ...answers, features: { ...answers.features, launch_date: e.target.value } })
                    }
                  />
                </Field>
              )}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Hosting</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['have', 'We already have hosting'],
                    ['appdoers', 'Appdoers can handle it'],
                    ['unsure', 'Not sure'],
                  ] as const
                ).map(([id, label]) => (
                  <ChoiceChip
                    key={id}
                    selected={answers.access.hosting === id}
                    onClick={() => setAnswers({ ...answers, access: { ...answers.access, hosting: id } })}
                  >
                    {label}
                  </ChoiceChip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Domain login</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['have', 'I can share login details'],
                    ['later', 'I will send later'],
                    ['appdoers', 'Appdoers to manage'],
                  ] as const
                ).map(([id, label]) => (
                  <ChoiceChip
                    key={id}
                    selected={answers.access.domain_login === id}
                    onClick={() => setAnswers({ ...answers, access: { ...answers.access, domain_login: id } })}
                  >
                    {label}
                  </ChoiceChip>
                ))}
              </div>
            </div>
            {answers.access.domain_login === 'have' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Registrar username">
                  <Input
                    value={answers.access.registrar_username}
                    onChange={(e) =>
                      setAnswers({ ...answers, access: { ...answers.access, registrar_username: e.target.value } })
                    }
                  />
                </Field>
                <Field label="Registrar password">
                  <Input
                    type="password"
                    value={answers.access.registrar_password}
                    onChange={(e) =>
                      setAnswers({ ...answers, access: { ...answers.access, registrar_password: e.target.value } })
                    }
                  />
                </Field>
              </div>
            )}
            {answers.access.hosting === 'have' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Hosting username">
                  <Input
                    value={answers.access.hosting_username}
                    onChange={(e) =>
                      setAnswers({ ...answers, access: { ...answers.access, hosting_username: e.target.value } })
                    }
                  />
                </Field>
                <Field label="Hosting password">
                  <Input
                    type="password"
                    value={answers.access.hosting_password}
                    onChange={(e) =>
                      setAnswers({ ...answers, access: { ...answers.access, hosting_password: e.target.value } })
                    }
                  />
                </Field>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Instagram">
                <Input
                  value={answers.access.socials.instagram}
                  onChange={(e) =>
                    setAnswers({
                      ...answers,
                      access: { ...answers.access, socials: { ...answers.access.socials, instagram: e.target.value } },
                    })
                  }
                />
              </Field>
              <Field label="Facebook">
                <Input
                  value={answers.access.socials.facebook}
                  onChange={(e) =>
                    setAnswers({
                      ...answers,
                      access: { ...answers.access, socials: { ...answers.access.socials, facebook: e.target.value } },
                    })
                  }
                />
              </Field>
              <Field label="LinkedIn">
                <Input
                  value={answers.access.socials.linkedin}
                  onChange={(e) =>
                    setAnswers({
                      ...answers,
                      access: { ...answers.access, socials: { ...answers.access.socials, linkedin: e.target.value } },
                    })
                  }
                />
              </Field>
              <Field label="Other social">
                <Input
                  value={answers.access.socials.other}
                  onChange={(e) =>
                    setAnswers({
                      ...answers,
                      access: { ...answers.access, socials: { ...answers.access.socials, other: e.target.value } },
                    })
                  }
                />
              </Field>
            </div>
            <Field label="Google Business (URL or notes)">
              <Input
                value={answers.access.google_business}
                onChange={(e) =>
                  setAnswers({ ...answers, access: { ...answers.access, google_business: e.target.value } })
                }
              />
            </Field>
            <Field label="Analytics / Search Console">
              <Input
                value={answers.access.analytics}
                onChange={(e) =>
                  setAnswers({ ...answers, access: { ...answers.access, analytics: e.target.value } })
                }
              />
            </Field>
            <Field label="How many people need business email?">
              <Input
                value={answers.people.profile.mailbox_count}
                onChange={(e) =>
                  setAnswers({
                    ...answers,
                    people: {
                      ...answers.people,
                      profile: { ...answers.people.profile, mailbox_count: e.target.value },
                    },
                  })
                }
                placeholder="Plans include up to 5 on a 4-year website. Extra mailboxes can be added."
              />
            </Field>
            <Field label="Anything else">
              <TextArea
                value={answers.access.notes}
                onChange={(notes) => setAnswers({ ...answers, access: { ...answers.access, notes } })}
              />
            </Field>
          </>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex items-center justify-between">
        <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Back
        </Button>
        {step < steps.length - 1 ? (
          <Button type="button" onClick={() => setStep(step + 1)}>
            Next
          </Button>
        ) : (
          <Button type="button" loading={saving} onClick={() => void submit()}>
            Submit intake
          </Button>
        )}
      </div>
    </div>
  )
}
