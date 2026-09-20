'use client'

import { Input } from '@/components/ui/input'
import { IndustrySelect } from '@/components/team/industry-select'
import {
  COMPANY_SIZE_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  SERVICE_INTEREST_OPTIONS,
} from '@/lib/leads/constants'
import type { CompanySize, LeadSource, TeamUser } from '@/lib/types/database'
import type { CreateLeadInput } from '@/lib/actions/leads'
import { cn } from '@/lib/utils/cn'

export const leadFieldLabelClass = 'block text-xs font-medium text-slate-500 mb-1'
export const leadFieldSelectClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

export type LeadFormState = {
  contact_name: string
  company_name: string
  contact_role: string
  email: string
  phone: string
  website: string
  location: string
  industry: string
  company_size: CompanySize | ''
  source: LeadSource
  referral_name: string
  service_interest: string[]
  estimated_setup_fee: string
  estimated_monthly: string
  budget_notes: string
  needed_by: string
  timeline_notes: string
  assigned_to: string
  next_action: string
  next_action_date: string
}

export const EMPTY_LEAD_FORM: LeadFormState = {
  contact_name: '',
  company_name: '',
  contact_role: '',
  email: '',
  phone: '',
  website: '',
  location: '',
  industry: '',
  company_size: '',
  source: 'word_of_mouth',
  referral_name: '',
  service_interest: [],
  estimated_setup_fee: '',
  estimated_monthly: '',
  budget_notes: '',
  needed_by: '',
  timeline_notes: '',
  assigned_to: '',
  next_action: '',
  next_action_date: '',
}

export function leadFormToInput(form: LeadFormState): CreateLeadInput {
  return {
    contact_name: form.contact_name,
    company_name: form.company_name,
    contact_role: form.contact_role,
    email: form.email,
    phone: form.phone,
    website: form.website,
    location: form.location,
    industry: form.industry,
    company_size: form.company_size,
    source: form.source,
    referral_name: form.source === 'referral' ? form.referral_name : '',
    service_interest: form.service_interest,
    estimated_setup_fee: form.estimated_setup_fee === '' ? null : parseFloat(form.estimated_setup_fee) || 0,
    estimated_monthly: form.estimated_monthly === '' ? null : parseFloat(form.estimated_monthly) || 0,
    budget_notes: form.budget_notes,
    needed_by: form.needed_by,
    timeline_notes: form.timeline_notes,
    assigned_to: form.assigned_to,
    next_action: form.next_action,
    next_action_date: form.next_action_date,
  }
}

export function estimatedTotalValue(form: LeadFormState): number {
  return (parseFloat(form.estimated_setup_fee) || 0) + (parseFloat(form.estimated_monthly) || 0) * 12
}

interface Props {
  form: LeadFormState
  onChange: (field: keyof LeadFormState, value: string) => void
  onToggleInterest: (value: string, checked: boolean) => void
  teamMembers: Pick<TeamUser, 'id' | 'full_name'>[]
}

