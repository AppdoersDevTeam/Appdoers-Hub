'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Send, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { saveRecapAction, sendRecapAction, generateRecapDataAction, type RecapWorkItem } from '@/lib/actions/recaps'
import { cn } from '@/lib/utils/cn'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const WORK_CATEGORIES = ['Development', 'Design', 'SEO', 'Content', 'Maintenance', 'Meetings', 'Strategy', 'Other']

interface Recap {
  id: string
  client_id: string
  month: number
  year: number
  intro_text: string | null
  work_completed: RecapWorkItem[] | null
  performance_notes: string | null
  coming_next: string | null
  is_sent: boolean
}

const labelClass = 'block text-xs font-medium text-[#94A3B8] mb-1'
const selectClass = 'w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#3B82F6] focus:outline-none'
const textareaClass = 'w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] placeholder:text-[#475569] focus:border-[#3B82F6] focus:outline-none resize-y'

export function RecapEditor({
  recap,
  clientName,
  clientId,
}: {
  recap: Recap
  clientName: string
  clientId: string
}) {
  const [isPending, startTransition] = useTransition()
  const [introText, setIntroText] = useState(recap.intro_text ?? '')
  const [workItems, setWorkItems] = useState<RecapWorkItem[]>(recap.work_completed ?? [])
  const [performanceNotes, setPerformanceNotes] = useState(recap.performance_notes ?? '')
  const [comingNext, setComingNext] = useState(recap.coming_next ?? '')
  const [isSent, setIsSent] = useState(recap.is_sent)
  const [sendConfirm, setSendConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generateMsg, setGenerateMsg] = useState<string | null>(null)

  const periodLabel = `${MONTHS[recap.month - 1]} ${recap.year}`

  const addWorkItem = () => setWorkItems(prev => [...prev, { description: '', category: 'Development' }])
  const removeWorkItem = (i: number) => setWorkItems(prev => prev.filter((_, idx) => idx !== i))
  const updateWorkItem = (i: number, field: keyof RecapWorkItem, value: string) => {
    setWorkItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveRecapAction({
        client_id: recap.client_id,
        month: recap.month,
        year: recap.year,
        intro_text: introText,
        work_completed: workItems.filter(w => w.description.trim()),
        performance_notes: performanceNotes,
        coming_next: comingNext,
      }, recap.id)
      if (!result.success) setError(result.error)
    })
  }

  const handleSend = () => {
    startTransition(async () => {
      await saveRecapAction({
        client_id: recap.client_id,
        month: recap.month,
        year: recap.year,
        intro_text: introText,
        work_completed: workItems.filter(w => w.description.trim()),
        performance_notes: performanceNotes,
        coming_next: comingNext,
      }, recap.id)
      const result = await sendRecapAction(recap.id)
      if (!result.success) { setError(result.error); return }
      setIsSent(true)
      setSendConfirm(false)
    })
  }

  const handleAutoGenerate = () => {
    setGenerateMsg(null)
    startTransition(async () => {
      const result = await generateRecapDataAction(clientId, recap.month, recap.year)
      if (!result.success) { setError(result.error); return }

      const { tasksCompleted, hoursLogged, phasesCompleted, recentTasks } = result.data
      const generated: RecapWorkItem[] = recentTasks.map(t => ({
        description: t.title,
        category: t.type === 'design' ? 'Design' : t.type === 'content' ? 'Content' : 'Development',
      }))

      if (phasesCompleted.length > 0) {
        generated.unshift(...phasesCompleted.map(p => ({
          description: `Completed ${p.replace('_', ' ')} phase`,
          category: 'Development',
        })))
      }

      setWorkItems(generated)
      setGenerateMsg(`Auto-filled ${generated.length} work items · ${tasksCompleted} tasks closed · ${hoursLogged}h logged this month`)

      if (!introText) {
        setIntroText(`Hi there,\n\nHere's your monthly progress update for ${periodLabel}. It was a productive month — we completed ${tasksCompleted} task${tasksCompleted !== 1 ? 's' : ''} and logged ${hoursLogged} hours of work on your project.`)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center gap-4">
        <Link href="/app/recaps" className="text-[#475569] hover:text-[#94A3B8] transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex flex-1 items-center gap-3">
          <h1 className="text-xl font-bold text-[#F1F5F9]">{periodLabel} Recap</h1>
          <span className="text-sm text-[#475569]">—</span>
          <span className="text-sm text-[#475569]">{clientName}</span>
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', isSent ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#94A3B8]/10 text-[#94A3B8]')}>
            {isSent ? 'Sent' : 'Draft'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isSent && (
            <>
              <Button size="sm" variant="outline" onClick={handleAutoGenerate} disabled={isPending}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Auto-fill from Data
              </Button>
              <Button size="sm" variant="outline" onClick={handleSave} disabled={isPending}>Save Draft</Button>
              <Button size="sm" onClick={() => setSendConfirm(true)} disabled={isPending}>
                <Send className="mr-1.5 h-3.5 w-3.5" /> Send to Client
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Banners */}
      {sendConfirm && (
        <div className="flex items-center gap-4 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-3">
          <p className="flex-1 text-sm text-[#F59E0B]">This will mark the recap as <strong>Sent</strong> and notify the team. Confirm?</p>
          <Button size="sm" onClick={handleSend} disabled={isPending}>Confirm Send</Button>
          <Button size="sm" variant="outline" onClick={() => setSendConfirm(false)}>Cancel</Button>
        </div>
      )}
      {generateMsg && (
        <div className="rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-4 py-3 text-sm text-[#3B82F6]">
          ✓ {generateMsg}
        </div>
      )}
      {error && <div className="rounded-md border border-[#EF4444]/20 bg-[#EF4444]/10 px-4 py-2 text-sm text-[#EF4444]">{error}</div>}
      {isSent && (
        <div className="rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-4 py-3 text-sm text-[#10B981]">
          ✓ This recap has been sent to the client and is visible in their portal.
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">

          {/* Intro */}
          <div className="hub-card space-y-3">
            <h2 className="text-sm font-semibold text-[#F1F5F9]">Introduction</h2>
            <p className="text-xs text-[#475569]">Opening message to the client — friendly summary of the month.</p>
            <textarea
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
              rows={5}
              disabled={isSent}
              className={cn(textareaClass, isSent && 'opacity-60 cursor-not-allowed')}
              placeholder={`Hi there,\n\nHere's your ${periodLabel} progress update…`}
            />
          </div>

          {/* Work completed */}
          <div className="hub-card space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#F1F5F9]">Work Completed</h2>
                <p className="text-xs text-[#475569] mt-0.5">List of tasks, features, and deliverables this month.</p>
              </div>
              {!isSent && (
                <Button size="sm" variant="outline" onClick={addWorkItem}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Item
                </Button>
              )}
            </div>

            {workItems.length === 0 ? (
              <p className="text-sm text-[#475569] py-4 text-center">No work items yet. Click "Auto-fill from Data" or add manually.</p>
            ) : (
              <div className="space-y-2">
                {workItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      className={cn(selectClass, 'w-36 shrink-0')}
                      value={item.category}
                      onChange={(e) => updateWorkItem(i, 'category', e.target.value)}
                      disabled={isSent}
                    >
                      {WORK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <Input
                      value={item.description}
                      onChange={(e) => updateWorkItem(i, 'description', e.target.value)}
                      placeholder="Describe what was done…"
                      disabled={isSent}
                      className="flex-1"
                    />
                    {!isSent && (
                      <button onClick={() => removeWorkItem(i)} className="text-[#475569] hover:text-[#EF4444] transition-colors p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Performance notes */}
          <div className="hub-card space-y-3">
            <h2 className="text-sm font-semibold text-[#F1F5F9]">Performance & Highlights</h2>
            <p className="text-xs text-[#475569]">Metrics, wins, site performance, SEO results, etc.</p>
            <textarea
              value={performanceNotes}
              onChange={(e) => setPerformanceNotes(e.target.value)}
              rows={4}
              disabled={isSent}
              className={cn(textareaClass, isSent && 'opacity-60 cursor-not-allowed')}
              placeholder="e.g. Site speed improved from 72 to 91 on PageSpeed Insights…"
            />
          </div>

          {/* Coming next */}
          <div className="hub-card space-y-3">
            <h2 className="text-sm font-semibold text-[#F1F5F9]">Coming Next Month</h2>
            <p className="text-xs text-[#475569]">What the client can expect next — sets clear expectations.</p>
            <textarea
              value={comingNext}
              onChange={(e) => setComingNext(e.target.value)}
              rows={4}
              disabled={isSent}
              className={cn(textareaClass, isSent && 'opacity-60 cursor-not-allowed')}
              placeholder="e.g. Next month we'll be launching the new contact form, setting up Google Analytics 4, and starting the blog content calendar…"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="hub-card space-y-3">
            <h3 className="text-sm font-semibold text-[#F1F5F9]">Recap Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-[#475569]">Period</p>
                <p className="text-[#CBD5E1]">{periodLabel}</p>
              </div>
              <div>
                <p className="text-xs text-[#475569]">Client</p>
                <p className="text-[#CBD5E1]">{clientName}</p>
              </div>
              <div>
                <p className="text-xs text-[#475569]">Work Items</p>
                <p className="text-[#CBD5E1]">{workItems.filter(w => w.description.trim()).length} items</p>
              </div>
              <div>
                <p className="text-xs text-[#475569]">Status</p>
                <p className={isSent ? 'text-[#10B981]' : 'text-[#94A3B8]'}>{isSent ? 'Sent to client' : 'Draft'}</p>
              </div>
            </div>
          </div>

          <div className="hub-card space-y-2">
            <h3 className="text-sm font-semibold text-[#F1F5F9]">Tips</h3>
            <ul className="space-y-1.5 text-xs text-[#475569]">
              <li>• Use "Auto-fill from Data" to pull tasks + hours from the month automatically</li>
              <li>• Keep the intro friendly and personal — mention the client by name</li>
              <li>• Be specific about what was done — avoid vague phrases like "worked on the site"</li>
              <li>• "Coming Next" sets expectations and reduces client anxiety</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
