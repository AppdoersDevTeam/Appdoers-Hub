'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateClientAction } from '@/lib/actions/clients'
import { syncClientServicesAction, type ClientServiceInput } from '@/lib/actions/client-services'
import {
  formatPlanOptionLabel,
  isEmailAddon,
  planKeyFromCatalog,
  type CatalogServiceOption,
} from '@/lib/clients/catalog-options'
import { formatCurrency } from '@/lib/utils/format'

export interface ClientServiceRecord {
  service_catalog_id: string
  quantity: number
  monthly_fee: number
  setup_fee: number
}

interface ClientRecord {
  id: string
  company_name: string
  industry: string | null
  website: string | null
  location: string | null
  subscription_plan: string
  contract_months: number | null
  plan_service_id: string | null
  monthly_fee: number
  setup_fee: number
  setup_upfront: number
  payment_terms: number
  status: string
}

const labelClass = 'block text-xs font-medium text-slate-500 mb-1'
const selectClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

interface AddonSelection {
  serviceId: string
  quantity: number
  monthly_fee: number
  setup_fee: number
}

function buildAddonSelections(
  catalogAddons: CatalogServiceOption[],
  existing: ClientServiceRecord[]
): Record<string, AddonSelection> {
  const map: Record<string, AddonSelection> = {}
  for (const svc of catalogAddons) {
    const row = existing.find((e) => e.service_catalog_id === svc.id)
    if (row) {
      map[svc.id] = {
        serviceId: svc.id,
        quantity: row.quantity,
        monthly_fee: row.monthly_fee,
        setup_fee: row.setup_fee,
      }
    }
  }
  return map
}

export function ClientEditForm({
  client,
  catalogPlans,
  catalogAddons,
  clientServices,
}: {
  client: ClientRecord
  catalogPlans: CatalogServiceOption[]
  catalogAddons: CatalogServiceOption[]
  clientServices: ClientServiceRecord[]
}) {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    company_name: client.company_name,
    industry: client.industry ?? '',
    website: client.website ?? '',
    location: client.location ?? '',
    plan_service_id: client.plan_service_id ?? '',
    subscription_plan: client.subscription_plan,
    contract_months: client.contract_months,
    monthly_fee: client.monthly_fee,
    setup_fee: client.setup_fee,
    setup_upfront: client.setup_upfront ?? 0,
    payment_terms: client.payment_terms,
    status: client.status as 'active' | 'inactive' | 'churned',
  })

  const [addons, setAddons] = useState<Record<string, AddonSelection>>(() =>
    buildAddonSelections(catalogAddons, clientServices)
  )

  const set = (field: string, value: string | number | null) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handlePlanChange = (serviceId: string) => {
    if (!serviceId) {
      setForm((prev) => ({
        ...prev,
        plan_service_id: '',
        subscription_plan: 'none',
        contract_months: null,
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
      monthly_fee: plan.monthly_fee,
      setup_fee: plan.setup_fee,
      setup_upfront: plan.min_upfront ?? 0,
    }))
  }

  const toggleAddon = (svc: CatalogServiceOption, checked: boolean) => {
    setAddons((prev) => {
      const next = { ...prev }
      if (checked) {
        next[svc.id] = {
          serviceId: svc.id,
          quantity: 1,
          monthly_fee: svc.monthly_fee,
          setup_fee: svc.setup_fee,
        }
      } else {
        delete next[svc.id]
      }
      return next
    })
  }

  const updateAddonQuantity = (serviceId: string, quantity: number) => {
    const svc = catalogAddons.find((s) => s.id === serviceId)
    if (!svc) return
    const qty = Math.max(1, quantity)
    setAddons((prev) => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        quantity: qty,
        monthly_fee: svc.monthly_fee * qty,
        setup_fee: svc.setup_fee,
      },
    }))
  }

  const addonMonthlyTotal = Object.values(addons).reduce((sum, a) => sum + a.monthly_fee, 0)
  const addonSetupTotal = Object.values(addons).reduce((sum, a) => sum + a.setup_fee, 0)

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
        contract_months: form.contract_months,
        plan_service_id: form.plan_service_id || null,
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

      const serviceRows: ClientServiceInput[] = Object.values(addons).map((a) => ({
        service_catalog_id: a.serviceId,
        quantity: a.quantity,
        monthly_fee: a.monthly_fee,
        setup_fee: a.setup_fee,
      }))

      const syncResult = await syncClientServicesAction(client.id, serviceRows)
      if (!syncResult.success) {
        setError(syncResult.error)
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

  const emailAddons = catalogAddons.filter((s) => isEmailAddon(s.plan_key))
  const otherAddons = catalogAddons.filter((s) => !isEmailAddon(s.plan_key))
  const matchingEmailAddons = form.contract_months
    ? emailAddons.filter((s) => s.contract_months === form.contract_months)
    : emailAddons

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
          <label className={labelClass}>Website Plan</label>
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
        {form.plan_service_id && (
          <div className="grid grid-cols-2 gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Due upfront (min)</p>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.setup_upfront}
                onChange={(e) => set('setup_upfront', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total setup fee</p>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.setup_fee}
                onChange={(e) => set('setup_fee', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-500">Monthly total</p>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.monthly_fee}
                onChange={(e) => set('monthly_fee', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        )}
        <div>
          <label className={labelClass}>Additional Services</label>
          <div className="space-y-3 rounded-md border border-slate-200 p-3">
            {emailAddons.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Business Email</p>
                {matchingEmailAddons.map((svc) => {
                  const selected = addons[svc.id]
                  return (
                    <div key={svc.id} className="flex flex-wrap items-center gap-2">
                      <label className="flex flex-1 min-w-[200px] items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={!!selected}
                          onChange={(e) => toggleAddon(svc, e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        <span>
                          {svc.name} — {formatCurrency(svc.monthly_fee)}/mailbox/mo
                        </span>
                      </label>
                      {selected && (
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          className="w-20"
                          value={selected.quantity}
                          onChange={(e) =>
                            updateAddonQuantity(svc.id, parseInt(e.target.value, 10) || 1)
                          }
                          title="Mailboxes"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {otherAddons.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Other Add-ons</p>
                {otherAddons.map((svc) => (
                  <label key={svc.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={!!addons[svc.id]}
                      onChange={(e) => toggleAddon(svc, e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span>
                      {svc.name}
                      {svc.setup_fee > 0 && ` — ${formatCurrency(svc.setup_fee)} setup`}
                      {svc.monthly_fee > 0 && ` — ${formatCurrency(svc.monthly_fee)}/mo`}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {catalogAddons.length === 0 && (
              <p className="text-sm text-slate-500">No add-ons in catalog.</p>
            )}
          </div>
          {Object.keys(addons).length > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              Add-ons: +{formatCurrency(addonMonthlyTotal)}/mo
              {addonSetupTotal > 0 && ` · +${formatCurrency(addonSetupTotal)} setup`}
            </p>
          )}
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
