'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff, Send, Download, Save, FileText, FilePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SectionEditor } from './section-editor'
import { PricingTableEditor } from './pricing-table-editor'
import { ProposalPreview } from './proposal-preview'
import { saveProposalDraftAction, sendProposalAction } from '@/lib/actions/proposals'
import { generateContractAction } from '@/lib/actions/contracts'
import { cn } from '@/lib/utils/cn'

interface Section {
  id: string
  title: string
  content: string
  pricing_items?: PricingItem[]
}

export interface PricingItem {
  id: string
  service_id: string | null
  name: string
  description: string
  setup_fee: number
  monthly_fee: number
}

interface Service {
  id: string
  name: string
  type: string
  plan_key: string | null
  setup_fee: number
  monthly_fee: number
}

interface Proposal {
  id: string
  title: string
  version: number
  status: string
  sections: Section[]
  total_setup: number | null
  total_monthly: number | null
  sent_at: string | null
  client_id: string
}

interface Client {
  id: string
  company_name: string
  contact_name?: string | null
  contact_email?: string | null
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-500' },
  sent: { label: 'Sent', cls: 'bg-blue-50 text-blue-700' },
  approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700' },
  declined: { label: 'Declined', cls: 'bg-red-50 text-red-700' },
  expired: { label: 'Expired', cls: 'bg-amber-50 text-amber-700' },
}

