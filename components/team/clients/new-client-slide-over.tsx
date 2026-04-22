'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SlideOver } from '@/components/ui/slide-over'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClientAction } from '@/lib/actions/clients'
import type { SubscriptionPlan } from '@/lib/types/database'

const PLANS: { value: SubscriptionPlan; label: string; fee: number }[] = [
  { value: 'launch', label: 'Launch — $49/mo', fee: 49 },
  { value: 'growth', label: 'Growth — $79/mo', fee: 79 },
  { value: 'growth_annual', label: 'Growth Annual — $66/mo', fee: 66 },
  { value: 'scale', label: 'Scale — $149/mo', fee: 149 },
  { value: 'founders_special', label: 'Founders Special — $99/mo', fee: 99 },
  { value: 'community', label: 'Community — $0/mo', fee: 0 },
  { value: 'none', label: 'No Plan', fee: 0 },
]

interface Props {
  open: boolean
  onClose: () => void
}

const labelClass = 'block text-xs font-medium text-[#94A3B8] mb-1'
const selectClass =
  'w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]'

export function NewClientSlideOver({ open, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    company_name: '',
    industry: '',
    website: '',
    location: '',
    subscription_plan: 'none' as SubscriptionPlan,
    monthly_fee: 0,
    setup_fee: 0,
    payment_terms: 7,
    status: 'active' as 'active' | 'inactive' | 'churned',
  })

  const set = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handlePlanChange = (plan: SubscriptionPlan) => {
    const found = PLANS.find((p) => p.value === plan)
    setForm((prev) => ({
      ...prev,
      subscription_plan: plan,
      monthly_fee: found?.fee ?? prev.monthly_fee,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.company_name.trim()) {
      setError('Company name is required')
      return
    }
    startTransition(async () => {
      const result = await createClientAction({
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
      onClose()
      router.push(`/app/clients/${result.data.id}`)
    })
  }

  return (
    <SlideOver open={open} onClose={onClose} title="New Client" width="lg">
      <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
        {error && (
          <div className="rounded-md bg-[#EF4444]/10 border border-[#EF4444]/20 px-4 py-3 text-sm text-[#EF4444]">
            {error}
          </div>
        )}

        {/* Company Name */}
        <div>
          <label className={labelClass}>Company Name *</label>
          <Input
            value={form.company_name}
            onChange={(e) => set('company_name', e.target.value)}
            placeholder="Acme Ltd"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Industry */}
          <div>
            <label className={labelClass}>Industry</label>
            <Input
              value={form.industry}
              onChange={(e) => set('industry', e.target.value)}
              placeholder="e.g. Retail"
            />
          </div>
          {/* Location */}
          <div>
            <label className={labelClass}>Location</label>
            <Input
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="Auckland, NZ"
            />
          </div>
        </div>

        {/* Website */}
        <div>
          <label className={labelClass}>Website</label>
          <Input
            value={form.website}
            onChange={(e) => set('website', e.target.value)}
            placeholder="https://example.com"
          />
        </div>

        {/* Subscription Plan */}
        <div>
          <label className={labelClass}>Subscription Plan</label>
          <select
            className={selectClass}
            value={form.subscription_plan}
            onChange={(e) =>
              handlePlanChange(e.target.value as SubscriptionPlan)
            }
          >
            {PLANS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Monthly Fee */}
          <div>
            <label className={labelClass}>Monthly Fee (NZD)</label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.monthly_fee}
              onChange={(e) => set('monthly_fee', parseFloat(e.target.value) || 0)}
            />
          </div>
          {/* Setup Fee */}
          <div>
            <label className={labelClass}>Setup Fee (NZD)</label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.setup_fee}
              onChange={(e) => set('setup_fee', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Payment Terms */}
          <div>
            <label className={labelClass}>Payment Terms (days)</label>
            <Input
              type="number"
              min={1}
              value={form.payment_terms}
              onChange={(e) => set('payment_terms', parseInt(e.target.value) || 7)}
            />
          </div>
          {/* Status */}
          <div>
            <label className={labelClass}>Status</label>
            <select
              className={selectClass}
              value={form.status}
              onChange={(e) =>
                set('status', e.target.value as 'active' | 'inactive' | 'churned')
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="churned">Churned</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? 'Creating…' : 'Create Client'}
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
