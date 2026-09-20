'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { updateLeadAction } from '@/lib/actions/leads'
import type { CompanySize, Lead, TeamUser } from '@/lib/types/database'
import {
  LeadFormFields,
  leadFormToInput,
  type LeadFormState,
} from './lead-form-fields'

interface Props {
  lead: Lead
  teamMembers: Pick<TeamUser, 'id' | 'full_name'>[]
}

function leadToForm(lead: Lead): LeadFormState {
  return {
    contact_name: lead.contact_name,
    company_name: lead.company_name ?? '',
    contact_role: lead.contact_role ?? '',
    email: lead.email ?? '',
    phone: lead.phone ?? '',
    website: lead.website ?? '',
    location: lead.location ?? '',
    industry: lead.industry ?? '',
    company_size: (lead.company_size ?? '') as CompanySize | '',
    source: lead.source,
    referral_name: lead.referral_name ?? '',
    service_interest: lead.service_interest ?? [],
    estimated_setup_fee:
      lead.estimated_setup_fee != null ? String(lead.estimated_setup_fee) : '',
    estimated_monthly:
      lead.estimated_monthly != null ? String(lead.estimated_monthly) : '',
    budget_notes: lead.budget_notes ?? '',
    needed_by: lead.needed_by ?? '',
    timeline_notes: lead.timeline_notes ?? '',
    assigned_to: lead.assigned_to ?? '',
    next_action: lead.next_action ?? '',
    next_action_date: lead.next_action_date ?? '',
  }
}

export function LeadEditForm({ lead, teamMembers }: Props) {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<LeadFormState>(() => leadToForm(lead))

  const set = (field: keyof LeadFormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const toggleInterest = (value: string, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      service_interest: checked
        ? [...prev.service_interest, value]
        : prev.service_interest.filter((item) => item !== value),
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.contact_name.trim()) {
      setError('Contact name is required')
      return
    }
    startTransition(async () => {
      const result = await updateLeadAction(lead.id, leadFormToInput(form))
      if (!result.success) {
        setError(result.error)
        return
      }
      setOpen(false)
    })
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        Edit Lead
      </Button>
    )
  }

  return (
    <div className="hub-card space-y-4">
      <h3 className="text-sm font-semibold text-slate-900">Edit Lead</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}
        <LeadFormFields
          form={form}
          onChange={set}
          onToggleInterest={toggleInterest}
          teamMembers={teamMembers}
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? 'Saving…' : 'Save'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setForm(leadToForm(lead))
              setOpen(false)
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
