'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LayoutTemplate, Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { SlideOver } from '@/components/ui/slide-over'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'
import { createWebsiteReviewAction, deleteReviewAction } from '@/lib/actions/website-reviews'
import { saveReviewAsTemplateAction } from '@/lib/actions/review-templates'
import { INCLUDED_ROUNDS, REVIEW_STATUS_LABELS, roundLabel, type ReviewStatus } from '@/lib/website-review/types'
import type { ClientReviewsData } from '@/lib/website-review/team'
import { ReviewBuilder } from './review-builder'
import { ReviewResults } from './review-results'

const STATUS_VARIANT: Record<ReviewStatus, 'neutral' | 'blue' | 'warning' | 'success' | 'purple'> = {
  draft: 'neutral',
  sent: 'blue',
  in_progress: 'purple',
  submitted: 'warning',
  reopened: 'blue',
  closed: 'success',
}

export function ClientReviewsTab({
  clientId,
  data,
  projects,
  team,
  templates,
  extraRoundPrice,
  initialView,
}: {
  clientId: string
  data: ClientReviewsData
  projects: { id: string; name: string }[]
  team: { id: string; full_name: string }[]
  templates: { id: string; name: string; is_default: boolean }[]
  extraRoundPrice: number
  initialView: 'sections' | 'feedback' | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const selected = data.selected
  const nextRound = (data.reviews[0]?.round_number ?? 0) + 1
  const isExtra = nextRound > INCLUDED_ROUNDS

  const defaultView = selected && (selected.submitted_at || selected.status === 'in_progress') ? 'feedback' : 'sections'
  const [view, setView] = useState<'sections' | 'feedback'>(initialView ?? defaultView)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newRound, setNewRound] = useState({
    templateId: templates.find((t) => t.is_default)?.id ?? templates[0]?.id ?? '',
    projectId: projects[0]?.id ?? '',
    stagingUrl: selected?.staging_url ?? '',
    billing: 'add' as 'add' | 'skip',
    price: String(extraRoundPrice || ''),
  })
  const [confirmDelete, setConfirmDelete] = useState(false)

  function goTo(reviewId: string) {
    router.push(`/app/clients/${clientId}?tab=reviews&review=${reviewId}`)
  }

  function create() {
    setError(null)
    startTransition(async () => {
      const result = await createWebsiteReviewAction(clientId, {
        projectId: newRound.projectId || null,
        templateId: newRound.templateId || null,
        stagingUrl: newRound.stagingUrl,
        billing: isExtra ? (newRound.billing === 'add' ? { mode: 'add', price: Number(newRound.price) } : { mode: 'skip' }) : undefined,
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      setCreating(false)
      setView('sections')
      goTo(result.data.id)
    })
  }

  function saveAsTemplate() {
    if (!selected) return
    const name = window.prompt('Template name', 'Church website (custom)')
    if (!name) return
    startTransition(async () => {
      const result = await saveReviewAsTemplateAction(selected.id, name)
      setError(result.success ? null : result.error)
      if (result.success) window.alert(`Saved as template "${name}".`)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 flex-wrap gap-2">
          {data.reviews.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => goTo(r.id)}
              className={cn(
                'flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                r.id === selected?.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
              )}
            >
              <span className="font-medium text-slate-900">{roundLabel(r.round_number)}</span>
              <Badge variant={STATUS_VARIANT[r.status]}>{REVIEW_STATUS_LABELS[r.status]}</Badge>
            </button>
          ))}
        </div>
        <Button type="button" variant="ghost" size="sm" asChild>
          <Link href="/app/review-templates">
            <LayoutTemplate className="h-4 w-4" /> Templates
          </Link>
        </Button>
        <Button type="button" size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> {data.reviews.length === 0 ? 'Start website review' : `New round (${nextRound})`}
        </Button>
      </div>

      <p className="text-xs text-slate-500">
        Feedback rounds used: {Math.min(data.reviews.length, INCLUDED_ROUNDS)} of {INCLUDED_ROUNDS}
        {data.reviews.length > INCLUDED_ROUNDS ? ` + ${data.reviews.length - INCLUDED_ROUNDS} extra` : ''}
      </p>

      {error && !creating ? <p className="text-sm text-red-600">{error}</p> : null}

      {selected ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
            <nav className="flex gap-1">
              {(['sections', 'feedback'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setView(key)}
                  className={cn(
                    '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                    view === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
                  )}
                >
                  {key === 'sections' ? 'Sections & sending' : 'Client feedback'}
                </button>
              ))}
            </nav>
            <div className="flex flex-wrap items-center gap-3 pb-2 text-xs text-slate-500">
              {selected.sent_at ? <span>Sent {formatDate(selected.sent_at)}</span> : null}
              {selected.first_opened_at ? <span>Opened {formatDate(selected.first_opened_at)}</span> : null}
              {selected.submitted_at ? <span>Received {formatDate(selected.submitted_at)}</span> : null}
              <Button type="button" variant="ghost" size="sm" onClick={saveAsTemplate} disabled={isPending}>
                <Save className="h-3.5 w-3.5" /> Save as template
              </Button>
              {selected.id === data.reviews[0]?.id ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} disabled={isPending}>
                  <Trash2 className="h-3.5 w-3.5 text-red-500" /> Delete round
                </Button>
              ) : null}
            </div>
          </div>
          {view === 'sections' ? (
            <ReviewBuilder review={selected} projects={projects} team={team} />
          ) : (
            <ReviewResults review={selected} />
          )}
        </>
      ) : (
        <div className="hub-card space-y-2">
          <h3 className="text-sm font-semibold text-slate-900">No website reviews yet</h3>
          <p className="text-sm text-slate-500">
            When a build stage is ready, start a review. You add screenshots of each section, then send the client a simple link to tell you
            what to change.
          </p>
        </div>
      )}

      <SlideOver
        open={creating}
        onClose={() => setCreating(false)}
        title={data.reviews.length === 0 ? 'Start website review' : `New feedback round`}
        subtitle={roundLabel(nextRound)}
      >
        <div className="space-y-4">
          {data.reviews.length === 0 ? (
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Template</span>
              <select className="hub-input" value={newRound.templateId} onChange={(e) => setNewRound((s) => ({ ...s, templateId: e.target.value }))}>
                {templates.length === 0 ? <option value="">No templates</option> : null}
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
              Copies every page, section and screenshot from {roundLabel(nextRound - 1)}. Replace screenshots of anything you changed — the client
              will see those as <strong>Updated</strong> with a before/after.
            </p>
          )}
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Project</span>
            <select className="hub-input" value={newRound.projectId} onChange={(e) => setNewRound((s) => ({ ...s, projectId: e.target.value }))}>
              <option value="">{data.reviews.length ? 'Same as last round' : 'No project'}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Staging site link</span>
            <input
              className="hub-input"
              value={newRound.stagingUrl}
              onChange={(e) => setNewRound((s) => ({ ...s, stagingUrl: e.target.value }))}
              placeholder="https://staging.example.co.nz"
            />
          </label>

          {isExtra ? (
            <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-800">
                This is outside the {INCLUDED_ROUNDS} included feedback rounds.
              </p>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" checked={newRound.billing === 'add'} onChange={() => setNewRound((s) => ({ ...s, billing: 'add' }))} />
                Add the &quot;Extra feedback round&quot; add-on to this client
              </label>
              {newRound.billing === 'add' ? (
                <label className="ml-6 block space-y-1">
                  <span className="text-xs text-slate-500">Price (NZD, one-off)</span>
                  <input
                    className="hub-input max-w-[160px]"
                    type="number"
                    min={0}
                    step="0.01"
                    value={newRound.price}
                    onChange={(e) => setNewRound((s) => ({ ...s, price: e.target.value }))}
                  />
                </label>
              ) : null}
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" checked={newRound.billing === 'skip'} onChange={() => setNewRound((s) => ({ ...s, billing: 'skip' }))} />
                Don&apos;t bill (goodwill) — this is logged
              </label>
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="button" onClick={create} loading={isPending} disabled={isExtra && newRound.billing === 'add' && newRound.price === ''}>
              Create {roundLabel(nextRound)}
            </Button>
            <Button type="button" variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </SlideOver>

      <ConfirmModal
        open={confirmDelete}
        title="Delete this round?"
        message="This removes the round, its screenshots and any client feedback. Tasks already created are kept."
        confirmLabel="Delete round"
        danger
        isPending={isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          selected &&
          startTransition(async () => {
            const result = await deleteReviewAction(selected.id)
            setConfirmDelete(false)
            if (!result.success) setError(result.error)
            else router.push(`/app/clients/${clientId}?tab=reviews`)
          })
        }
      />
    </div>
  )
}
