'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SlideOver } from '@/components/ui/slide-over'
import { createInvoiceAction } from '@/lib/actions/invoices'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

const statusConfig: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-500' },
  sent: { label: 'Sent', cls: 'bg-blue-50 text-blue-700' },
  overdue: { label: 'Overdue', cls: 'bg-red-50 text-red-700' },
  paid: { label: 'Paid', cls: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500' },
}

interface InvoiceRow {
  id: string
  invoice_number: string
  status: string
  type: string
  issue_date: string
  due_date: string
  subtotal: number
  gst_amount: number
  total: number
  paid_at: string | null
  sent_at: string | null
  client_name: string
  project_name: string | null
  is_overdue: boolean
}

const labelClass = 'block text-xs font-medium text-slate-500 mb-1'
const selectClass = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none'

export function InvoicesTable({
  invoices,
  clients,
  totalOutstanding,
  totalOverdue,
  totalPaidThisMonth,
}: {
  invoices: InvoiceRow[]
  clients: { id: string; company_name: string }[]
  totalOutstanding: number
  totalOverdue: number
  totalPaidThisMonth: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const [form, setForm] = useState({
    client_id: '',
    due_date: in7Days,
    issue_date: today,
    type: 'adhoc',
    notes: '',
  })

  const filtered = invoices.filter((inv) => {
    const matchSearch = !search || inv.client_name.toLowerCase().includes(search.toLowerCase()) || inv.invoice_number.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter || (statusFilter === 'overdue' && inv.is_overdue)
    return matchSearch && matchStatus
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.client_id) { setError('Client is required'); return }
    startTransition(async () => {
      const result = await createInvoiceAction({
        client_id: form.client_id,
        type: form.type,
        issue_date: form.issue_date,
        due_date: form.due_date,
        lines: [],
        notes: form.notes || undefined,
      })
      if (!result.success) { setError(result.error); return }
      setShowNew(false)
      router.push(`/app/invoices/${result.data.id}`)
      router.refresh()
    })
  }

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="hub-card">
          <p className="text-xs text-slate-500">Outstanding</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className={cn('hub-card', totalOverdue > 0 && 'border-red-200')}>
          <p className="text-xs text-slate-500">Overdue</p>
          <p className={cn('mt-1 text-2xl font-bold', totalOverdue > 0 ? 'text-red-600' : 'text-slate-900')}>{formatCurrency(totalOverdue)}</p>
        </div>
        <div className="hub-card">
          <p className="text-xs text-slate-500">Paid This Month</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{formatCurrency(totalPaidThisMonth)}</p>
        </div>
      </div>

      {/* Filters + New */}
      <div className="flex items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search invoices…"
          className="max-w-xs"
        />
        <select
          className={cn(selectClass, 'max-w-[160px]')}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="overdue">Overdue</option>
          <option value="paid">Paid</option>
        </select>
        <div className="ml-auto">
          <Button onClick={() => setShowNew(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New Invoice
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="hub-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {['Invoice #', 'Client', 'Project', 'Status', 'Issue Date', 'Due Date', 'Total (incl. GST)', 'Paid'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No invoices found.</td></tr>
              ) : (
                filtered.map((inv) => {
                  const displayStatus = inv.is_overdue && inv.status === 'sent' ? 'overdue' : inv.status
                  const st = statusConfig[displayStatus] ?? statusConfig.draft
                  return (
                    <tr
                      key={inv.id}
                      className={cn(
                        'hover:bg-slate-50 transition-colors cursor-pointer',
                        inv.is_overdue && 'border-l-2 border-l-[#EF4444]'
                      )}
                      onClick={() => router.push(`/app/invoices/${inv.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <Link
                          href={`/app/invoices/${inv.id}`}
                          className="hover:text-blue-600 transition-colors font-mono"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{inv.client_name}</td>
                      <td className="px-4 py-3 text-slate-500">{inv.project_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', st.cls)}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(inv.issue_date)}</td>
                      <td className={cn('px-4 py-3', inv.is_overdue ? 'text-red-600 font-medium' : 'text-slate-500')}>{formatDate(inv.due_date)}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{formatCurrency(inv.total)}</td>
                      <td className="px-4 py-3 text-slate-500">{inv.paid_at ? formatDate(inv.paid_at) : '—'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Invoice slide-over */}
      <SlideOver open={showNew} onClose={() => setShowNew(false)} title="New Invoice" subtitle="Create a blank invoice to add line items">
        <form onSubmit={handleCreate} className="space-y-5 px-6 py-5">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}
          <div>
            <label className={labelClass}>Client *</label>
            <select className={selectClass} value={form.client_id} onChange={(e) => setForm(f => ({ ...f, client_id: e.target.value }))} required>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select className={selectClass} value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="adhoc">Ad-hoc</option>
              <option value="setup">Setup</option>
              <option value="retainer">Monthly Retainer</option>
              <option value="time_billing">Time Billing</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Issue Date</label>
              <Input type="date" value={form.issue_date} onChange={(e) => setForm(f => ({ ...f, issue_date: e.target.value }))} required />
            </div>
            <div>
              <label className={labelClass}>Due Date</label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <Input value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes for client" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">{isPending ? 'Creating…' : 'Create & Add Line Items'}</Button>
            <Button type="button" variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </>
  )
}
