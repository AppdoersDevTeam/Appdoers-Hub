'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SlideOver } from '@/components/ui/slide-over'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IndustrySelect } from '@/components/team/industry-select'
import { createClientAction } from '@/lib/actions/clients'
import {
  formatPlanOptionLabel,
  planKeyFromCatalog,
  type CatalogServiceOption,
} from '@/lib/clients/catalog-options'
import {
  BILLING_CYCLE_OPTIONS,
  billingCycleFeeLabel,
  type ClientBillingCycle,
} from '@/lib/clients/billing'

interface Props {
  open: boolean
  onClose: () => void
  catalogPlans?: CatalogServiceOption[]
}

const labelClass = 'block text-xs font-medium text-slate-500 mb-1'
const selectClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

export function NewClientSlideOver({ open, onClose, catalogPlans = [] }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    company_name: '',
    industry: '',
    website: '',
    location: '',
    plan_service_id: '',
    subscription_plan: 'none' as string,
    contract_months: null as number | null,
    billing_cycle: '' as ClientBillingCycle | '',
    monthly_fee: 0,
    setup_fee: 0,
    setup_upfront: 0,
    payment_terms: 7,
    status: 'active' as 'active' | 'inactive' | 'churned',
  })

  const set = (field: string, value: string | number | null) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handlePlanChange = (serviceId: string) => {
    if (!serviceId) {
      setForm((prev) => ({
        ...prev,
        plan_service_id: '',
        subscription_plan: 'none',
        contract_months: null,
        billing_cycle: 'monthly' as ClientBillingCycle,
        monthly_fee: 0,
        setup_fee: 0,
        setup_upfront: 0,
      }))
      return
    }
    const plan = catalogPlans.find((p) => p.id === serviceId)
    if (!plan) return
    setForm((prev) => ({
      ...prev,
      plan_service_id: serviceId,
      subscription_plan: planKeyFromCatalog(plan.plan_key),
      contract_months: plan.contract_months,
      billing_cycle: 'monthly' as ClientBillingCycle,
      monthly_fee: plan.monthly_fee,
      setup_fee: plan.setup_fee,
      setup_upfront: plan.min_upfront ?? 0,
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
        contract_months: form.contract_months,
        plan_service_id: form.plan_service_id || null,
        billing_cycle: billingCycle,
        monthly_fee: form.monthly_fee,
        setup_fee: form.setup_fee,
        setup_upfront: form.setup_upfront,
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
          <div>
            <label className={labelClass}>Industry</label>
            <IndustrySelect
              className={selectClass}
              value={form.industry}
              onChange={(industry) => set('industry', industry)}
            />
          </div>
          <div>
            <label className={labelClass}>Location</label>
            <Input
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="Auckland, NZ"
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Website</label>
          <Input
            value={form.website}
            onChange={(e) => set('website', e.target.value)}
            placeholder="https://example.com"
          />
        </div>

        <div>
          <label className={labelClass}>Subscription Plan</label>
          <select
            className={selectClass}
            value={form.plan_service_id}
            onChange={(e) => handlePlanChange(e.target.value)}
          >
            <option value="">No plan</option>
            {catalogPlans.map((p) => (
              <option key={p.id} value={p.id}>
                {formatPlanOptionLabel(p)}
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
          <div>
            <label className={labelClass}>Payment Terms (days)</label>
            <Input
              type="number"
              min={1}
              value={form.payment_terms}
              onChange={(e) => set('payment_terms', parseInt(e.target.value) || 7)}
            />
          </div>
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
