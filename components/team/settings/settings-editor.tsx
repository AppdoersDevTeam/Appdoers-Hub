'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { testSlackChannelAction, updateSettingAction } from '@/lib/actions/settings'
import {
  SLACK_CHANNEL_LABELS,
  SLACK_CHANNEL_DESCRIPTIONS,
  ALL_SLACK_CHANNELS,
  type SlackChannel,
} from '@/lib/slack-channels'
import {
  OUTBOUND_LINK_DEFS,
  OUTBOUND_LINK_GROUPS,
  parseCustomOutboundLinks,
  parseOutboundLinkValues,
  type CustomOutboundLink,
} from '@/lib/outbound-links'

const ALL_CHANNELS = ALL_SLACK_CHANNELS

const labelClass = 'block text-xs font-medium text-slate-500 mb-1'
const sectionTitle = 'text-sm font-semibold text-slate-900 mb-4'

interface SettingRow {
  key: string
  value: Record<string, unknown>
}

interface Props {
  settings: SettingRow[]
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="hub-card space-y-4">
      <h2 className={sectionTitle}>{title}</h2>
      {children}
    </div>
  )
}

function SaveBar({ isPending, saved, onSave }: { isPending: boolean; saved: boolean; onSave: () => void }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <Button onClick={onSave} disabled={isPending} size="sm">
        {isPending ? 'Saving…' : 'Save Changes'}
      </Button>
      {saved && <span className="text-xs text-emerald-600">✓ Saved</span>}
    </div>
  )
}

