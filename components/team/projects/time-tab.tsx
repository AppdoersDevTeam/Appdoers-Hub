'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { logTimeAction, deleteTimeEntryAction } from '@/lib/actions/time'
import { createInvoiceFromTimeAction } from '@/lib/actions/invoices'
import { formatDate } from '@/lib/utils/format'
import { formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import type { TeamUser } from '@/lib/types/database'

interface TimeEntry {
  id: string
  date: string
  hours: number
  description: string | null
  is_billable: boolean
  is_invoiced: boolean
  task_id: string | null
  team_user_id: string
  team_users: { full_name: string; hourly_rate: number | null } | null
  tasks: { title: string } | null
}

interface Props {
  projectId: string
  clientId: string
  entries: TimeEntry[]
  estimatedHours: number | null
  teamMembers: Pick<TeamUser, 'id' | 'full_name'>[]
  currentUserId: string
  tasks: { id: string; title: string }[]
}

const labelClass = 'block text-xs font-medium text-[#94A3B8] mb-1'
const selectClass = 'w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#3B82F6] focus:outline-none'

export function TimeTab({ projectId, clientId, entries, estimatedHours, teamMembers, currentUserId, tasks }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [invoiceDueDate, setInvoiceDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  )

  const uninvoicedBillable = entries.filter((e) => e.is_billable && !e.is_invoiced)

  const [form, setForm] = useState({
    team_user_id: currentUserId,
    task_id: '',
    date: new Date().toISOString().split('T')[0],
    hours: '',
    description: '',
    is_billable: true,
  })

  const set = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  // Summaries
  const totalHours = entries.reduce((s, e) => s + Number(e.hours), 0)
  const billableHours = entries.filter((e) => e.is_billable).reduce((s, e) => s + Number(e.hours), 0)
  const billableValue = entries
    .filter((e) => e.is_billable)
    .reduce((s, e) => s + Number(e.hours) * (Number(e.team_users?.hourly_rate) || 0), 0)

  const handleLog = (ev: React.FormEvent) => {
    ev.preventDefault()
    setError(null)
    if (!form.hours || parseFloat(form.hours) <= 0) { setError('Hours must be greater than 0'); return }

    startTransition(async () => {
      const result = await logTimeAction({
        project_id: projectId,
        task_id: form.task_id || undefined,
        team_user_id: form.team_user_id,
        date: form.date,
        hours: parseFloat(form.hours),
        description: form.description || undefined,
        is_billable: form.is_billable,
      })
      if (!result.success) { setError(result.error); return }
      setForm(f => ({ ...f, hours: '', description: '', task_id: '' }))
      setShowForm(false)
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteTimeEntryAction(id, projectId)
      if (!result.success) setError(result.error)
    })
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Hours', value: `${totalHours.toFixed(1)}h` },
          { label: 'Billable Hours', value: `${billableHours.toFixed(1)}h` },
          { label: 'Billable Value', value: formatCurrency(billableValue) },
          { label: 'Estimated', value: estimatedHours ? `${estimatedHours}h` : '—' },
        ].map((s) => (
          <div key={s.label} className="hub-card py-3">
            <p className="text-xs text-[#475569]">{s.label}</p>
            <p className="mt-1 text-lg font-semibold text-[#F1F5F9]">{s.value}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-md border border-[#EF4444]/20 bg-[#EF4444]/10 px-4 py-2 text-sm text-[#EF4444]">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        {uninvoicedBillable.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => setShowInvoiceForm(!showInvoiceForm)}>
            🧾 Invoice {uninvoicedBillable.length} uninvoiced entries
          </Button>
        )}
        <div className="ml-auto">
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Log Time'}
          </Button>
        </div>
      </div>

      {showInvoiceForm && (
        <div className="hub-card flex items-center gap-4">
          <p className="text-sm text-[#CBD5E1] shrink-0">
            Create invoice for <strong>{uninvoicedBillable.length}</strong> billable entries
          </p>
          <div>
            <label className="block text-xs text-[#94A3B8] mb-1">Due Date</label>
            <Input type="date" value={invoiceDueDate} onChange={(e) => setInvoiceDueDate(e.target.value)} />
          </div>
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await createInvoiceFromTimeAction(
                  clientId,
                  projectId,
                  uninvoicedBillable.map((e) => e.id),
                  invoiceDueDate
                )
                if (result.success) {
                  window.location.href = `/app/invoices/${result.data.id}`
                } else {
                  setError(result.error)
                }
              })
            }}
          >
            {isPending ? 'Creating…' : 'Create Invoice'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowInvoiceForm(false)}>Cancel</Button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleLog} className="hub-card space-y-4">
          <h3 className="text-sm font-semibold text-[#F1F5F9]">Log Time</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Team Member</label>
              <select className={selectClass} value={form.team_user_id} onChange={(e) => set('team_user_id', e.target.value)}>
                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Task (optional)</label>
              <select className={selectClass} value={form.task_id} onChange={(e) => set('task_id', e.target.value)}>
                <option value="">No specific task</option>
                {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Date</label>
              <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
            </div>
            <div>
              <label className={labelClass}>Hours</label>
              <Input type="number" min={0.25} step={0.25} value={form.hours} onChange={(e) => set('hours', e.target.value)} placeholder="e.g. 2.5" required />
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <Input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What did you work on?" />
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_billable}
              onChange={(e) => set('is_billable', e.target.checked)}
              className="rounded border-[#1F2D45]"
            />
            <span className="text-sm text-[#CBD5E1]">Billable</span>
          </label>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Logging…' : 'Log Time'}
          </Button>
        </form>
      )}

      {/* Entries table */}
      <div className="hub-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1F2D45]">
                {['Date', 'Team Member', 'Task', 'Hours', 'Description', 'Billable', 'Invoiced', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#475569]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2D45]">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#475569]">
                    No time logged yet.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className={cn('transition-colors', entry.is_invoiced ? 'opacity-50' : 'hover:bg-[#1C2537]')}>
                    <td className="px-4 py-3 text-[#CBD5E1]">{formatDate(entry.date)}</td>
                    <td className="px-4 py-3 text-[#CBD5E1]">{entry.team_users?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-[#CBD5E1]">{entry.tasks?.title ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-[#F1F5F9]">{Number(entry.hours).toFixed(1)}h</td>
                    <td className="px-4 py-3 text-[#CBD5E1]">{entry.description ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {entry.is_billable ? <span className="text-[#10B981]">✓</span> : <span className="text-[#475569]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {entry.is_invoiced ? <span className="text-[#94A3B8]">Invoiced</span> : <span className="text-[#475569]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {!entry.is_invoiced && (
                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={isPending}
                          className="text-[#475569] hover:text-[#EF4444] transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