export function ProposalBuilder({
  proposal,
  client,
  services,
}: {
  proposal: Proposal
  client: Client | null
  services: Service[]
}) {
  const [isPending, startTransition] = useTransition()
  const [sections, setSections] = useState<Section[]>(proposal.sections ?? [])
  const [title, setTitle] = useState(proposal.title)
  const [preview, setPreview] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(sections[0]?.id ?? null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [sendConfirm, setSendConfirm] = useState(false)
  const [isSent, setIsSent] = useState(proposal.status === 'sent' || proposal.status === 'approved')
  const [generatingContract, setGeneratingContract] = useState(false)

  const totalSetup = sections
    .flatMap((s) => s.pricing_items ?? [])
    .reduce((sum, item) => sum + (item.setup_fee || 0), 0)

  const totalMonthly = sections
    .flatMap((s) => s.pricing_items ?? [])
    .reduce((sum, item) => sum + (item.monthly_fee || 0), 0)

  const doSave = useCallback(
    (secs: Section[], t: string) => {
      setSaveStatus('saving')
      startTransition(async () => {
        await saveProposalDraftAction(proposal.id, secs, t, totalSetup, totalMonthly)
        setSaveStatus('saved')
      })
    },
    [proposal.id, totalSetup, totalMonthly]
  )

  // Auto-save every 30 seconds when unsaved
  useEffect(() => {
    if (saveStatus !== 'unsaved') return
    const timer = setTimeout(() => doSave(sections, title), 30_000)
    return () => clearTimeout(timer)
  }, [saveStatus, sections, title, doSave])

  const updateSection = (id: string, content: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, content } : s)))
    setSaveStatus('unsaved')
  }

  const updatePricing = (items: PricingItem[]) => {
    setSections((prev) =>
      prev.map((s) => (s.id === 'investment' ? { ...s, pricing_items: items } : s))
    )
    setSaveStatus('unsaved')
  }

  const handleSend = () => {
    startTransition(async () => {
      await doSave(sections, title)
      await sendProposalAction(proposal.id)
      setIsSent(true)
      setSendConfirm(false)
    })
  }

  const investmentSection = sections.find((s) => s.id === 'investment')
  const pricingItems = investmentSection?.pricing_items ?? []

  const st = statusConfig[proposal.status] ?? statusConfig.draft

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-4 border-b border-slate-200 bg-slate-50 px-6 py-3">
        <Link href="/app/proposals" className="text-slate-500 hover:text-slate-600 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex flex-1 items-center gap-3">
          <Input
            value={title}
            onChange={(e) => { setTitle(e.target.value); setSaveStatus('unsaved') }}
            className="max-w-sm border-transparent bg-transparent text-slate-900 font-medium hover:border-slate-300 focus:border-blue-500"
          />
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', st.cls)}>{st.label}</span>
          {client && <span className="text-sm text-slate-500">{client.company_name}</span>}
          <span className="text-xs text-slate-500">v{proposal.version}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-xs', saveStatus === 'saved' ? 'text-emerald-600' : saveStatus === 'saving' ? 'text-amber-600' : 'text-slate-500')}>
            {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : 'Unsaved changes'}
          </span>
          <Button size="sm" variant="outline" onClick={() => doSave(sections, title)} disabled={isPending}>
            <Save className="mr-1.5 h-3.5 w-3.5" /> Save
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPreview(!preview)}>
            {preview ? <><EyeOff className="mr-1.5 h-3.5 w-3.5" /> Edit</> : <><Eye className="mr-1.5 h-3.5 w-3.5" /> Preview</>}
          </Button>
          <a
            href={`/api/proposals/${proposal.id}/export-pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:border-blue-400 hover:bg-blue-100 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Download Quote PDF
          </a>
          <a
            href={`/api/proposals/${proposal.id}/export-docx`}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-transparent px-3 py-1.5 text-sm text-slate-500 hover:border-blue-600 hover:text-slate-900 transition-colors"
          >
            <FileText className="h-3.5 w-3.5" /> Word
          </a>
          {!isSent && (
            <Button size="sm" onClick={() => setSendConfirm(true)} disabled={isPending}>
              <Send className="mr-1.5 h-3.5 w-3.5" /> Send to Client
            </Button>
          )}
          {isSent && (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending || generatingContract}
              onClick={() => {
                setGeneratingContract(true)
                startTransition(async () => {
                  const result = await generateContractAction(proposal.id)
                  setGeneratingContract(false)
                  if (result.success) {
                    window.location.href = `/app/contracts/${result.data.id}`
                  }
                })
              }}
            >
              <FilePlus className="mr-1.5 h-3.5 w-3.5" /> Generate Contract
            </Button>
          )}
        </div>
      </div>

      {/* Send confirm banner */}
      {sendConfirm && (
        <div className="flex items-center gap-4 border-b border-amber-200 bg-amber-50 px-6 py-3">
          <p className="flex-1 text-sm text-amber-600">
            This will mark the proposal as <strong>Sent</strong> and notify the team on Slack. Are you sure?
          </p>
          <Button size="sm" onClick={handleSend} disabled={isPending}>Confirm Send</Button>
          <Button size="sm" variant="outline" onClick={() => setSendConfirm(false)}>Cancel</Button>
        </div>
      )}

      {preview ? (
        <div className="flex-1 overflow-auto">
          <ProposalPreview
            title={title}
            sections={sections}
            client={client}
            totalSetup={totalSetup}
            totalMonthly={totalMonthly}
          />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Section nav */}
          <div className="w-52 shrink-0 border-r border-slate-200 bg-white overflow-y-auto py-4">
            <p className="px-4 pb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Sections</p>
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm transition-colors',
                  activeSection === s.id
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                )}
              >
                {s.title}
              </button>
            ))}
          </div>

          {/* Editor area */}
          <div className="flex-1 overflow-y-auto p-6">
            {sections.map((s) => {
              if (s.id !== activeSection) return null
              if (s.id === 'investment') {
                return (
                  <PricingTableEditor
                    key={s.id}
                    section={s}
                    services={services}
                    pricingItems={pricingItems}
                    onUpdate={updatePricing}
                    onContentUpdate={(content) => updateSection(s.id, content)}
                    totalSetup={totalSetup}
                    totalMonthly={totalMonthly}
                  />
                )
              }
              return (
                <SectionEditor
                  key={s.id}
                  section={s}
                  onUpdate={(content) => updateSection(s.id, content)}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
