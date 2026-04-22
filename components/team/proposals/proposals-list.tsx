'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SlideOver } from '@/components/ui/slide-over'
import { Input } from '@/components/ui/input'
import { createProposalAction, deleteProposalAction } from '@/lib/actions/proposals'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

const statusConfig: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-[#94A3B8]/10 text-[#94A3B8]' },
  sent: { label: 'Sent', cls: 'bg-[#3B82F6]/10 text-[#3B82F6]' },
  approved: { label: 'Approved', cls: 'bg-[#10B981]/10 text-[#10B981]' },
  declined: { label: 'Declined', cls: 'bg-[#EF4444]/10 text-[#EF4444]' },
  expired: { label: 'Expired', cls: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
}

interface ProposalRow {
  id: string; title: string; version: number; status: string
  created_at: string; sent_at: string | null
  total_setup: number | null; total_monthly: number | null; client_name: string
}

const labelClass = 'block text-xs font-medium text-[#94A3B8] mb-1'
const selectClass = 'w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#3B82F6] focus:outline-none'

export function ProposalsList({
  proposals,
  clients,
  templates,
}: {
  proposals: ProposalRow[]
  clients: { id: string; company_name: string }[]
  templates: { id: string; name: string; plan_key: string }[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ client_id: '', template_id: '', title: '' })
  const [deleteTarget, setDeleteTarget] = useState<ProposalRow | null>(null)

  const handleDelete = () => {
    if (!deleteTarget) return
    startTransition(async () => {
      await deleteProposalAction(deleteTarget.id)
      setDeleteTarget(null)
      router.refresh()
    })
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.client_id || !form.template_id || !form.title.trim()) {
      setError('All fields are required')
      return
    }
    startTransition(async () => {
      const result = await createProposalAction(form.client_id, form.template_id, form.title)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.push(`/app/proposals/${result.data.id}`)
    })
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setShowNew(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> New Proposal
        </Button>
      </div>

      <div className="hub-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1F2D45]">
                {['Title', 'Client', 'Version', 'Status', 'Setup', 'Monthly', 'Created', 'Sent', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#475569]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2D45]">
              {proposals.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-[#475569]">No proposals yet. Create your first proposal.</td></tr>
              ) : (
                proposals.map((p) => {
                  const st = statusConfig[p.status] ?? statusConfig.draft
                  return (
                    <tr key={p.id} className="hover:bg-[#1C2537] transition-colors">
                      <td className="px-4 py-3 font-medium text-[#F1F5F9]">
                        <Link href={`/app/proposals/${p.id}`} className="hover:text-[#3B82F6] transition-colors">{p.title}</Link>
                      </td>
                      <td className="px-4 py-3 text-[#CBD5E1]">{p.client_name}</td>
                      <td className="px-4 py-3 text-[#CBD5E1]">v{p.version}</td>
                      <td className="px-4 py-3">
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', st.cls)}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-[#CBD5E1]">{p.total_setup ? formatCurrency(Number(p.total_setup)) : '—'}</td>
                      <td className="px-4 py-3 text-[#CBD5E1]">{p.total_monthly ? `${formatCurrency(Number(p.total_monthly))}/mo` : '—'}</td>
                      <td className="px-4 py-3 text-[#475569]">{formatDate(p.created_at)}</td>
                      <td className="px-4 py-3 text-[#475569]">{p.sent_at ? formatDate(p.sent_at) : '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDeleteTarget(p)}
                          disabled={isPending}
                          className="rounded p-1 text-[#475569] hover:text-[#EF4444] transition-colors"
                          title="Delete proposal"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Proposal"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete Proposal"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isPending={isPending}
      />

      <SlideOver open={showNew} onClose={() => setShowNew(false)} title="New Proposal" subtitle="Select a client and template to begin">
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
            <label className={labelClass}>Template *</label>
            <select className={selectClass} value={form.template_id} onChange={(e) => {
              const t = templates.find(t => t.id === e.target.value)
              setForm(f => ({ ...f, template_id: e.target.value, title: t ? `${t.name} Proposal` : f.title }))
            }} required>
              <option value="">Select template…</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Proposal Title *</label>
            <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Acme Ltd — Launch Tier Proposal" required />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">{isPending ? 'Creating…' : 'Create & Open Builder'}</Button>
            <Button type="button" variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </>
  )
}
