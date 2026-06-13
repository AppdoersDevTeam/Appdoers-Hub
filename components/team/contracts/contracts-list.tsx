'use client'

import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

const statusConfig: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-500' },
  sent: { label: 'Sent', cls: 'bg-blue-50 text-blue-700' },
  signed: { label: 'Signed', cls: 'bg-emerald-50 text-emerald-700' },
  expired: { label: 'Expired', cls: 'bg-amber-50 text-amber-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-50 text-red-700' },
}

interface ContractRow {
  id: string
  title: string
  status: string
  created_at: string
  sent_at: string | null
  signed_at: string | null
  client_name: string
  proposal_title: string | null
}

export function ContractsList({ contracts }: { contracts: ContractRow[] }) {
  return (
    <div className="hub-card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {['Title', 'Client', 'Linked Proposal', 'Status', 'Created', 'Sent', 'Signed'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {contracts.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No contracts yet. Generate a contract from a proposal.</td></tr>
            ) : (
              contracts.map((c) => {
                const st = statusConfig[c.status] ?? statusConfig.draft
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link href={`/app/contracts/${c.id}`} className="hover:text-blue-600 transition-colors">{c.title}</Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.client_name}</td>
                    <td className="px-4 py-3 text-slate-500">{c.proposal_title ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', st.cls)}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3 text-slate-500">{c.sent_at ? formatDate(c.sent_at) : '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{c.signed_at ? formatDate(c.signed_at) : '—'}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
