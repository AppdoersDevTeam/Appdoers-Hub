'use client'

import { useState, useTransition } from 'react'
import { Plus, Edit2, Trash2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SlideOver } from '@/components/ui/slide-over'
import {
  createSubscriptionAction,
  updateSubscriptionAction,
  deleteSubscriptionAction,
  type SubscriptionInput,
} from '@/lib/actions/subscriptions'
import type { HubClientOption, SupabaseAccountWithProjects } from '@/lib/actions/supabase-accounts'
import { isSupabaseSubscription } from '@/lib/types/database'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'
import { SupabaseLoginsCard, supabaseLoginSummary } from '@/components/team/subscriptions/supabase-logins-card'
import {
  formatSubscriptionCost,
  isOneOffCycle,
  normalizeSubscriptionBillingCycle,
  subscriptionCostToMonthly,
  subscriptionCostToYearly,
  subscriptionDateFieldLabel,
  SUBSCRIPTION_BILLING_CYCLE_OPTIONS,
  type SubscriptionBillingCycle,
} from '@/lib/subscriptions/billing'

interface Subscription {
  id: string
  name: string
  category: string
  plan_name: string | null
  billing_cycle: string
  cost: number
  renewal_date: string | null
  status: string
  url: string | null
  notes: string | null
  client_id: string | null
  client_name: string | null
}

const CATEGORIES = ['Hosting', 'AI', 'Design', 'Dev Tools', 'Communication', 'CRM', 'Marketing', 'Finance', 'Other']
const STATUS_OPTIONS = ['active', 'paused', 'cancelled']

const labelClass = 'block text-xs font-medium text-slate-500 mb-1'
const selectClass = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none'

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function RenewalBadge({ dateStr }: { dateStr: string }) {
  const days = daysUntil(dateStr)
  const formatted = formatDate(dateStr)

  if (days < 0) return <span className="text-xs text-red-600">Expired</span>
  if (days <= 7) return <span className="text-xs font-semibold text-red-600">🔴 {days}d — {formatted}</span>
  if (days <= 14) return <span className="text-xs font-semibold text-amber-600">🟡 {days}d — {formatted}</span>
  if (days <= 30) return <span className="text-xs text-amber-600">{days}d — {formatted}</span>
  return <span className="text-xs text-slate-500">{formatted}</span>
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700',
    paused: 'bg-amber-50 text-amber-700',
    cancelled: 'bg-slate-100 text-slate-500',
  }
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', styles[status] ?? styles.active)}>
      {status}
    </span>
  )
}

function LoginSummaryLine({ accounts }: { accounts: SupabaseAccountWithProjects[] }) {
  const summary = supabaseLoginSummary(accounts)
  if (summary.loginCount === 0) {
    return <p className="text-xs text-slate-500 mt-0.5">No logins tracked</p>
  }
  return (
    <p className={cn('text-xs mt-0.5', summary.anyFull ? 'text-amber-600' : 'text-slate-500')}>
      {summary.loginCount} login{summary.loginCount === 1 ? '' : 's'} · {summary.used}/{summary.limit} slots
    </p>
  )
}

function formatCost(cost: number, cycle: string) {
  return formatSubscriptionCost(cost, cycle)
}

const emptyForm: SubscriptionInput = {
  name: '', category: 'Other', plan_name: '', billing_cycle: 'monthly',
  cost: 0, renewal_date: '', status: 'active', url: '', notes: '', client_id: null,
}

function assigneeFromForm(clientId: string | null | undefined, clients: HubClientOption[]) {
  if (!clientId) return { client_id: null as string | null, client_name: null as string | null }
  return {
    client_id: clientId,
    client_name: clients.find(client => client.id === clientId)?.company_name ?? null,
  }
}

function AssigneeBadge({ clientName }: { clientName: string | null }) {
  if (!clientName) {
    return <span className="rounded px-1.5 py-0.5 text-xs bg-slate-100 text-slate-500">Company-wide</span>
  }
  return <span className="rounded px-1.5 py-0.5 text-xs bg-blue-50 text-blue-700">{clientName}</span>
}

interface Props {
  subscriptions: Subscription[]
  canEdit: boolean
  supabaseAccounts?: SupabaseAccountWithProjects[]
  clients?: HubClientOption[]
}