export function LeadFormFields({ form, onChange, onToggleInterest, teamMembers }: Props) {
  const estValue = estimatedTotalValue(form)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={leadFieldLabelClass}>Contact Name *</label>
          <Input
            value={form.contact_name}
            onChange={(e) => onChange('contact_name', e.target.value)}
            placeholder="Jane Smith"
            required
          />
        </div>
        <div>
          <label className={leadFieldLabelClass}>Job Title</label>
          <Input
            value={form.contact_role}
            onChange={(e) => onChange('contact_role', e.target.value)}
            placeholder="Director"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={leadFieldLabelClass}>Company</label>
          <Input
            value={form.company_name}
            onChange={(e) => onChange('company_name', e.target.value)}
            placeholder="Acme Ltd"
          />
        </div>
        <div>
          <label className={leadFieldLabelClass}>Industry</label>
          <IndustrySelect
            className={leadFieldSelectClass}
            value={form.industry}
            onChange={(industry) => onChange('industry', industry)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={leadFieldLabelClass}>Email</label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="jane@example.com"
          />
        </div>
        <div>
          <label className={leadFieldLabelClass}>Phone</label>
          <Input
            value={form.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            placeholder="+64 21 000 0000"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={leadFieldLabelClass}>Website</label>
          <Input
            value={form.website}
            onChange={(e) => onChange('website', e.target.value)}
            placeholder="https://example.com"
          />
        </div>
        <div>
          <label className={leadFieldLabelClass}>Location</label>
          <Input
            value={form.location}
            onChange={(e) => onChange('location', e.target.value)}
            placeholder="Ashburton, NZ"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={leadFieldLabelClass}>Company Size</label>
          <select
            className={leadFieldSelectClass}
            value={form.company_size}
            onChange={(e) => onChange('company_size', e.target.value)}
          >
            <option value="">Not specified</option>
            {COMPANY_SIZE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={leadFieldLabelClass}>Source</label>
          <select
            className={leadFieldSelectClass}
            value={form.source}
            onChange={(e) => onChange('source', e.target.value)}
          >
            {LEAD_SOURCE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {form.source === 'referral' && (
        <div>
          <label className={leadFieldLabelClass}>Referred By</label>
          <Input
            value={form.referral_name}
            onChange={(e) => onChange('referral_name', e.target.value)}
            placeholder="Name of referrer"
          />
        </div>
      )}

      <div>
        <p className={leadFieldLabelClass}>Service Interest</p>
        <div className="grid grid-cols-2 gap-2 rounded-md border border-slate-200 p-3">
          {SERVICE_INTEREST_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={form.service_interest.includes(opt.value)}
                onChange={(e) => onToggleInterest(opt.value, e.target.checked)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={leadFieldLabelClass}>Est. Setup Fee (NZD)</label>
          <Input
            type="number"
            min={0}
            value={form.estimated_setup_fee}
            onChange={(e) => onChange('estimated_setup_fee', e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className={leadFieldLabelClass}>Est. Monthly (NZD)</label>
          <Input
            type="number"
            min={0}
            value={form.estimated_monthly}
            onChange={(e) => onChange('estimated_monthly', e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      {estValue > 0 && (
        <div className="rounded-md bg-blue-50 border border-blue-600/20 px-4 py-2 text-sm text-blue-600">
          Est. Total Value: ${estValue.toLocaleString()} NZD{' '}
          <span className="text-slate-500 text-xs">(setup + monthly × 12)</span>
        </div>
      )}

      <div>
        <label className={leadFieldLabelClass}>Budget notes</label>
        <textarea
          className={cn(leadFieldSelectClass, 'resize-none')}
          rows={2}
          value={form.budget_notes}
          onChange={(e) => onChange('budget_notes', e.target.value)}
          placeholder="What they said they can spend"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={leadFieldLabelClass}>Needed by</label>
          <Input
            type="date"
            value={form.needed_by}
            onChange={(e) => onChange('needed_by', e.target.value)}
          />
        </div>
        <div>
          <label className={leadFieldLabelClass}>Assigned To</label>
          <select
            className={leadFieldSelectClass}
            value={form.assigned_to}
            onChange={(e) => onChange('assigned_to', e.target.value)}
          >
            <option value="">Unassigned</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={leadFieldLabelClass}>Timeline notes</label>
        <textarea
          className={cn(leadFieldSelectClass, 'resize-none')}
          rows={2}
          value={form.timeline_notes}
          onChange={(e) => onChange('timeline_notes', e.target.value)}
          placeholder="Launch window, constraints, urgency"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={leadFieldLabelClass}>Next Action Date</label>
          <Input
            type="date"
            value={form.next_action_date}
            onChange={(e) => onChange('next_action_date', e.target.value)}
          />
        </div>
        <div>
          <label className={leadFieldLabelClass}>Next Action</label>
          <Input
            value={form.next_action}
            onChange={(e) => onChange('next_action', e.target.value)}
            placeholder="e.g. Follow up call"
          />
        </div>
      </div>
    </div>
  )
}
