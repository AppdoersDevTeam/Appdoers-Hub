'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SlideOver } from '@/components/ui/slide-over'
import { saveRecapAction } from '@/lib/actions/recaps'
import { cn } from '@/lib/utils/cn'

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

const labelClass = 'block text-xs font-medium text-[#94A3B8] mb-1'
const selectClass = 'w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#3B82F6] focus:outline-none'

export function RecapsList({
  recaps,
  clients,
}: {
  recaps: RecapRow[]
  clients: { id: string; company_name: string }[]
}) {
  const [isPending, startTransition] = useTransition()
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      window.location.href = `/app/recaps/${result.data.id}`
    })
  }

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setShowNew(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> New Recap
        </Button>
      </div>

      <div className="hub-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1F2D45]">
                {['Period', 'Client', 'Status', 'Created', 'Sent'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#475569]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2D45]">
              {recaps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[#475569]">
                    No recaps yet. Create your first monthly recap above.
                  </td>
                </tr>
              ) : (
                recaps.map((r) => (
                  <tr key={r.id} className="hover:bg-[#1C2537] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#F1F5F9]">
                      <Link href={`/app/recaps/${r.id}`} className="hover:text-[#3B82F6] transition-colors">
                        {MONTHS[r.month - 1]} {r.year}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#CBD5E1]">{r.client_name}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                        r.is_sent
                          ? 'bg-[#10B981]/10 text-[#10B981]'
                          : 'bg-[#94A3B8]/10 text-[#94A3B8]'
                      )}>
                        {r.is_sent ? 'Sent' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#475569]">
                      {new Date(r.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-[#475569]">
                      {r.sent_at
                        ? new Date(r.sent_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SlideOver open={showNew} onClose={() => setShowNew(false)} title="New Monthly Recap" subtitle="Select a client and period to begin">
        <form onSubmit={handleCreate} className="space-y-5 px-6 py-5">
          {error && <div className="rounded-md border border-[#EF4444]/20 bg-[#EF4444]/10 px-4 py-2 text-sm text-[#EF4444]">{error}</div>}
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
