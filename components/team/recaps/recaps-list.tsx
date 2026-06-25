'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SlideOver } from '@/components/ui/slide-over'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { saveRecapAction, deleteRecapAction } from '@/lib/actions/recaps'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

interface RecapRow {
  id: string
  month: number
  year: number
  is_sent: boolean
  sent_at: string | null
  created_at: string
  client_name: string
}

const labelClass = 'block text-xs font-medium text-slate-500 mb-1'
const selectClass = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none'

export function RecapsList({
  recaps,
  clients,
}: {
  recaps: RecapRow[]
  clients: { id: string; company_name: string }[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RecapRow | null>(null)

  const now = new Date()
  const [form, setForm] = useState({
    client_id: '',
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.client_id) { setError('Client is required'); return }
    startTransition(async () => {
      const result = await saveRecapAction({
        client_id: form.client_id,
        month: form.month,
        year: form.year,
        intro_text: '',
        work_completed: [],
        performance_notes: '',
        coming_next: '',
      })
      if (!result.success) { setError(result.error); return }
      setShowNew(false)
      router.push(`/app/recaps/${result.data.id}`)
    })
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteRecapAction(deleteTarget.id)
      if (!result.success) {
        setError(result.error)
        return
      }
      setDeleteTarget(null)
      router.refresh()
    })
  }

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  return (
    <>
      {error && !showNew && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
      )}

      <div className="flex justify-end">
        <Button onClick={() => setShowNew(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> New Recap
        </Button>
      </div>

      <div className="hub-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {['Period', 'Client', 'Status', 'Created', 'Sent', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recaps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No recaps yet. Create your first monthly recap above.
                  </td>
                </tr>
              ) : (
                recaps.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link href={`/app/recaps/${r.id}`} className="hover:text-blue-600 transition-colors">
                        {MONTHS[r.month - 1]} {r.year}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.client_name}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                        r.is_sent
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      )}>
                        {r.is_sent ? 'Sent' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {r.sent_at
                        ? formatDate(r.sent_at)
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(r)}
                        disabled={isPending}
                        className="rounded p-1 text-slate-500 hover:text-red-600 transition-colors"
                        title="Delete recap"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Recap"
        message={`Delete the ${deleteTarget ? `${MONTHS[deleteTarget.month - 1]} ${deleteTarget.year}` : ''} recap for ${deleteTarget?.client_name}? This cannot be undone.`}
        confirmLabel="Delete Recap"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isPending={isPending}
      />

      <SlideOver open={showNew} onClose={() => setShowNew(false)} title="New Monthly Recap" subtitle="Select a client and period to begin">
        <form onSubmit={handleCreate} className="space-y-5 px-6 py-5">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}
          <div>
            <label className={labelClass}>Client *</label>
            <select className={selectClass} value={form.client_id} onChange={(e) => setForm(f => ({ ...f, client_id: e.target.value }))} required>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Month</label>
              <select className={selectClass} value={form.month} onChange={(e) => setForm(f => ({ ...f, month: Number(e.target.value) }))}>
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Year</label>
              <select className={selectClass} value={form.year} onChange={(e) => setForm(f => ({ ...f, year: Number(e.target.value) }))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">{isPending ? 'Creating…' : 'Create Recap'}</Button>
            <Button type="button" variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </>
  )
}
