'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Send, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateContractAction, sendContractAction } from '@/lib/actions/contracts'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

interface ContractSection {
  id: string
  title: string
  content: string
}

interface Contract {
  id: string
  title: string
  status: string
  content: ContractSection[]
  created_at: string
  sent_at: string | null
  signed_at: string | null
  signed_by_name: string | null
  signed_by_email: string | null
  client_id: string
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
  signed: { label: 'Signed', cls: 'bg-[#10B981]/10 text-[#10B981]' },
  expired: { label: 'Expired', cls: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
  cancelled: { label: 'Cancelled', cls: 'bg-[#EF4444]/10 text-[#EF4444]' },
}

export function ContractEditor({
  contract,
  client,
  proposal,
}: {
  contract: Contract
  client: Client | null
  proposal: { id: string; title: string } | null
}) {
  const [isPending, startTransition] = useTransition()
  const [sections, setSections] = useState<ContractSection[]>(contract.content ?? [])
  const [activeSection, setActiveSection] = useState<string | null>(sections[0]?.id ?? null)
  const [sendConfirm, setSendConfirm] = useState(false)
  const [isSent, setIsSent] = useState(contract.status === 'sent' || contract.status === 'signed')
  const signerDisplay = contract.signed_by_name ?? contract.signed_by_email

  const updateSection = (id: string, content: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, content } : s)))
  }

  const handleSave = () => {
    startTransition(async () => {
      await updateContractAction(contract.id, sections)
    })
  }

  const handleSend = () => {
    startTransition(async () => {
      await updateContractAction(contract.id, sections)
      await sendContractAction(contract.id)
      setIsSent(true)
      setSendConfirm(false)
    })
  }

  const st = statusConfig[contract.status] ?? statusConfig.draft
  const portalLink = `/portal/contracts/${contract.id}`

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-4 border-b border-[#1F2D45] bg-[#0D1526] px-6 py-3">
        <Link href="/app/contracts" className="text-[#475569] hover:text-[#94A3B8] transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex flex-1 items-center gap-3">
          <h1 className="font-semibold text-[#F1F5F9]">{contract.title}</h1>
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', st.cls)}>{st.label}</span>
          {client && <span className="text-sm text-[#475569]">{client.company_name}</span>}
        </div>
        <div className="flex items-center gap-2">
          {proposal && (
            <Link href={`/app/proposals/${proposal.id}`} className="inline-flex items-center gap-1.5 text-xs text-[#475569] hover:text-[#94A3B8] transition-colors">
              <ExternalLink className="h-3 w-3" /> Proposal
            </Link>
          )}
          <Button size="sm" variant="outline" onClick={handleSave} disabled={isPending}>
            Save
          </Button>
          {isSent && (
            <a
              href={portalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-[#1F2D45] px-3 py-1.5 text-sm text-[#94A3B8] hover:border-[#3B82F6] hover:text-[#F1F5F9] transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Portal Link
            </a>
          )}
          {!isSent && (
            <Button size="sm" onClick={() => setSendConfirm(true)} disabled={isPending}>
              <Send className="mr-1.5 h-3.5 w-3.5" /> Send to Client
            </Button>
          )}
        </div>
      </div>

      {/* Send confirm banner */}
      {sendConfirm && (
        <div className="flex items-center gap-4 border-b border-[#F59E0B]/30 bg-[#F59E0B]/10 px-6 py-3">
          <p className="flex-1 text-sm text-[#F59E0B]">
            This will mark the contract as <strong>Sent</strong> and the client can sign it via the portal. Notify team on Slack?
          </p>
          <Button size="sm" onClick={handleSend} disabled={isPending}>Confirm Send</Button>
          <Button size="sm" variant="outline" onClick={() => setSendConfirm(false)}>Cancel</Button>
        </div>
      )}

      {/* Signed info */}
      {contract.status === 'signed' && (
        <div className="flex items-center gap-4 border-b border-[#10B981]/30 bg-[#10B981]/10 px-6 py-3">
          <p className="text-sm text-[#10B981]">
            ✓ Signed by <strong>{signerDisplay}</strong>
            {contract.signed_at && ` on ${formatDate(contract.signed_at)}`}
          </p>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Section nav */}
        <div className="w-52 shrink-0 border-r border-[#1F2D45] bg-[#0A0F1E] overflow-y-auto py-4">
          <p className="px-4 pb-2 text-xs font-medium uppercase tracking-wide text-[#475569]">Sections</p>
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                'w-full px-4 py-2 text-left text-sm transition-colors',
                activeSection === s.id
                  ? 'bg-[#1C2537] text-[#F1F5F9]'
                  : 'text-[#94A3B8] hover:bg-[#1C2537]/50 hover:text-[#CBD5E1]'
              )}
            >
              {s.title}
            </button>
          ))}

          {/* Meta info */}
          <div className="mt-6 border-t border-[#1F2D45] px-4 pt-4 space-y-3">
            <div>
              <p className="text-xs text-[#475569]">Created</p>
              <p className="text-xs text-[#94A3B8]">{formatDate(contract.created_at)}</p>
            </div>
            {contract.sent_at && (
              <div>
                <p className="text-xs text-[#475569]">Sent</p>
                <p className="text-xs text-[#94A3B8]">{formatDate(contract.sent_at)}</p>
              </div>
            )}
            {contract.signed_at && (
              <div>
                <p className="text-xs text-[#475569]">Signed</p>
                <p className="text-xs text-[#94A3B8]">{formatDate(contract.signed_at)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto p-6">
          {sections.map((s) => {
            if (s.id !== activeSection) return null
            return (
              <div key={s.id} className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#F1F5F9]">{s.title}</h2>
                </div>
                <textarea
                  value={s.content}
                  onChange={(e) => updateSection(s.id, e.target.value)}
                  rows={22}
                  disabled={contract.status === 'signed'}
                  className="w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-4 py-3 text-sm text-[#F1F5F9] placeholder:text-[#475569] focus:border-[#3B82F6] focus:outline-none resize-y leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder={`Write the ${s.title.toLowerCase()} clause here…`}
                />
                {contract.status === 'signed' && (
                  <p className="text-xs text-[#475569]">This contract has been signed and cannot be edited.</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
