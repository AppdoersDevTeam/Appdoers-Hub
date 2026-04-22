'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Send, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateInvoiceAction, sendInvoiceAction, markInvoicePaidAction, type InvoiceLine } from '@/lib/actions/invoices'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

interface Invoice {
  id: string
  invoice_number: string
  status: string
  type: string
  issue_date: string
  due_date: string
  lines: InvoiceLine[]
  subtotal: number
  gst_amount: number
  total: number
  notes: string | null
  paid_at: string | null
  sent_at: string | null
  payment_reference: string | null
  client_id: string
  project_id: string | null
}

interface Client {
  id: string
  company_name: string
  contact_name: string | null
  contact_email: string | null
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-[#94A3B8]/10 text-[#94A3B8]' },
  sent: { label: 'Sent', cls: 'bg-[#3B82F6]/10 text-[#3B82F6]' },
  overdue: { label: 'Overdue', cls: 'bg-[#EF4444]/10 text-[#EF4444]' },
  paid: { label: 'Paid', cls: 'bg-[#10B981]/10 text-[#10B981]' },
}

const labelClass = 'block text-xs font-medium text-[#94A3B8] mb-1'

export function InvoiceEditor({
  invoice,
  client,
  project,
  allClients,
  allProjects,
}: {
  invoice: Invoice
  client: Client | null
  project: { id: string; name: string } | null
  allClients: { id: string; company_name: string }[]
  allProjects: { id: string; name: string; client_id: string }[]
}) {
  const [isPending, startTransition] = useTransition()
  const [lines, setLines] = useState<InvoiceLine[]>(invoice.lines ?? [])
  const [issueDate, setIssueDate] = useState(invoice.issue_date)
  const [dueDate, setDueDate] = useState(invoice.due_date)
  const [notes, setNotes] = useState(invoice.notes ?? '')
  const [sendConfirm, setSendConfirm] = useState(false)
  const [showPaidForm, setShowPaidForm] = useState(false)
  const [paymentRef, setPaymentRef] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isLocked = invoice.status === 'paid' || invoice.status === 'cancelled'
  const today = new Date().toISOString().split('T')[0]
  const isOverdue = invoice.status === 'sent' && invoice.due_date < today

  const subtotal = lines.reduce((sum, l) => sum + (l.amount || 0), 0)
  const gstAmount = parseFloat((subtotal * 0.15).toFixed(2))
  const total = parseFloat((subtotal + gstAmount).toFixed(2))

  const updateLine = (i: number, field: keyof InvoiceLine, value: string | number | null) => {
    setLines((prev) => {
      const updated = prev.map((l, idx) => {
        if (idx !== i) return l
        const newLine = { ...l, [field]: value }
        if (field === 'quantity' || field === 'unit_price') {
          newLine.amount = parseFloat(((Number(newLine.quantity) || 0) * (Number(newLine.unit_price) || 0)).toFixed(2))
        }
        return newLine
      })
      return updated
    })
  }

  const addLine = () => {
    setLines((prev) => [...prev, { description: '', quantity: 1, unit_price: 0, amount: 0 }])
  }

  const removeLine = (i: number) => {
    setLines((prev) => prev.filter((_, idx) => idx !== i))
  }

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateInvoiceAction(invoice.id, {
        issue_date: issueDate,
        due_date: dueDate,
        lines,
        notes: notes || undefined,
      })
      if (!result.success) setError(result.error)
    })
  }

  const handleSend = () => {
    startTransition(async () => {
      await updateInvoiceAction(invoice.id, { issue_date: issueDate, due_date: dueDate, lines, notes: notes || undefined })
      const result = await sendInvoiceAction(invoice.id)
      if (!result.success) { setError(result.error); return }
      setSendConfirm(false)
      window.location.reload()
    })
  }

  const handleMarkPaid = () => {
    startTransition(async () => {
      const result = await markInvoicePaidAction(invoice.id, paymentRef || undefined)
      if (!result.success) { setError(result.error); return }
      setShowPaidForm(false)
      window.location.reload()
    })
  }

  const st = statusConfig[invoice.status] ?? statusConfig.draft

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center gap-4">
        <Link href="/app/invoices" className="text-[#475569] hover:text-[#94A3B8] transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex flex-1 items-center gap-3">
          <h1 className="text-xl font-bold text-[#F1F5F9] font-mono">{invoice.invoice_number}</h1>
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', st.cls, isOverdue && invoice.status === 'sent' && 'bg-[#EF4444]/10 text-[#EF4444]')}>
            {isOverdue && invoice.status === 'sent' ? 'Overdue' : st.label}
          </span>
          {client && <span className="text-sm text-[#475569]">{client.company_name}</span>}
          {project && <span className="text-sm text-[#475569]">· {project.name}</span>}
        </div>
        <div className="flex items-center gap-2">
          {!isLocked && (
            <Button size="sm" variant="outline" onClick={handleSave} disabled={isPending}>Save</Button>
          )}
          {invoice.status === 'draft' && (
            <Button size="sm" onClick={() => setSendConfirm(true)} disabled={isPending}>
              <Send className="mr-1.5 h-3.5 w-3.5" /> Send to Client
            </Button>
          )}
          {(invoice.status === 'sent' || isOverdue) && (
            <Button size="sm" onClick={() => setShowPaidForm(true)} disabled={isPending}>
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Mark Paid
            </Button>
          )}
        </div>
      </div>

      {/* Banners */}
      {sendConfirm && (
        <div className="flex items-center gap-4 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-3">
          <p className="flex-1 text-sm text-[#F59E0B]">This will mark the invoice as <strong>Sent</strong> and notify the team. Confirm?</p>
          <Button size="sm" onClick={handleSend} disabled={isPending}>Confirm Send</Button>
          <Button size="sm" variant="outline" onClick={() => setSendConfirm(false)}>Cancel</Button>
        </div>
      )}
      {showPaidForm && (
        <div className="flex items-center gap-3 rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-4 py-3">
          <p className="text-sm text-[#10B981] shrink-0">Mark as Paid</p>
          <Input
            value={paymentRef}
            onChange={(e) => setPaymentRef(e.target.value)}
            placeholder="Payment reference (optional)"
            className="max-w-xs"
          />
          <Button size="sm" onClick={handleMarkPaid} disabled={isPending}>Confirm</Button>
          <Button size="sm" variant="outline" onClick={() => setShowPaidForm(false)}>Cancel</Button>
        </div>
      )}
      {invoice.status === 'paid' && (
        <div className="rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-4 py-3">
          <p className="text-sm text-[#10B981]">
            ✓ Paid {invoice.paid_at ? `on ${formatDate(invoice.paid_at)}` : ''}
            {invoice.payment_reference && ` · Ref: ${invoice.payment_reference}`}
          </p>
        </div>
      )}
      {error && <div className="rounded-md border border-[#EF4444]/20 bg-[#EF4444]/10 px-4 py-2 text-sm text-[#EF4444]">{error}</div>}

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Invoice details */}
        <div className="col-span-2 space-y-6">
          {/* Meta */}
          <div className="hub-card grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Client</label>
              <p className="text-sm text-[#F1F5F9]">{client?.company_name ?? '—'}</p>
              {client?.contact_name && <p className="text-xs text-[#475569] mt-0.5">{client.contact_name}</p>}
            </div>
            <div>
              <label className={labelClass}>Issue Date</label>
              {isLocked
                ? <p className="text-sm text-[#F1F5F9]">{formatDate(issueDate)}</p>
                : <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />}
            </div>
            <div>
              <label className={labelClass}>Due Date</label>
              {isLocked
                ? <p className={cn('text-sm', isOverdue ? 'text-[#EF4444] font-medium' : 'text-[#F1F5F9]')}>{formatDate(dueDate)}</p>
                : <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}
            </div>
          </div>

          {/* Line items */}
          <div className="hub-card overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-[#1F2D45] px-4 py-3">
              <p className="text-sm font-medium text-[#F1F5F9]">Line Items</p>
              {!isLocked && (
                <Button size="sm" variant="outline" onClick={addLine}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Line
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1F2D45]">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#475569]">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#475569] w-24">Qty / Hrs</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#475569] w-28">Unit Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#475569] w-28">Amount</th>
                    {!isLocked && <th className="w-10" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2D45]">
                  {lines.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-[#475569]">No line items yet. Click "Add Line" to begin.</td></tr>
                  ) : (
                    lines.map((line, i) => (
                      <tr key={i} className="hover:bg-[#1C2537] transition-colors">
                        <td className="px-4 py-2">
                          {isLocked
                            ? <p className="text-[#CBD5E1]">{line.description}</p>
                            : <Input value={line.description} onChange={(e) => updateLine(i, 'description', e.target.value)} className="border-transparent bg-transparent text-[#F1F5F9] hover:border-[#1F2D45] focus:border-[#3B82F6]" placeholder="Description" />}
                        </td>
                        <td className="px-4 py-2">
                          {isLocked
                            ? <p className="text-right text-[#CBD5E1]">{line.quantity}</p>
                            : <Input type="number" min={0} step={0.5} value={line.quantity} onChange={(e) => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)} className="border-transparent bg-transparent text-right text-[#CBD5E1] hover:border-[#1F2D45] focus:border-[#3B82F6]" />}
                        </td>
                        <td className="px-4 py-2">
                          {isLocked
                            ? <p className="text-right text-[#CBD5E1]">{formatCurrency(line.unit_price)}</p>
                            : <Input type="number" min={0} step={0.01} value={line.unit_price} onChange={(e) => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)} className="border-transparent bg-transparent text-right text-[#CBD5E1] hover:border-[#1F2D45] focus:border-[#3B82F6]" />}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-[#F1F5F9]">
                          {formatCurrency(line.amount)}
                        </td>
                        {!isLocked && (
                          <td className="px-4 py-2">
                            <button onClick={() => removeLine(i)} className="rounded p-1 text-[#475569] hover:bg-[#1F2D45] hover:text-[#EF4444]">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div className="hub-card space-y-2">
            <label className={labelClass}>Notes for Client</label>
            {isLocked
              ? <p className="text-sm text-[#CBD5E1]">{notes || '—'}</p>
              : <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] placeholder:text-[#475569] focus:border-[#3B82F6] focus:outline-none resize-none"
                  placeholder="Payment instructions, bank account details, etc."
                />}
          </div>
        </div>

        {/* Right: Totals */}
        <div className="space-y-4">
          <div className="hub-card space-y-3">
            <h3 className="text-sm font-semibold text-[#F1F5F9]">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-[#CBD5E1]">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#CBD5E1]">
                <span>GST (15%)</span>
                <span>{formatCurrency(gstAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-[#1F2D45] pt-2 font-bold text-[#F1F5F9]">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div className="hub-card space-y-3 text-sm">
            <h3 className="text-sm font-semibold text-[#F1F5F9]">Details</h3>
            <div>
              <p className="text-xs text-[#475569]">Invoice #</p>
              <p className="font-mono text-[#CBD5E1]">{invoice.invoice_number}</p>
            </div>
            <div>
              <p className="text-xs text-[#475569]">Type</p>
              <p className="text-[#CBD5E1] capitalize">{invoice.type?.replace('_', ' ')}</p>
            </div>
            {invoice.sent_at && (
              <div>
                <p className="text-xs text-[#475569]">Sent</p>
                <p className="text-[#CBD5E1]">{formatDate(invoice.sent_at)}</p>
              </div>
            )}
            {invoice.paid_at && (
              <div>
                <p className="text-xs text-[#475569]">Paid</p>
                <p className="text-[#10B981]">{formatDate(invoice.paid_at)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
