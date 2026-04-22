'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SlideOver } from '@/components/ui/slide-over'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createLeadAction } from '@/lib/actions/leads'
import type { LeadSource, TeamUser } from '@/lib/types/database'

const SOURCES: { value: LeadSource; label: string }[] = [
  { value: 'word_of_mouth', label: 'Word of Mouth' },
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'social', label: 'Social Media' },
  { value: 'cold_outreach', label: 'Cold Outreach' },
  { value: 'other', label: 'Other' },
]

interface Props {
  open: boolean
  onClose: () => void
  teamMembers: Pick<TeamUser, 'id' | 'full_name'>[]
}

const labelClass = 'block text-xs font-medium text-[#94A3B8] mb-1'
const selectClass =
  'w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]'

export function NewLeadSlideOver({ open, onClose, teamMembers }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    contact_name: '',
    company_name: '',
    email: '',
    phone: '',
    source: 'word_of_mouth' as LeadSource,
    referral_name: '',
    estimated_setup_fee: '',
    estimated_monthly: '',
    assigned_to: '',
    next_action: '',
    next_action_date: '',
  })

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const estValue =
    (parseFloat(form.estimated_setup_fee) || 0) +
    (parseFloat(form.estimated_monthly) || 0) * 12

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.contact_name.trim()) {
      setError('Contact name is required')
      return
    }
    startTransition(async () => {
      const result = await createLeadAction({
        contact_name: form.contact_name,
        company_name: form.company_name || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        source: form.source,
        referral_name:
          form.source === 'referral' ? form.referral_name || undefined : undefined,
        estimated_setup_fee: parseFloat(form.estimated_setup_fee) || undefined,
        estimated_monthly: parseFloat(form.estimated_monthly) || undefined,
        assigned_to: form.assigned_to || undefined,
        next_action: form.next_action || undefined,
        next_action_date: form.next_action_date || undefined,
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      onClose()
      router.push(`/app/leads/${result.data.id}`)
    })
  }

  return (
    <SlideOver open={open} onClose={onClose} title="New Lead" width="lg">
      <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
        {error && (
          <div className="rounded-md bg-[#EF4444]/10 border border-[#EF4444]/20 px-4 py-3 text-sm text-[#EF4444]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Contact Name *</label>
            <Input
              value={form.contact_name}
              onChange={(e) => set('contact_name', e.target.value)}
              placeholder="Jane Smith"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Company</label>
            <Input
              value={form.company_name}
              onChange={(e) => set('company_name', e.target.value)}
              placeholder="Acme Ltd"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="jane@example.com"
            />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <Input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="+64 21 000 0000"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Source</label>
            <select
              className={selectClass}
              value={form.source}
              onChange={(e) => set('source', e.target.value)}
            >
              {SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          {form.source === 'referral' && (
            <div>
              <label className={labelClass}>Referred By</label>
              <Input
                value={form.referral_name}
                onChange={(e) => set('referral_name', e.target.value)}
                placeholder="Name of referrer"
              />
            </div>
          )}
        </div>

        {/* Est. Value */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Est. Setup Fee (NZD)</label>
            <Input
              type="number"
              min={0}
              value={form.estimated_setup_fee}
              onChange={(e) => set('estimated_setup_fee', e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label className={labelClass}>Est. Monthly (NZD)</label>
            <Input
              type="number"
              min={0}
              value={form.estimated_monthly}
              onChange={(e) => set('estimated_monthly', e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        {estValue > 0 && (
          <div className="rounded-md bg-[#3B82F6]/10 border border-[#3B82F6]/20 px-4 py-2 text-sm text-[#3B82F6]">
            Est. Total Value: ${estValue.toLocaleString()} NZD{' '}
            <span className="text-[#94A3B8] text-xs">(setup + monthly × 12)</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Assigned To</label>
            <select
              className={selectClass}
              value={form.assigned_to}
              onChange={(e) => set('assigned_to', e.target.value)}
            >
              <option value="">Unassigned</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Next Action Date</label>
            <Input
              type="date"
              value={form.next_action_date}
              onChange={(e) => set('next_action_date', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Next Action</label>
          <Input
            value={form.next_action}
            onChange={(e) => set('next_action', e.target.value)}
            placeholder="e.g. Follow up call"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? 'Creating…' : 'Create Lead'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </SlideOver>
  )
}
