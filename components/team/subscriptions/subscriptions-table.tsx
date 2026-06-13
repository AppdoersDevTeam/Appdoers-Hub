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
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'

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

function formatCost(cost: number, cycle: string) {
  const formatted = new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(cost)
  return `${formatted}/${cycle === 'yearly' ? 'yr' : 'mo'}`
}

const emptyForm: SubscriptionInput = {
  name: '', category: 'Other', plan_name: '', billing_cycle: 'monthly',
  cost: 0, renewal_date: '', status: 'active', url: '', notes: '',
}

interface Props {
  subscriptions: Subscription[]
  canEdit: boolean
}

export function SubscriptionsTable({ subscriptions: initial, canEdit }: Props) {
  const [isPending, startTransition] = useTransition()
  const [subs, setSubs] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<SubscriptionInput>(emptyForm)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (s: Subscription) => {
    setEditing(s)
    setForm({
      name: s.name, category: s.category, plan_name: s.plan_name ?? '',
      billing_cycle: s.billing_cycle as 'monthly' | 'yearly',
      cost: s.cost, renewal_date: s.renewal_date ?? '', status: s.status as 'active' | 'paused' | 'cancelled',
      url: s.url ?? '', notes: s.notes ?? '',
    })
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) { setError('Name is required'); return }
    startTransition(async () => {
      const payload = { ...form, renewal_date: form.renewal_date || null, plan_name: form.plan_name || undefined, url: form.url || undefined, notes: form.notes || undefined }
      const result = editing
        ? await updateSubscriptionAction(editing.id, payload)
        : await createSubscriptionAction(payload)

      if (!result.success) { setError(result.error); return }

      if (editing) {
        setSubs(prev => prev.map(s => s.id === editing.id ? { ...s, ...form, cost: Number(form.cost), renewal_date: form.renewal_date || null } : s))
      } else {
        const newId = (result as { success: true; data: { id: string } }).data.id
        setSubs(prev => [{ ...form, id: newId, cost: Number(form.cost), plan_name: form.plan_name || null, renewal_date: form.renewal_date || null, url: form.url || null, notes: form.notes || null }, ...prev])
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
    return true
  })

  // Summary totals (active only)
  const active = subs.filter(s => s.status === 'active')
  const monthlyTotal = active.reduce((sum, s) => {
    return sum + (s.billing_cycle === 'monthly' ? s.cost : s.cost / 12)
  }, 0)
  const yearlyTotal = active.reduce((sum, s) => {
    return sum + (s.billing_cycle === 'yearly' ? s.cost : s.cost * 12)
  }, 0)
  const fmt = (n: number) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="hub-card text-center">
          <p className="text-xs text-slate-500 mb-1">Monthly Spend</p>
          <p className="text-xl font-semibold text-emerald-600">{fmt(monthlyTotal)}</p>
        </div>
        <div className="hub-card text-center">
          <p className="text-xs text-slate-500 mb-1">Yearly Spend</p>
          <p className="text-xl font-semibold text-slate-900">{fmt(yearlyTotal)}</p>
        </div>
        <div className="hub-card text-center">
          <p className="text-xs text-slate-500 mb-1">Active Tools</p>
          <p className="text-xl font-semibold text-slate-900">{active.length}</p>
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
                {['Tool', 'Category', 'Plan', 'Cost', 'Renewal', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">No subscriptions found.</td>
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
                    {s.notes && <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">{s.notes}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded px-1.5 py-0.5 text-xs bg-slate-100 text-slate-500">{s.category}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.plan_name || '—'}</td>
                  <td className="px-4 py-3 font-mono text-slate-900">{formatCost(s.cost, s.billing_cycle)}</td>
                  <td className="px-4 py-3">
                    {s.renewal_date ? <RenewalBadge dateStr={s.renewal_date} /> : <span className="text-xs text-slate-500">—</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3">
                    {canEdit && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

      {/* Slide-over */}
      <SlideOver open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Subscription' : 'Add Subscription'}>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

          <div>
            <label className={labelClass}>Tool Name *</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Vercel" />
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
              <select className={selectClass} value={form.billing_cycle} onChange={e => setForm(f => ({ ...f, billing_cycle: e.target.value as 'monthly' | 'yearly' }))}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Cost (NZD)</label>
              <Input type="number" min={0} step={0.01} value={form.cost} onChange={e => setForm(f => ({ ...f, cost: parseFloat(e.target.value) || 0 }))} placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Renewal Date</label>
              <Input type="date" value={form.renewal_date ?? ''} onChange={e => setForm(f => ({ ...f, renewal_date: e.target.value }))} />
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
