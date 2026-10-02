'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  ExternalLink,
  Eye,
  Loader2,
  MessageCircleQuestion,
  MousePointerClick,
  Pencil,
  Phone,
  PlayCircle,
  Send,
  X,
} from 'lucide-react'
import { AppdoersLogo } from '@/components/brand/appdoers-logo'
import { cn } from '@/lib/utils/cn'
import { groupItemsByPage, itemAnswerError, type ReviewItemStatus } from '@/lib/website-review/types'
import type { AskedDidEntry, DoneState, PublicReview, PublicReviewItem } from '@/lib/website-review/public'
import { SectionCard, type ItemAnswer } from './section-card'
import { ContentRequestCard } from './content-request-card'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const DONE_LABEL: Record<DoneState, { label: string; cls: string }> = {
  done: { label: 'Done', cls: 'bg-emerald-100 text-emerald-700' },
  in_progress: { label: 'Working on it', cls: 'bg-sky-100 text-sky-700' },
  planned: { label: 'Coming soon', cls: 'bg-slate-100 text-slate-600' },
  noted: { label: 'Noted', cls: 'bg-slate-100 text-slate-600' },
}

function youtubeEmbed(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/)
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null
}

function formatDay(date: string) {
  const d = new Date(`${date}T00:00:00`)
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })
}