export function SubscriptionsTable({
  subscriptions: initial,
  canEdit,
  supabaseAccounts = [],
  clients = [],
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [subs, setSubs] = useState(initial)
  const [accounts, setAccounts] = useState(supabaseAccounts)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<SubscriptionInput>(emptyForm)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')
  const [assigneeFilter, setAssigneeFilter] = useState('all')

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (s: Subscription) => {
    setEditing(s)
    setForm({
      name: s.name, category: s.category, plan_name: s.plan_name ?? '',
      billing_cycle: normalizeSubscriptionBillingCycle(s.billing_cycle),
      cost: s.cost, renewal_date: s.renewal_date ?? '', status: s.status as 'active' | 'paused' | 'cancelled',
      url: s.url ?? '', notes: s.notes ?? '', client_id: s.client_id,
    })
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) { setError('Name is required'); return }
    if (isOneOffCycle(form.billing_cycle) && !form.renewal_date) {
      setError('Expiry date is required for one-off payments')
      return
    }
    startTransition(async () => {
      const payload = {
        ...form,
        renewal_date: form.renewal_date || null,
        plan_name: form.plan_name || undefined,
        url: form.url || undefined,
        notes: form.notes || undefined,
        client_id: form.client_id || null,
      }
      const result = editing
        ? await updateSubscriptionAction(editing.id, payload)
        : await createSubscriptionAction(payload)

      if (!result.success) { setError(result.error); return }

      const assignee = assigneeFromForm(form.client_id, clients)
      if (editing) {
        setSubs(prev => prev.map(s => s.id === editing.id ? {
          ...s,
          ...form,
          cost: Number(form.cost),
          renewal_date: form.renewal_date || null,
          ...assignee,
        } : s))
      } else {
        const newId = (result as { success: true; data: { id: string } }).data.id
        setSubs(prev => [{
          ...form,
          id: newId,
          cost: Number(form.cost),
          plan_name: form.plan_name || null,
          renewal_date: form.renewal_date || null,
          url: form.url || null,
          notes: form.notes || null,
          ...assignee,
        }, ...prev])
      }
      setShowForm(false)
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Delete this subscription?')) return
    startTransition(async () => {
      const result = await deleteSubscriptionAction(id)
      if (result.success) setSubs(prev => prev.filter(s => s.id !== id))
    })
  }

  const filtered = subs.filter(s => {
    if (categoryFilter !== 'all' && s.category !== categoryFilter) return false
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (assigneeFilter === 'company' && s.client_id) return false
    if (assigneeFilter !== 'all' && assigneeFilter !== 'company' && s.client_id !== assigneeFilter) return false
    return true
  })

  // Summary totals (active only)
  const active = subs.filter(s => s.status === 'active')
  const companyActive = active.filter(s => !s.client_id)
  const clientActive = active.filter(s => Boolean(s.client_id))
  const companyMonthly = companyActive.reduce(
    (sum, s) => sum + subscriptionCostToMonthly(s.cost, s.billing_cycle),
    0
  )
  const clientMonthly = clientActive.reduce(
    (sum, s) => sum + subscriptionCostToMonthly(s.cost, s.billing_cycle),
    0
  )
  const companyYearly = companyActive.reduce(
    (sum, s) => sum + subscriptionCostToYearly(s.cost, s.billing_cycle),
    0
  )
  const clientYearly = clientActive.reduce(
    (sum, s) => sum + subscriptionCostToYearly(s.cost, s.billing_cycle),
    0
  )
  const fmt = (n: number) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="hub-card text-center">
          <p className="text-xs text-slate-500 mb-1">Company-wide /mo</p>
          <p className="text-xl font-semibold text-red-600">{fmt(companyMonthly)}</p>
          <p className="mt-0.5 text-xs text-slate-500">{fmt(companyYearly)}/yr projected</p>
        </div>
        <div className="hub-card text-center">
          <p className="text-xs text-slate-500 mb-1">Client-assigned /mo</p>
          <p className="text-xl font-semibold text-amber-600">{fmt(clientMonthly)}</p>
          <p className="mt-0.5 text-xs text-slate-500">{fmt(clientYearly)}/yr projected · pass-through</p>
        </div>
        <div className="hub-card text-center">
          <p className="text-xs text-slate-500 mb-1">Active Tools</p>
          <p className="text-xl font-semibold text-slate-900">{active.length}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {companyActive.length} company · {clientActive.length} client
          </p>
        </div>
      </div>

      {/* Filters + Add */}
      <div className="flex flex-wrap items-center gap-3">
        <select className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500 focus:outline-none" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500 focus:outline-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        <select className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500 focus:outline-none" value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}>
          <option value="all">All assignees</option>
          <option value="company">Company-wide</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>{client.company_name}</option>
          ))}
        </select>
        <div className="ml-auto">
          {canEdit && (
            <Button size="sm" onClick={openAdd}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Subscription
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="hub-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {['Tool', 'Category', 'For', 'Plan', 'Cost', 'Renewal / Expiry', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">No subscriptions found.</td>
                </tr>
              ) : filtered.map(s => (
                <tr key={s.id} className="group hover:bg-slate-100/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{s.name}</span>
                      {s.url && (
                        <a href={s.url.startsWith('http') ? s.url : `https://${s.url}`} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-blue-600">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {isSupabaseSubscription(s.name) && (
                      <LoginSummaryLine accounts={accounts.filter(a => a.subscription_id === s.id)} />
                    )}
                    {s.notes && <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">{s.notes}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded px-1.5 py-0.5 text-xs bg-slate-100 text-slate-500">{s.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <AssigneeBadge clientName={s.client_name} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.plan_name || '—'}</td>
                  <td className="px-4 py-3 font-mono text-slate-900">{formatCost(s.cost, s.billing_cycle)}</td>
                  <td className="px-4 py-3">
                    {s.renewal_date ? <RenewalBadge dateStr={s.renewal_date} /> : <span className="text-xs text-slate-500">—</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3">
                    {canEdit && (
                      <div className="flex items-center gap-1 opacity-70 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                        <button onClick={() => openEdit(s)} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-600">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(s.id)} disabled={isPending} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.filter(s => isSupabaseSubscription(s.name)).map(s => (
        <SupabaseLoginsCard
          key={s.id}
          subscriptionId={s.id}
          accounts={accounts.filter(a => a.subscription_id === s.id)}
          clients={clients}
          canEdit={canEdit}
          onAccountsChange={next => setAccounts(prev => [
            ...prev.filter(a => a.subscription_id !== s.id),
            ...next,
          ])}
        />
      ))}

      {/* Slide-over */}
      <SlideOver open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Subscription' : 'Add Subscription'}>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

          <div>
            <label className={labelClass}>Tool Name *</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Vercel" />
          </div>

          <div>
            <label className={labelClass}>Who is this for?</label>
            <select
              className={selectClass}
              value={form.client_id ?? ''}
              onChange={e => setForm(f => ({ ...f, client_id: e.target.value || null }))}
            >
              <option value="">Company-wide (Appdoers)</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.company_name}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Use company-wide for shared tools. Pick a client when this subscription is for them only.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Category</label>
              <select className={selectClass} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Plan</label>
              <Input value={form.plan_name ?? ''} onChange={e => setForm(f => ({ ...f, plan_name: e.target.value }))} placeholder="Pro" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Billing Cycle</label>
              <select
                className={selectClass}
                value={form.billing_cycle}
                onChange={e => setForm(f => ({
                  ...f,
                  billing_cycle: e.target.value as SubscriptionBillingCycle,
                }))}
              >
                {SUBSCRIPTION_BILLING_CYCLE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>{isOneOffCycle(form.billing_cycle) ? 'Amount (NZD)' : 'Cost (NZD)'}</label>
              <Input type="number" min={0} step={0.01} value={form.cost} onChange={e => setForm(f => ({ ...f, cost: parseFloat(e.target.value) || 0 }))} placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                {subscriptionDateFieldLabel(form.billing_cycle)}
                {isOneOffCycle(form.billing_cycle) ? ' *' : ''}
              </label>
              <Input type="date" value={form.renewal_date ?? ''} onChange={e => setForm(f => ({ ...f, renewal_date: e.target.value }))} />
              {isOneOffCycle(form.billing_cycle) && (
                <p className="mt-1 text-xs text-slate-500">When this one-off purchase expires.</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select className={selectClass} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'paused' | 'cancelled' }))}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>URL / Billing Portal</label>
            <Input value={form.url ?? ''} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://vercel.com/billing" />
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={form.notes ?? ''}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none resize-none"
              placeholder="Account owner, login details, notes…"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">{isPending ? 'Saving…' : editing ? 'Save' : 'Add Subscription'}</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </>
  )
}
