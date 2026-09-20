'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SlideOver } from '@/components/ui/slide-over'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IndustrySelect } from '@/components/team/industry-select'
import { createClientAction } from '@/lib/actions/clients'
import {
  BILLING_CYCLE_OPTIONS,
  billingCycleFeeLabel,
  type ClientBillingCycle,
} from '@/lib/clients/billing'
import type { SubscriptionPlan } from '@/lib/types/database'
import { FALLBACK_PLANS } from '@/lib/constants/plans'

const PLANS: { value: SubscriptionPlan; label: string; fee: number; setup: number }[] = FALLBACK_PLANS

interface Props {
  open: boolean
  onClose: () => void
}

const labelClass = 'block text-xs font-medium text-slate-500 mb-1'
const selectClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

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
    billing_cycle: '' as ClientBillingCycle | '',
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
      billing_cycle: 'monthly' as ClientBillingCycle,
      monthly_fee: found?.fee ?? prev.monthly_fee,
      setup_fee: found?.setup ?? prev.setup_fee,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.company_name.trim()) {
      setError('Company name is required')
      return
    }
    const billingCycle = form.billing_cycle
    if (!billingCycle) {
      setError('Frequency is required')
      return
    }
    startTransition(async () => {
      const result = await createClientAction({
        company_name: form.company_name,
        industry: form.industry || undefined,
        website: form.website || undefined,
        location: form.location || undefined,
        subscription_plan: form.subscription_plan,
        billing_cycle: billingCycle,
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
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
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
            <IndustrySelect
              className={selectClass}
              value={form.industry}
              onChange={(industry) => set('industry', industry)}
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

        <div>
          <label className={labelClass} htmlFor="new-client-frequency">
            Frequency *
          </label>
          <select
            id="new-client-frequency"
            className={selectClass}
            value={form.billing_cycle}
            onChange={(e) => set('billing_cycle', e.target.value as ClientBillingCycle)}
            required
          >
            <option value="" disabled>
              Select frequency…
            </option>
            {BILLING_CYCLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="new-client-fee">
              {billingCycleFeeLabel(form.billing_cycle)}
            </label>
            <Input
              id="new-client-fee"
              type="number"
              min={0}
              step={0.01}
              value={form.monthly_fee}
              onChange={(e) => set('monthly_fee', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="new-client-setup-fee">
              Setup Fee (NZD)
            </label>
            <Input
              id="new-client-setup-fee"
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