function AskedDidList({ entries, title }: { entries: AskedDidEntry[]; title: string }) {
  if (entries.length === 0) return null
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <h3 className="mb-3 text-lg font-semibold text-slate-900">{title}</h3>
      <ul className="space-y-2">
        {entries.map((entry, i) => (
          <li key={i} className="flex items-start gap-3 text-base">
            <span className={cn('mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold', DONE_LABEL[entry.state].cls)}>
              {DONE_LABEL[entry.state].label}
            </span>
            <span className="min-w-0 text-slate-700">
              <span className="text-slate-400">{entry.section_name}: </span>
              {entry.request}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function HelpButton({ phone, email, videoUrl }: { phone: string; email: string; videoUrl: string }) {
  const [open, setOpen] = useState(false)
  const tel = phone.replace(/[^\d+]/g, '')
  return (
    <div className="fixed bottom-24 right-3 z-40 sm:bottom-24 sm:right-6">
      {open ? (
        <div className="mb-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-base font-semibold text-slate-900">Stuck? We&apos;re here to help</p>
            <button type="button" onClick={() => setOpen(false)} className="p-1 text-slate-400" aria-label="Close help">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            <a href={`tel:${tel}`} className="flex min-h-[44px] items-center gap-2 rounded-lg bg-violet-600 px-3 text-base font-semibold text-white">
              <Phone className="h-4 w-4" /> Call {phone}
            </a>
            <a href={`sms:${tel}`} className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 px-3 text-base text-slate-700">
              Text us
            </a>
            <a href={`mailto:${email}`} className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 px-3 text-base text-slate-700">
              Email {email}
            </a>
            {videoUrl ? (
              <a href={videoUrl} target="_blank" rel="noreferrer" className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 px-3 text-base text-slate-700">
                <PlayCircle className="h-4 w-4" /> Watch how it works
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ml-auto flex min-h-[48px] items-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-semibold text-white shadow-lg"
      >
        <MessageCircleQuestion className="h-5 w-5" /> Need help?
      </button>
    </div>
  )
}

export function ReviewWizard({ token, review, preview }: { token: string; review: PublicReview; preview: boolean }) {
  const editable = preview || review.editable
  const canSave = !preview && review.editable
  const pages = useMemo(() => groupItemsByPage(review.items.map((item, i) => ({ ...item, sort_order: i }))), [review.items])
  const lastStep = pages.length + 1

  const [answers, setAnswers] = useState<Record<string, ItemAnswer>>(() =>
    Object.fromEntries(
      review.items.map((item) => [
        item.id,
        { client_status: item.client_status, client_comment: item.client_comment, pins: item.pins, attachments: item.attachments },
      ])
    )
  )
  const [generalNotes, setGeneralNotes] = useState(review.generalNotes)
  const [name, setName] = useState(review.submittedByName)
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(!review.editable && !preview)
  const [showApproved, setShowApproved] = useState<Record<string, boolean>>({})
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const answersRef = useRef(answers)
  answersRef.current = answers
  const notesRef = useRef({ generalNotes, name })
  notesRef.current = { generalNotes, name }
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const inflight = useRef(new Set<Promise<unknown>>())

  const sendPatch = useCallback(
    async (key: string) => {
      const body =
        key === '__notes'
          ? { general_notes: notesRef.current.generalNotes, submitted_by_name: notesRef.current.name }
          : (() => {
              const a = answersRef.current[key]
              return { item_id: key, client_status: a.client_status, client_comment: a.client_comment, pins: a.pins }
            })()
      setSaveState('saving')
      const attempt = async (retry: boolean): Promise<void> => {
        try {
          const res = await fetch(`/api/website-reviews/public/${token}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          if (!res.ok) throw new Error(String(res.status))
          setSaveState('saved')
        } catch {
          if (retry) {
            await new Promise((r) => setTimeout(r, 3000))
            return attempt(false)
          }
          setSaveState('error')
        }
      }
      const p = attempt(true)
      inflight.current.add(p)
      await p
      inflight.current.delete(p)
    },
    [token]
  )

  const queueSave = useCallback(
    (key: string, delay = 700) => {
      if (!canSave) return
      const existing = timers.current.get(key)
      if (existing) clearTimeout(existing)
      timers.current.set(
        key,
        setTimeout(() => {
          timers.current.delete(key)
          void sendPatch(key)
        }, delay)
      )
    },
    [canSave, sendPatch]
  )

  async function flushSaves() {
    const keys = [...timers.current.keys()]
    for (const key of keys) {
      clearTimeout(timers.current.get(key))
      timers.current.delete(key)
    }
    await Promise.all([...keys.map((k) => sendPatch(k)), ...inflight.current])
  }

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (timers.current.size > 0 || inflight.current.size > 0) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step, done])

  function updateAnswer(id: string, patch: Partial<ItemAnswer>) {
    setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
    const onlyAttachments = Object.keys(patch).length === 1 && 'attachments' in patch
    if (!onlyAttachments) queueSave(id, 'client_status' in patch && !('client_comment' in patch) ? 150 : 700)
  }

  function goToItem(itemId: string) {
    const pageIndex = pages.findIndex((p) => p.items.some((i) => i.id === itemId))
    if (pageIndex < 0) return
    setStep(pageIndex + 1)
    setShowApproved((s) => ({ ...s, [pages[pageIndex].page]: true }))
    setTimeout(() => document.getElementById(`item-${itemId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250)
  }

  const sections = review.items.filter((i) => i.kind === 'section')
  const answeredCount = sections.filter((i) => answers[i.id]?.client_status !== 'pending').length
  const progress = sections.length ? Math.round((answeredCount / sections.length) * 100) : 100

  async function submit() {
    setSubmitError(null)
    if (!name.trim()) {
      setSubmitError('Please type your name so we know who sent this.')
      return
    }
    const problem = review.items
      .map((item) => ({ item, msg: itemAnswerError({ ...item, ...answers[item.id], client_comment: answers[item.id].client_comment }) }))
      .find((p) => p.msg)
    if (problem) {
      setSubmitError(problem.msg)
      return
    }
    if (preview) {
      setSubmitError('This is a preview, so nothing is sent.')
      return
    }
    setSubmitting(true)
    try {
      await flushSaves()
      const res = await fetch(`/api/website-reviews/public/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submitted_by_name: name, general_notes: generalNotes }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not send your feedback. Please try again.')
      setDone(true)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not send your feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const header = (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur safe-top">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <AppdoersLogo variant="icon" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{review.companyName} — website review</p>
          <p className="text-xs text-slate-500">
            Feedback round {review.roundNumber}
            {review.roundNumber <= review.includedRounds ? ` of ${review.includedRounds}` : ''}
          </p>
        </div>
        {canSave && !done ? (
          <span className="flex items-center gap-1 text-xs text-slate-500" aria-live="polite">
            {saveState === 'saving' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
              </>
            ) : saveState === 'saved' ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Saved
              </>
            ) : saveState === 'error' ? (
              <span className="font-medium text-red-600">Not saved — check your internet</span>
            ) : null}
          </span>
        ) : null}
      </div>
      {!done && step > 0 ? (
        <div className="h-1.5 w-full bg-slate-100">
          <div className="h-full bg-violet-600 transition-all" style={{ width: `${Math.round((step / lastStep) * 100)}%` }} />
        </div>
      ) : null}
    </header>
  )

  const previewBanner = preview ? (
    <div className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900">
      <Eye className="mr-1 inline h-4 w-4" /> Team preview — nothing you do here is saved or sent.
    </div>
  ) : null

  if (done) {
    const changes = review.items.filter((i) => answers[i.id]?.client_status === 'changes').length
    return (
      <div className="min-h-dvh">
        {previewBanner}
        {header}
        <main className="mx-auto max-w-2xl space-y-6 px-4 py-10 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
          <h1 className="text-3xl font-bold text-slate-900">Thank you{name ? `, ${name.split(' ')[0]}` : ''}!</h1>
          <p className="text-lg text-slate-600">
            {review.status === 'closed'
              ? 'This feedback round is closed.'
              : `We've got your feedback${changes ? ` — ${changes} part${changes === 1 ? '' : 's'} to change` : ''}.`}
          </p>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-left">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">What happens next</h2>
            <ol className="space-y-3 text-base text-slate-700">
              <li>1. We read through everything and make the changes.</li>
              <li>2. We may get in touch if anything isn&apos;t clear.</li>
              <li>3. We send you the next round to check, or let you know it&apos;s ready to launch.</li>
            </ol>
          </div>
          <p className="text-base text-slate-500">
            Need to change something you sent? Call us on {review.helpPhone} or email {review.helpEmail}.
          </p>
        </main>
      </div>
    )
  }

  const page = step >= 1 && step <= pages.length ? pages[step - 1] : null
  const videoEmbed = review.walkthroughVideoUrl ? youtubeEmbed(review.walkthroughVideoUrl) : null

  return (
    <div className="min-h-dvh pb-28">
      {previewBanner}
      {header}

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {step === 0 ? (
          <>
            <section className="space-y-3 text-center">
              <h1 className="text-3xl font-bold text-slate-900">Your website is ready to look at</h1>
              <p className="text-lg text-slate-600">
                Go through it one page at a time and tell us what you&apos;d like changed. It takes about 15 minutes.
              </p>
              {review.clientDueDate ? (
                <p className="inline-block rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-800">
                  Please send by {formatDay(review.clientDueDate)}
                </p>
              ) : null}
            </section>

            {review.introNote ? (
              <p className="whitespace-pre-wrap rounded-2xl bg-sky-50 p-4 text-base text-sky-900">{review.introNote}</p>
            ) : null}

            <ol className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: Eye, title: 'Look at your site', body: 'Open your new website in another tab and have a browse.' },
                {
                  icon: MousePointerClick,
                  title: 'Tell us what to change',
                  body: 'For each part, tap Looks good or Needs changes. Tap the picture to show us exactly where.',
                },
                {
                  icon: Send,
                  title: 'Send it to us',
                  body: 'Check the summary and press Send. Your answers save as you go, so you can stop and come back.',
                },
              ].map((s, i) => (
                <li key={s.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">{i + 1}</span>
                    <s.icon className="h-5 w-5 text-violet-600" />
                  </div>
                  <p className="text-base font-semibold text-slate-900">{s.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{s.body}</p>
                </li>
              ))}
            </ol>

            {videoEmbed ? (
              <div className="aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-black">
                <iframe src={videoEmbed} title="How to review your website" className="h-full w-full" allowFullScreen />
              </div>
            ) : review.walkthroughVideoUrl ? (
              <a
                href={review.walkthroughVideoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-base font-medium text-slate-700"
              >
                <PlayCircle className="h-5 w-5" /> Watch a 1-minute guide
              </a>
            ) : null}

            <AskedDidList entries={review.askedDid} title="What we changed since last time" />

            <div className="flex flex-col gap-3 sm:flex-row">
              {review.stagingUrl ? (
                <a
                  href={review.stagingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-violet-600 bg-white text-lg font-semibold text-violet-700"
                >
                  <ExternalLink className="h-5 w-5" /> Open my website
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 text-lg font-semibold text-white shadow-sm"
              >
                Let&apos;s start <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </>
        ) : null}

        {page ? (
          <>
            <section className="space-y-2">
              <p className="text-sm font-medium text-violet-700">
                Step {step} of {pages.length} · {progress}% reviewed
              </p>
              <h1 className="text-3xl font-bold text-slate-900">{page.page} page</h1>
              {review.stagingUrl ? (
                <a href={review.stagingUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-[40px] items-center gap-1.5 text-base font-medium text-violet-700">
                  <ExternalLink className="h-4 w-4" /> Open my website to compare
                </a>
              ) : null}
            </section>

            <AskedDidList entries={review.askedDid.filter((e) => e.page_name === page.page)} title="You asked, we did" />

            {(() => {
              const fresh = page.items.filter((i) => !i.previously_approved)
              const approved = page.items.filter((i) => i.previously_approved)
              const renderItem = (item: PublicReviewItem) =>
                item.kind === 'content_request' ? (
                  <ContentRequestCard
                    key={item.id}
                    item={item}
                    answer={answers[item.id]}
                    editable={editable}
                    allowUploads={canSave}
                    token={token}
                    onChange={(patch) => updateAnswer(item.id, patch)}
                  />
                ) : (
                  <SectionCard
                    key={item.id}
                    item={item}
                    answer={answers[item.id]}
                    editable={editable}
                    allowUploads={canSave}
                    token={token}
                    onChange={(patch) => updateAnswer(item.id, patch)}
                  />
                )
              return (
                <>
                  {fresh.map(renderItem)}
                  {approved.length > 0 ? (
                    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                      <button
                        type="button"
                        onClick={() => setShowApproved((s) => ({ ...s, [page.page]: !s[page.page] }))}
                        className="flex min-h-[44px] w-full items-center justify-between gap-2 text-left text-base font-medium text-emerald-900"
                      >
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5" /> {approved.length} part{approved.length === 1 ? '' : 's'} you already approved (unchanged)
                        </span>
                        <span className="flex items-center gap-1 text-sm">
                          {showApproved[page.page] ? 'Hide' : 'Check again'}
                          <ChevronDown className={cn('h-4 w-4 transition-transform', showApproved[page.page] ? 'rotate-180' : '')} />
                        </span>
                      </button>
                      {showApproved[page.page] ? <div className="mt-4 space-y-6">{approved.map(renderItem)}</div> : null}
                    </section>
                  ) : null}
                </>
              )
            })()}
          </>
        ) : null}

        {step === lastStep ? (
          <SummaryStep
            review={review}
            pages={pages}
            answers={answers}
            editable={editable}
            name={name}
            generalNotes={generalNotes}
            onName={(v) => {
              setName(v)
              queueSave('__notes', 900)
            }}
            onNotes={(v) => {
              setGeneralNotes(v)
              queueSave('__notes', 900)
            }}
            onFix={goToItem}
            error={submitError}
          />
        ) : null}
      </main>

      <HelpButton phone={review.helpPhone} email={review.helpEmail} videoUrl={review.walkthroughVideoUrl} />

      {step > 0 ? (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur safe-bottom">
          <div className="mx-auto flex max-w-3xl gap-3 px-4 py-3">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="flex min-h-[52px] items-center justify-center gap-1 rounded-xl border-2 border-slate-200 bg-white px-4 text-base font-semibold text-slate-700"
            >
              <ArrowLeft className="h-5 w-5" /> Back
            </button>
            {step < lastStep ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-base font-semibold text-white"
              >
                <span className="truncate">{step === pages.length ? 'Check & send' : `Next: ${pages[step].page}`}</span>
                <ArrowRight className="h-5 w-5 shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting || !editable}
                className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-base font-semibold text-white disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                Send my feedback
              </button>
            )}
          </div>
        </nav>
      ) : null}
    </div>
  )
}

function SummaryStep({
  review,
  pages,
  answers,
  editable,
  name,
  generalNotes,
  onName,
  onNotes,
  onFix,
  error,
}: {
  review: PublicReview
  pages: { page: string; items: PublicReviewItem[] }[]
  answers: Record<string, ItemAnswer>
  editable: boolean
  name: string
  generalNotes: string
  onName: (v: string) => void
  onNotes: (v: string) => void
  onFix: (itemId: string) => void
  error: string | null
}) {
  const status = (id: string): ReviewItemStatus => answers[id]?.client_status ?? 'pending'
  const all = review.items
  const changes = all.filter((i) => i.kind === 'section' && status(i.id) === 'changes')
  const unanswered = all.filter((i) => i.kind === 'section' && status(i.id) === 'pending')
  const missing = all.filter((i) => i.kind === 'content_request' && status(i.id) !== 'provided')
  const good = all.filter((i) => i.kind === 'section' && status(i.id) === 'looks_good').length

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Check &amp; send</h1>
        <p className="text-lg text-slate-600">Here&apos;s everything you&apos;re sending us. Tap any item to change it.</p>
      </section>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-2xl font-bold text-emerald-700">{good}</p>
          <p className="text-sm text-emerald-800">Looks good</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-2xl font-bold text-amber-700">{changes.length}</p>
          <p className="text-sm text-amber-800">To change</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-2xl font-bold text-slate-600">{unanswered.length}</p>
          <p className="text-sm text-slate-600">Not looked at</p>
        </div>
      </div>

      {changes.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Your changes</h2>
          <ul className="space-y-3">
            {pages.flatMap((p) =>
              p.items
                .filter((i) => changes.some((c) => c.id === i.id))
                .map((item) => {
                  const a = answers[item.id]
                  const notes = [...a.pins.map((pin) => pin.comment.trim()), a.client_comment.trim()].filter(Boolean)
                  return (
                    <li key={item.id}>
                      <button type="button" onClick={() => onFix(item.id)} className="w-full rounded-xl bg-slate-50 p-3 text-left hover:bg-slate-100">
                        <p className="flex items-center gap-2 text-base font-semibold text-slate-900">
                          <Pencil className="h-4 w-4 text-amber-600" /> {p.page} · {item.section_name}
                        </p>
                        {notes.length ? (
                          <ul className="mt-1 list-disc space-y-0.5 pl-6 text-base text-slate-700">
                            {notes.map((n, i) => (
                              <li key={i} className="break-words">
                                {n}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-base text-red-600">Please tell us what to change here.</p>
                        )}
                        {a.attachments.length ? <p className="mt-1 text-sm text-slate-500">{a.attachments.length} file(s) attached</p> : null}
                      </button>
                    </li>
                  )
                })
            )}
          </ul>
        </section>
      ) : null}

      {unanswered.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">Parts you haven&apos;t looked at</h2>
          <p className="mb-3 text-sm text-slate-500">You can still send — we&apos;ll take these as not checked yet.</p>
          <ul className="flex flex-wrap gap-2">
            {unanswered.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onFix(item.id)}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-slate-200 px-3 text-sm text-slate-700 hover:border-violet-400"
                >
                  <CircleDashed className="h-4 w-4" /> {item.page_name} · {item.section_name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {missing.length > 0 ? (
        <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:p-6">
          <h2 className="mb-1 text-lg font-semibold text-sky-900">Still needed from you</h2>
          <p className="mb-3 text-sm text-sky-800">No rush — send these when you can.</p>
          <ul className="space-y-1">
            {missing.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => onFix(item.id)} className="min-h-[40px] text-left text-base text-sky-900 underline">
                  {item.section_name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <label className="block">
          <span className="mb-1 block text-base font-medium text-slate-800">Anything else you&apos;d like to tell us?</span>
          <textarea
            value={generalNotes}
            disabled={!editable}
            onChange={(e) => onNotes(e.target.value)}
            rows={4}
            className="portal-input min-h-[110px] text-base"
            placeholder="Optional"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-base font-medium text-slate-800">Your name</span>
          <input
            value={name}
            disabled={!editable}
            onChange={(e) => onName(e.target.value)}
            className="portal-input min-h-[48px] text-base"
            autoComplete="name"
            placeholder="So we know who sent this"
          />
        </label>
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-base text-red-700">{error}</p> : null}
        <p className="text-sm text-slate-500">
          Please make sure this includes everyone&apos;s feedback — we work through one set of changes per round.
        </p>
      </section>
    </div>
  )
}
