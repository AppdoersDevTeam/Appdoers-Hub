'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SlideOver } from '@/components/ui/slide-over'
import { createInvoiceAction } from '@/lib/actions/invoices'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

const statusConfig: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-[#94A3B8]/10 text-[#94A3B8]' },
  sent: { label: 'Sent', cls: 'bg-[#3B82F6]/10 text-[#3B82F6]' },
  overdue: { label: 'Overdue', cls: 'bg-[#EF4444]/10 text-[#EF4444]' },
  paid: { label: 'Paid', cls: 'bg-[#10B981]/10 text-[#10B981]' },
  cancelled: { label: 'Cancelled', cls: 'bg-[#475569]/10 text-[#475569]' },
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

const labelClass = 'block text-xs font-medium text-[#94A3B8] mb-1'
const selectClass = 'w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#3B82F6] focus:outline-none'

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
      window.location.href = `/app/invoices/${result.data.id}`
    })
  }

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="hub-card">
          <p className="text-xs text-[#475569]">Outstanding</p>
          <p className="mt-1 text-2xl font-bold text-[#F1F5F9]">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className={cn('hub-card', totalOverdue > 0 && 'border-[#EF4444]/30')}>
          <p className="text-xs text-[#475569]">Overdue</p>
          <p className={cn('mt-1 text-2xl font-bold', totalOverdue > 0 ? 'text-[#EF4444]' : 'text-[#F1F5F9]')}>{formatCurrency(totalOverdue)}</p>
        </div>
        <div className="hub-card">
          <p className="text-xs text-[#475569]">Paid This Month</p>
          <p className="mt-1 text-2xl font-bold text-[#10B981]">{formatCurrency(totalPaidThisMonth)}</p>
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
              <tr className="border-b border-[#1F2D45]">
                {['Invoice #', 'Client', 'Project', 'Status', 'Issue Date', 'Due Date', 'Total (incl. GST)', 'Paid'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#475569]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2D45]">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-[#475569]">No invoices found.</td></tr>
              ) : (
                filtered.map((inv) => {
                  const displayStatus = inv.is_overdue && inv.status === 'sent' ? 'overdue' : inv.status
                  const st = statusConfig[displayStatus] ?? statusConfig.draft
                  return (
                    <tr key={inv.id} className={cn('hover:bg-[#1C2537] transition-colors', inv.is_overdue && 'border-l-2 border-l-[#EF4444]')}>
                      <td className="px-4 py-3 font-medium text-[#F1F5F9]">
                        <Link href={`/app/invoices/${inv.id}`} className="hover:text-[#3B82F6] transition-colors font-mono">{inv.invoice_number}</Link>
                      </td>
                      <td className="px-4 py-3 text-[#CBD5E1]">{inv.client_name}</td>
                      <td className="px-4 py-3 text-[#475569]">{inv.project_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', st.cls)}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-[#475569]">{formatDate(inv.issue_date)}</td>
                      <td className={cn('px-4 py-3', inv.is_overdue ? 'text-[#EF4444] font-medium' : 'text-[#475569]')}>{formatDate(inv.due_date)}</td>
                      <td className="px-4 py-3 font-medium text-[#F1F5F9]">{formatCurrency(inv.total)}</td>
                      <td className="px-4 py-3 text-[#475569]">{inv.paid_at ? formatDate(inv.paid_at) : '—'}</td>
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
          {error && <div className="rounded-md border border-[#EF4444]/20 bg-[#EF4444]/10 px-4 py-2 text-sm text-[#EF4444]">{error}</div>}
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
