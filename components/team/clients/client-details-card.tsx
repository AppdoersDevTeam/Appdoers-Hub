'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DeleteRecordButton } from '@/components/ui/delete-record-button'
import { IndustrySelect } from '@/components/team/industry-select'
import { deleteClientAction, updateClientAction } from '@/lib/actions/clients'
import { planEndDate } from '@/lib/clients/plan-dates'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

const labelClass = 'block text-xs font-medium text-slate-500 mb-1'
const selectClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

type ClientStatus = 'active' | 'inactive' | 'churned'

interface ClientDetails {
  id: string
  company_name: string
  industry: string | null
  website: string | null
  location: string | null
  payment_terms: number
  status: string
  created_at: string
  contract_months: number | null
  subscription_start_date: string | null
  subscription_end_date: string | null
}

function websiteUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function statusBadge(status: string) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs font-medium',
        status === 'active'
          ? 'bg-emerald-50 text-emerald-700'
          : status === 'churned'
            ? 'bg-red-50 text-red-700'
            : 'bg-slate-100 text-slate-500'
      )}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-0.5 break-words text-slate-600">{value}</div>
    </div>
  )
}

export function ClientDetailsCard({ client }: { client: ClientDetails }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const initialForm = () => ({
    company_name: client.company_name,
    industry: client.industry ?? '',
    website: client.website ?? '',
    location: client.location ?? '',
    payment_terms: client.payment_terms,
    status: client.status as ClientStatus,
    subscription_start_date: client.subscription_start_date ?? '',
    subscription_end_date: client.subscription_end_date ?? '',
  })
  const [form, setForm] = useState(initialForm)

  const set = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const setStartDate = (start: string) =>
    setForm((prev) => ({
      ...prev,
      subscription_start_date: start,
      subscription_end_date: planEndDate(start, client.contract_months) ?? prev.subscription_end_date,
    }))

  const startEdit = () => {
    setForm(initialForm())
    setError(null)
    setEditing(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company_name.trim()) {
      setError('Company name is required')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await updateClientAction(client.id, {
        company_name: form.company_name.trim(),
        industry: form.industry.trim() || null,
        website: websiteUrl(form.website),
        location: form.location.trim() || null,
        payment_terms: form.payment_terms,
        status: form.status,
        subscription_start_date: form.subscription_start_date || null,
        subscription_end_date: form.subscription_end_date || null,
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      setEditing(false)
      router.refresh()
    })
  }

  if (editing) {
    return (
      <div className="hub-card space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">Edit details</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          <div>
            <label className={labelClass}>Company Name</label>
            <Input
              value={form.company_name}
              onChange={(e) => set('company_name', e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Payment Terms (days)</label>
              <Input
                type="number"
                min={1}
                value={form.payment_terms}
                onChange={(e) => set('payment_terms', parseInt(e.target.value, 10) || 7)}
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
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Plan Start Date</label>
              <Input
                type="date"
                value={form.subscription_start_date}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Plan End Date</label>
              <Input
                type="date"
                value={form.subscription_end_date}
                onChange={(e) => set('subscription_end_date', e.target.value)}
              />
            </div>
          </div>
          {client.contract_months ? (
            <p className="text-xs text-slate-500">
              The end date fills in from the start date and the {client.contract_months}-month contract. You can change it if needed.
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="hub-card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">Details</h3>
        <Button variant="outline" size="sm" onClick={startEdit}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <InfoRow label="Industry" value={client.industry ?? '—'} />
        <InfoRow label="Location" value={client.location ?? '—'} />
        <InfoRow
          label="Website"
          value={
            client.website ? (
              <a
                href={client.website}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                {client.website}
              </a>
            ) : (
              '—'
            )
          }
        />
        <InfoRow label="Status" value={statusBadge(client.status)} />
        <InfoRow label="Client Since" value={formatDate(client.created_at)} />
        <InfoRow label="Payment Terms" value={`${client.payment_terms} days`} />
        <InfoRow
          label="Plan Start"
          value={client.subscription_start_date ? formatDate(client.subscription_start_date) : '—'}
        />
        <InfoRow
          label="Plan End"
          value={client.subscription_end_date ? formatDate(client.subscription_end_date) : '—'}
        />
      </div>
      <div className="border-t border-slate-200 pt-4">
        <p className="mb-2 text-xs font-medium text-slate-500">Danger zone</p>
        <DeleteRecordButton
          title="Delete client"
          message={`Delete "${client.company_name}"? Projects, invoices, documents, and contacts for this client will also be deleted. Converted leads will be unlinked. This cannot be undone.`}
          confirmLabel="Delete Client"
          size="sm"
          fullWidth={false}
          onDelete={deleteClientAction.bind(null, client.id)}
          redirectTo="/app/clients"
        />
      </div>
    </div>
  )
}
