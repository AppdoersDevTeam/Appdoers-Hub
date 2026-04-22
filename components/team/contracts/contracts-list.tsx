'use client'

import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

const statusConfig: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-[#94A3B8]/10 text-[#94A3B8]' },
  sent: { label: 'Sent', cls: 'bg-[#3B82F6]/10 text-[#3B82F6]' },
  signed: { label: 'Signed', cls: 'bg-[#10B981]/10 text-[#10B981]' },
  expired: { label: 'Expired', cls: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
  cancelled: { label: 'Cancelled', cls: 'bg-[#EF4444]/10 text-[#EF4444]' },
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
            <tr className="border-b border-[#1F2D45]">
              {['Title', 'Client', 'Linked Proposal', 'Status', 'Created', 'Sent', 'Signed'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#475569]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F2D45]">
            {contracts.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-[#475569]">No contracts yet. Generate a contract from a proposal.</td></tr>
            ) : (
              contracts.map((c) => {
                const st = statusConfig[c.status] ?? statusConfig.draft
                return (
                  <tr key={c.id} className="hover:bg-[#1C2537] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#F1F5F9]">
                      <Link href={`/app/contracts/${c.id}`} className="hover:text-[#3B82F6] transition-colors">{c.title}</Link>
                    </td>
                    <td className="px-4 py-3 text-[#CBD5E1]">{c.client_name}</td>
                    <td className="px-4 py-3 text-[#475569]">{c.proposal_title ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', st.cls)}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-[#475569]">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3 text-[#475569]">{c.sent_at ? formatDate(c.sent_at) : '—'}</td>
                    <td className="px-4 py-3 text-[#475569]">{c.signed_at ? formatDate(c.signed_at) : '—'}</td>
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
