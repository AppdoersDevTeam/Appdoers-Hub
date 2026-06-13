'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateClientAction } from '@/lib/actions/clients'
import { FALLBACK_PLANS } from '@/lib/constants/plans'

interface PlanOption {
  value: string
  label: string
  fee: number
  setup?: number
}

const FALLBACK_PLAN_OPTIONS: PlanOption[] = FALLBACK_PLANS.map((p) => ({
  value: p.value,
  label: p.label,
  fee: p.fee,
  setup: p.setup,
}))

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

const labelClass = 'block text-xs font-medium text-slate-500 mb-1'
const selectClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

export function ClientEditForm({ client, plans }: { client: ClientRecord; plans?: PlanOption[] }) {
  const PLANS = plans && plans.length > 0 ? plans : FALLBACK_PLAN_OPTIONS
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    company_name: client.company_name,
    industry: client.industry ?? '',
    website: client.website ?? '',
    location: client.location ?? '',
    subscription_plan: client.subscription_plan,
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
      <h3 className="text-sm font-semibold text-slate-900">Edit Client</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-600">
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
              const plan = e.target.value
              const found = PLANS.find((p) => p.value === plan)
              setForm((prev) => ({
                ...prev,
                subscription_plan: plan,
                monthly_fee: found?.fee ?? prev.monthly_fee,
                setup_fee: found?.setup ?? prev.setup_fee,
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