export function SettingsEditor({ settings }: Props) {
  const [isPending, startTransition] = useTransition()

  const get = (key: string) => settings.find(s => s.key === key)?.value ?? {}

  // ── Company ──────────────────────────────────────────────
  const [company, setCompany] = useState({
    name: String(get('company').name ?? ''),
    legal_name: String(get('company').legal_name ?? ''),
    email: String(get('company').email ?? ''),
    phone: String(get('company').phone ?? ''),
    website: String(get('company').website ?? ''),
    address: String(get('company').address ?? ''),
    gst_number: String(get('company').gst_number ?? ''),
    nzbn: String(get('company').nzbn ?? ''),
  })
  const [companySaved, setCompanySaved] = useState(false)

  const saveCompany = () => {
    startTransition(async () => {
      await updateSettingAction('company', company)
      setCompanySaved(true)
      setTimeout(() => setCompanySaved(false), 3000)
    })
  }

  // ── Outbound links ────────────────────────────────────────
  const savedOutbound = get('outbound_links')
  const [outboundLinks, setOutboundLinks] = useState(() => parseOutboundLinkValues(savedOutbound))
  const [customLinks, setCustomLinks] = useState<CustomOutboundLink[]>(() =>
    parseCustomOutboundLinks(savedOutbound.custom)
  )
  const [outboundSaved, setOutboundSaved] = useState(false)

  const saveOutboundLinks = () => {
    startTransition(async () => {
      const result = await updateSettingAction('outbound_links', {
        ...outboundLinks,
        custom: customLinks
          .map((link) => ({
            id: link.id,
            label: link.label.trim(),
            url: link.url.trim(),
          }))
          .filter((link) => link.label || link.url),
      })
      if (!result.success) return
      setOutboundSaved(true)
      setTimeout(() => setOutboundSaved(false), 3000)
    })
  }

  const addCustomLink = () => {
    setCustomLinks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: '', url: '' },
    ])
  }

  const updateCustomLink = (id: string, field: 'label' | 'url', value: string) => {
    setCustomLinks((prev) =>
      prev.map((link) => (link.id === id ? { ...link, [field]: value } : link))
    )
  }

  const removeCustomLink = (id: string) => {
    setCustomLinks((prev) => prev.filter((link) => link.id !== id))
  }

  // ── Billing ───────────────────────────────────────────────
  const [billing, setBilling] = useState({
    bank_name: String(get('billing').bank_name ?? ''),
    account_number: String(get('billing').account_number ?? ''),
    account_name: String(get('billing').account_name ?? ''),
    payment_terms: String(get('billing').payment_terms ?? '14'),
    invoice_footer: String(get('billing').invoice_footer ?? ''),
    stripe_link: String(get('billing').stripe_link ?? ''),
  })
  const [billingSaved, setBillingSaved] = useState(false)

  const saveBilling = () => {
    startTransition(async () => {
      await updateSettingAction('billing', billing)
      setBillingSaved(true)
      setTimeout(() => setBillingSaved(false), 3000)
    })
  }

  // ── Slack Channels ────────────────────────────────────────
  const savedChannels = get('slack_channels') as Record<string, { webhook_url?: string; enabled?: boolean }> | undefined
  const [channels, setChannels] = useState<Record<SlackChannel, { webhook_url: string; enabled: boolean }>>(() => {
    const result = {} as Record<SlackChannel, { webhook_url: string; enabled: boolean }>
    for (const ch of ALL_CHANNELS) {
      result[ch] = {
        webhook_url: String(savedChannels?.[ch]?.webhook_url ?? ''),
        enabled: savedChannels?.[ch]?.enabled !== false,
      }
    }
    return result
  })
  const [slackSaved, setSlackSaved] = useState(false)
  const [testingChannel, setTestingChannel] = useState<SlackChannel | null>(null)
  const [testResult, setTestResult] = useState<Partial<Record<SlackChannel, { ok: boolean; message: string }>>>({})

  const saveSlack = () => {
    startTransition(async () => {
      const result = await updateSettingAction('slack_channels', channels as unknown as Record<string, unknown>)
      if (!result.success) {
        setTestResult(prev => ({ ...prev, general: { ok: false, message: result.error } }))
        return
      }
      setSlackSaved(true)
      setTimeout(() => setSlackSaved(false), 3000)
    })
  }

  const testChannel = (ch: SlackChannel) => {
    startTransition(async () => {
      setTestingChannel(ch)
      const saved = await updateSettingAction('slack_channels', channels as unknown as Record<string, unknown>)
      if (!saved.success) {
        setTestResult(prev => ({ ...prev, [ch]: { ok: false, message: saved.error } }))
        setTestingChannel(null)
        return
      }
      const result = await testSlackChannelAction(ch)
      setTestResult(prev => ({
        ...prev,
        [ch]: result.success
          ? { ok: true, message: 'Test message sent to Slack.' }
          : { ok: false, message: result.error },
      }))
      setTestingChannel(null)
    })
  }

  return (
    <div className="space-y-6">

      {/* Company */}
      <Section title="Company Info">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Company Name</label>
            <Input value={company.name} onChange={e => setCompany(c => ({ ...c, name: e.target.value }))} placeholder="Appdoers" />
          </div>
          <div>
            <label className={labelClass}>Legal Name</label>
            <Input value={company.legal_name} onChange={e => setCompany(c => ({ ...c, legal_name: e.target.value }))} placeholder="Appdoers Limited" />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <Input type="email" value={company.email} onChange={e => setCompany(c => ({ ...c, email: e.target.value }))} placeholder="contact@appdoers.co.nz" />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <Input value={company.phone} onChange={e => setCompany(c => ({ ...c, phone: e.target.value }))} placeholder="+64 21 000 0000" />
          </div>
          <div>
            <label className={labelClass}>Website</label>
            <Input value={company.website} onChange={e => setCompany(c => ({ ...c, website: e.target.value }))} placeholder="https://appdoers.co.nz" />
          </div>
          <div>
            <label className={labelClass}>GST Number</label>
            <Input value={company.gst_number} onChange={e => setCompany(c => ({ ...c, gst_number: e.target.value }))} placeholder="123-456-789" />
          </div>
          <div>
            <label className={labelClass}>NZBN</label>
            <Input value={company.nzbn} onChange={e => setCompany(c => ({ ...c, nzbn: e.target.value }))} placeholder="9429052210952" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Address</label>
            <Input value={company.address} onChange={e => setCompany(c => ({ ...c, address: e.target.value }))} placeholder="49 Braebrook Drive, Netherby, Ashburton 7700" />
          </div>
        </div>
        <SaveBar isPending={isPending} saved={companySaved} onSave={saveCompany} />
      </Section>

      {/* Quick links */}
      <Section title="Quick Links">
        <p className="text-xs text-slate-500">
          These appear on the dashboard as quick links. Leave a field blank to hide it.
          The company website is taken from Company Info above.
        </p>
        {OUTBOUND_LINK_GROUPS.map((group) => (
          <div key={group.title} className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {group.title}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {group.keys.map((key) => (
                <div key={key}>
                  <label className={labelClass}>{OUTBOUND_LINK_DEFS[key].label}</label>
                  <Input
                    type="text"
                    inputMode="url"
                    value={outboundLinks[key]}
                    onChange={(e) =>
                      setOutboundLinks((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder={OUTBOUND_LINK_DEFS[key].placeholder}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Custom links
          </h3>
          {customLinks.length === 0 ? (
            <p className="text-xs text-slate-500">No extra links yet. Add any other tool or profile URL.</p>
          ) : (
            <div className="space-y-2">
              {customLinks.map((link) => (
                <div key={link.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    value={link.label}
                    onChange={(e) => updateCustomLink(link.id, 'label', e.target.value)}
                    placeholder="Label"
                    className="sm:w-48 sm:shrink-0"
                  />
                  <Input
                    type="text"
                    inputMode="url"
                    value={link.url}
                    onChange={(e) => updateCustomLink(link.id, 'url', e.target.value)}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCustomLink(link.id)}
                    aria-label={`Remove ${link.label || 'custom link'}`}
                  >
                    <Trash2 className="h-4 w-4 text-slate-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={addCustomLink}>
            <Plus className="h-3.5 w-3.5" />
            Add custom link
          </Button>
        </div>
        <SaveBar isPending={isPending} saved={outboundSaved} onSave={saveOutboundLinks} />
      </Section>

      {/* Billing */}
      <Section title="Billing & Invoicing">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Bank Name</label>
            <Input value={billing.bank_name} onChange={e => setBilling(b => ({ ...b, bank_name: e.target.value }))} placeholder="ANZ" />
          </div>
          <div>
            <label className={labelClass}>Account Name</label>
            <Input value={billing.account_name} onChange={e => setBilling(b => ({ ...b, account_name: e.target.value }))} placeholder="Appdoers Ltd" />
          </div>
          <div>
            <label className={labelClass}>Account Number</label>
            <Input value={billing.account_number} onChange={e => setBilling(b => ({ ...b, account_number: e.target.value }))} placeholder="01-1234-5678901-00" />
          </div>
          <div>
            <label className={labelClass}>Default Payment Terms (days)</label>
            <Input type="number" min={1} value={billing.payment_terms} onChange={e => setBilling(b => ({ ...b, payment_terms: e.target.value }))} placeholder="14" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Stripe / Online Payment Link</label>
            <Input value={billing.stripe_link} onChange={e => setBilling(b => ({ ...b, stripe_link: e.target.value }))} placeholder="https://buy.stripe.com/..." />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Invoice Footer Note</label>
            <textarea
              value={billing.invoice_footer}
              onChange={e => setBilling(b => ({ ...b, invoice_footer: e.target.value }))}
              rows={2}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none resize-none"
              placeholder="Thank you for your business! Please pay within 14 days."
            />
          </div>
        </div>
        <SaveBar isPending={isPending} saved={billingSaved} onSave={saveBilling} />
      </Section>

      {/* Slack */}
      <Section title="Slack Channels">
        <p className="text-xs text-slate-500">
          Configure a separate Slack incoming webhook for each notification type. Leave blank to use the{' '}
          <strong className="text-slate-500">General</strong> channel as a fallback, or set{' '}
          <strong className="text-slate-500">General</strong> as your single catch-all webhook.
          Create webhooks at <span className="font-mono text-blue-600">api.slack.com/apps</span>.
          Save changes, then use <strong className="text-slate-500">Send test</strong> to confirm each channel.
        </p>
        <div className="space-y-4">
          {ALL_CHANNELS.map((ch) => (
            <div key={ch} className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{SLACK_CHANNEL_LABELS[ch]}</p>
                  <p className="text-xs text-slate-500">{SLACK_CHANNEL_DESCRIPTIONS[ch]}</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channels[ch].enabled}
                    onChange={e => setChannels(prev => ({ ...prev, [ch]: { ...prev[ch], enabled: e.target.checked } }))}
                    className="h-4 w-4 rounded border-slate-200 bg-white accent-blue-600"
                  />
                  <span className="text-xs text-slate-500">Enabled</span>
                </label>
              </div>
              <Input
                value={channels[ch].webhook_url}
                onChange={e => setChannels(prev => ({ ...prev, [ch]: { ...prev[ch], webhook_url: e.target.value } }))}
                placeholder={ch === 'general' ? 'https://hooks.slack.com/services/… (required as fallback)' : 'https://hooks.slack.com/services/… (optional)'}
                className="font-mono text-xs"
                disabled={!channels[ch].enabled}
              />
              <div className="mt-2 flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending || !channels[ch].enabled || !channels[ch].webhook_url.trim()}
                  onClick={() => testChannel(ch)}
                >
                  {testingChannel === ch ? 'Sending…' : 'Send test'}
                </Button>
                {testResult[ch] && (
                  <span className={`text-xs ${testResult[ch]?.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                    {testResult[ch]?.message}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <SaveBar isPending={isPending} saved={slackSaved} onSave={saveSlack} />
      </Section>

    </div>
  )
}
