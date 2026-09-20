'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SlideOver } from '@/components/ui/slide-over'
import { Button } from '@/components/ui/button'
import { createLeadAction } from '@/lib/actions/leads'
import type { TeamUser } from '@/lib/types/database'
import {
  EMPTY_LEAD_FORM,
  LeadFormFields,
  leadFormToInput,
  type LeadFormState,
} from './lead-form-fields'

interface Props {
  open: boolean
  onClose: () => void
  teamMembers: Pick<TeamUser, 'id' | 'full_name'>[]
}

export function NewLeadSlideOver({ open, onClose, teamMembers }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<LeadFormState>(EMPTY_LEAD_FORM)

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
      const result = await createLeadAction(leadFormToInput(form))
      if (!result.success) {
        setError(result.error)
        return
      }
      setForm(EMPTY_LEAD_FORM)
      onClose()
      router.push(`/app/leads/${result.data.id}`)
    })
  }

  return (
    <SlideOver open={open} onClose={onClose} title="New Lead" width="lg">
      <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <LeadFormFields
          form={form}
          onChange={set}
          onToggleInterest={toggleInterest}
          teamMembers={teamMembers}
        />

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
