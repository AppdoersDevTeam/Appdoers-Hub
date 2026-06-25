'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
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

const labelClass = 'block text-xs font-medium text-slate-500 mb-1'
const selectClass = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none'
const textareaClass = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none resize-y'

export function RecapEditor({
  recap,
  clientName,
  clientId,
  contactName,
}: {
  recap: Recap
  clientName: string
  clientId: string
  contactName?: string | null
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
  const autoFilledOnMount = useRef(false)

  const periodLabel = `${MONTHS[recap.month - 1]} ${recap.year}`

  const applyGeneratedData = (
    data: {
      tasksCompleted: number
      hoursLogged: number
      workCompleted: RecapWorkItem[]
      introText: string
      comingNext: string
      performanceNotes: string
    },
    options?: { refreshIntro?: boolean; refreshComingNext?: boolean; refreshPerformance?: boolean }
  ) => {
    setWorkItems(data.workCompleted)
    setGenerateMsg(
      `Auto-filled ${data.workCompleted.length} work items · ${data.tasksCompleted} tasks closed · ${data.hoursLogged}h logged this month`
    )
    if (options?.refreshIntro || !introText.trim()) {
      setIntroText(data.introText)
    }
    if (options?.refreshComingNext || !comingNext.trim()) {
      setComingNext(data.comingNext)
    }
    if (options?.refreshPerformance || !performanceNotes.trim()) {
      setPerformanceNotes(data.performanceNotes)
    }
  }

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

  const handleAutoGenerate = (options?: {
    refreshIntro?: boolean
    refreshComingNext?: boolean
    refreshPerformance?: boolean
  }) => {
    setGenerateMsg(null)
    startTransition(async () => {
      const result = await generateRecapDataAction(clientId, recap.month, recap.year, { contactName })
      if (!result.success) { setError(result.error); return }
      applyGeneratedData(result.data, options)
    })
  }

  useEffect(() => {
    if (autoFilledOnMount.current || isSent) return

    const isEmptyDraft =
      !(recap.intro_text ?? '').trim() &&
      (recap.work_completed ?? []).length === 0 &&
      !(recap.coming_next ?? '').trim()

    if (!isEmptyDraft) return

    autoFilledOnMount.current = true
    handleAutoGenerate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center gap-4">
        <Link href="/app/recaps" className="text-slate-500 hover:text-slate-600 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex flex-1 items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900">{periodLabel} Recap</h1>
          <span className="text-sm text-slate-500">—</span>
          <span className="text-sm text-slate-500">{clientName}</span>
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', isSent ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
            {isSent ? 'Sent' : 'Draft'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isSent && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleAutoGenerate({
                    refreshIntro: true,
                    refreshComingNext: true,
                    refreshPerformance: true,
                  })
                }
                disabled={isPending}
              >
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
        <div className="flex items-center gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="flex-1 text-sm text-amber-600">This will mark the recap as <strong>Sent</strong> and notify the team. Confirm?</p>
          <Button size="sm" onClick={handleSend} disabled={isPending}>Confirm Send</Button>
          <Button size="sm" variant="outline" onClick={() => setSendConfirm(false)}>Cancel</Button>
        </div>
      )}
      {generateMsg && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-600">
          ✓ {generateMsg}
        </div>
      )}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}
      {isSent && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
          ✓ This recap has been sent to the client and is visible in their portal.
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">

          {/* Intro */}
          <div className="hub-card space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Introduction</h2>
            <p className="text-xs text-slate-500">Opening message to the client — friendly summary of the month.</p>
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
                <h2 className="text-sm font-semibold text-slate-900">Work Completed</h2>
                <p className="text-xs text-slate-500 mt-0.5">List of tasks, features, and deliverables this month.</p>
              </div>
              {!isSent && (
                <Button size="sm" variant="outline" onClick={addWorkItem}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Item
                </Button>
              )}
            </div>

            {workItems.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No work items yet. Click "Auto-fill from Data" or add manually.</p>
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
                      <button onClick={() => removeWorkItem(i)} className="text-slate-500 hover:text-red-600 transition-colors p-1">
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
            <h2 className="text-sm font-semibold text-slate-900">Performance & Highlights</h2>
            <p className="text-xs text-slate-500">Metrics, wins, site performance, SEO results, etc.</p>
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
            <h2 className="text-sm font-semibold text-slate-900">Coming Next Month</h2>
            <p className="text-xs text-slate-500">What the client can expect next — sets clear expectations.</p>
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
            <h3 className="text-sm font-semibold text-slate-900">Recap Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-slate-500">Period</p>
                <p className="text-slate-600">{periodLabel}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Client</p>
                <p className="text-slate-600">{clientName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Work Items</p>
                <p className="text-slate-600">{workItems.filter(w => w.description.trim()).length} items</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <p className={isSent ? 'text-emerald-600' : 'text-slate-500'}>{isSent ? 'Sent to client' : 'Draft'}</p>
              </div>
            </div>
          </div>

          <div className="hub-card space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">Tips</h3>
            <ul className="space-y-1.5 text-xs text-slate-500">
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
