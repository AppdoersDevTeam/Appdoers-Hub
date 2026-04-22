'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateSettingAction } from '@/lib/actions/settings'

const labelClass = 'block text-xs font-medium text-[#94A3B8] mb-1'
const sectionTitle = 'text-sm font-semibold text-[#F1F5F9] mb-4'

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
      {saved && <span className="text-xs text-[#10B981]">✓ Saved</span>}
    </div>
  )
}

export function SettingsEditor({ settings }: Props) {
  const [isPending, startTransition] = useTransition()

  const get = (key: string) => settings.find(s => s.key === key)?.value ?? {}

  // ── Company ──────────────────────────────────────────────
  const [company, setCompany] = useState({
    name: String(get('company').name ?? ''),
    email: String(get('company').email ?? ''),
    phone: String(get('company').phone ?? ''),
    website: String(get('company').website ?? ''),
    address: String(get('company').address ?? ''),
    gst_number: String(get('company').gst_number ?? ''),
  })
  const [companySaved, setCompanySaved] = useState(false)

  const saveCompany = () => {
    startTransition(async () => {
      await updateSettingAction('company', company)
      setCompanySaved(true)
      setTimeout(() => setCompanySaved(false), 3000)
    })
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

  // ── Slack ─────────────────────────────────────────────────
  const [slack, setSlack] = useState({
    webhook_url: String(get('slack').webhook_url ?? ''),
    notify_new_lead: get('slack').notify_new_lead !== false,
    notify_proposal_sent: get('slack').notify_proposal_sent !== false,
    notify_contract_signed: get('slack').notify_contract_signed !== false,
    notify_invoice_paid: get('slack').notify_invoice_paid !== false,
    notify_recap_sent: get('slack').notify_recap_sent !== false,
  })
  const [slackSaved, setSlackSaved] = useState(false)

  const saveSlack = () => {
    startTransition(async () => {
      await updateSettingAction('slack', slack)
      setSlackSaved(true)
      setTimeout(() => setSlackSaved(false), 3000)
    })
  }

  return (
    <div className="space-y-6">

      {/* Company */}
      <Section title="Company Info">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Company Name</label>
            <Input value={company.name} onChange={e => setCompany(c => ({ ...c, name: e.target.value }))} placeholder="Appdoers Ltd" />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <Input type="email" value={company.email} onChange={e => setCompany(c => ({ ...c, email: e.target.value }))} placeholder="hello@appdoers.co.nz" />
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
            <label className={labelClass}>Address</label>
            <Input value={company.address} onChange={e => setCompany(c => ({ ...c, address: e.target.value }))} placeholder="Auckland, New Zealand" />
          </div>
        </div>
        <SaveBar isPending={isPending} saved={companySaved} onSave={saveCompany} />
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
              className="w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] placeholder:text-[#475569] focus:border-[#3B82F6] focus:outline-none resize-none"
              placeholder="Thank you for your business! Please pay within 14 days."
            />
          </div>
        </div>
        <SaveBar isPending={isPending} saved={billingSaved} onSave={saveBilling} />
      </Section>

      {/* Slack */}
      <Section title="Slack Notifications">
        <div>
          <label className={labelClass}>Webhook URL</label>
          <Input
            value={slack.webhook_url}
            onChange={e => setSlack(s => ({ ...s, webhook_url: e.target.value }))}
            placeholder="https://hooks.slack.com/services/..."
            className="font-mono text-xs"
          />
          <p className="mt-1 text-xs text-[#475569]">Create an incoming webhook in your Slack workspace settings.</p>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-medium text-[#94A3B8]">Notify on:</p>
          {([
            ['notify_new_lead', 'New lead added'],
            ['notify_proposal_sent', 'Proposal sent to client'],
            ['notify_contract_signed', 'Contract signed'],
            ['notify_invoice_paid', 'Invoice marked as paid'],
            ['notify_recap_sent', 'Monthly recap sent'],
          ] as [keyof typeof slack, string][]).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={slack[key] as boolean}
                onChange={e => setSlack(s => ({ ...s, [key]: e.target.checked }))}
                className="h-4 w-4 rounded border-[#1F2D45] bg-[#0A0F1E] accent-[#3B82F6]"
              />
              <span className="text-sm text-[#CBD5E1]">{label}</span>
            </label>
          ))}
        </div>
        <SaveBar isPending={isPending} saved={slackSaved} onSave={saveSlack} />
      </Section>

    </div>
  )
}
