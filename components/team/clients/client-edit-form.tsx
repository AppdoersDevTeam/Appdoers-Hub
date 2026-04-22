'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateClientAction } from '@/lib/actions/clients'
import type { SubscriptionPlan } from '@/lib/types/database'

const PLANS: { value: SubscriptionPlan; label: string; fee: number }[] = [
  { value: 'launch', label: 'Launch', fee: 49 },
  { value: 'growth', label: 'Growth', fee: 79 },
  { value: 'growth_annual', label: 'Growth Annual', fee: 66 },
  { value: 'scale', label: 'Scale', fee: 149 },
  { value: 'founders_special', label: 'Founders Special', fee: 99 },
  { value: 'community', label: 'Community', fee: 0 },
  { value: 'none', label: 'No Plan', fee: 0 },
]

interface ClientRecord {
  id: string
  company_name: string
  industry: string | null
  website: string | null
  location: string | null
  subscription_plan: string
  monthly_fee: number
  setup_fee: number
  payment_terms: number
  status: string
}

const labelClass = 'block text-xs font-medium text-[#94A3B8] mb-1'
const selectClass =
  'w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]'

export function ClientEditForm({ client }: { client: ClientRecord }) {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    company_name: client.company_name,
    industry: client.industry ?? '',
    website: client.website ?? '',
    location: client.location ?? '',
    subscription_plan: client.subscription_plan as SubscriptionPlan,
    monthly_fee: client.monthly_fee,
    setup_fee: client.setup_fee,
    payment_terms: client.payment_terms,
    status: client.status as 'active' | 'inactive' | 'churned',
  })

  const set = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await updateClientAction(client.id, {
        company_name: form.company_name,
        industry: form.industry || undefined,
        website: form.website || undefined,
        location: form.location || undefined,
        subscription_plan: form.subscription_plan,
        monthly_fee: form.monthly_fee,
        setup_fee: form.setup_fee,
        payment_terms: form.payment_terms,
        status: form.status,
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      setSuccess(true)
      setOpen(false)
    })
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        Edit Client
      </Button>
    )
  }

  return (
    <div className="hub-card space-y-4">
      <h3 className="text-sm font-semibold text-[#F1F5F9]">Edit Client</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-[#EF4444]/10 border border-[#EF4444]/20 px-3 py-2 text-sm text-[#EF4444]">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-[#10B981]/10 border border-[#10B981]/20 px-3 py-2 text-sm text-[#10B981]">
            Saved!
          </div>
        )}
        <div>
          <label className={labelClass}>Company Name</label>
          <Input
            value={form.company_name}
            onChange={(e) => set('company_name', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Plan</label>
          <select
            className={selectClass}
            value={form.subscription_plan}
            onChange={(e) => {
              const plan = e.target.value as SubscriptionPlan
              const found = PLANS.find((p) => p.value === plan)
              setForm((prev) => ({
                ...prev,
                subscription_plan: plan,
                monthly_fee: found?.fee ?? prev.monthly_fee,
              }))
            }}
          >
            {PLANS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Monthly Fee</label>
          <Input
            type="number"
            min={0}
            value={form.monthly_fee}
            onChange={(e) => set('monthly_fee', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select
            className={selectClass}
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="churned">Churned</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? 'Saving…' : 'Save'}
          </Button>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
