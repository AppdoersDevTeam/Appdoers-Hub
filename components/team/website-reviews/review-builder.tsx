'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Copy, Eye, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import {
  removeReviewScreenshotAction,
  saveReviewItemsAction,
  sendReviewAction,
  updateWebsiteReviewAction,
} from '@/lib/actions/website-reviews'
import type { TeamReviewDetail } from '@/lib/website-review/team'
import { SectionsEditor, type EditableSection } from './sections-editor'
import { ScreenshotZone } from './screenshot-zone'

type BuilderItem = EditableSection & {
  updated_since_last_round: boolean
  has_previous: boolean
  desktop_url: string | null
  mobile_url: string | null
}

function toBuilderItems(review: TeamReviewDetail): BuilderItem[] {
  return review.items.map((item) => ({
    key: item.id,
    id: item.id,
    page_name: item.page_name,
    section_name: item.section_name,
    kind: item.kind,
    team_note: item.team_note,
    updated_since_last_round: item.updated_since_last_round,
    has_previous: Boolean(item.previous_item_id),
    desktop_url: item.desktop_url,
    mobile_url: item.mobile_url,
  }))
}

export function ReviewBuilder({
  review,
  projects,
  team,
}: {
  review: TeamReviewDetail
  projects: { id: string; name: string }[]
  team: { id: string; full_name: string }[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const [details, setDetails] = useState({
    staging_url: review.staging_url ?? '',
    intro_note: review.intro_note ?? '',
    project_id: review.project_id ?? '',
    owner_id: review.owner_id ?? '',
    due_date: review.due_date ?? '',
    client_due_date: review.client_due_date ?? '',
  })
  const [detailsDirty, setDetailsDirty] = useState(false)
  const [items, setItems] = useState<BuilderItem[]>(() => toBuilderItems(review))
  const [itemsDirty, setItemsDirty] = useState(false)

  const loaded = useRef(review.id)
  useEffect(() => {
    if (loaded.current === review.id && (itemsDirty || detailsDirty)) return
    loaded.current = review.id
    setItems(toBuilderItems(review))
    setItemsDirty(false)
    setDetails({
      staging_url: review.staging_url ?? '',
      intro_note: review.intro_note ?? '',
      project_id: review.project_id ?? '',
      owner_id: review.owner_id ?? '',
      due_date: review.due_date ?? '',
      client_due_date: review.client_due_date ?? '',
    })
    setDetailsDirty(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review])

  const missingShots = items.filter((i) => i.kind === 'section' && !i.desktop_url).length
  const locked = review.status === 'closed'

  function setDetail(key: keyof typeof details, value: string) {
    setDetails((d) => ({ ...d, [key]: value }))
    setDetailsDirty(true)
  }

  function run(task: () => Promise<{ success: boolean; error?: string }>, okText: string, after?: () => void) {
    setMessage(null)
    startTransition(async () => {
      const result = await task()
      if (!result.success) {
        setMessage({ tone: 'error', text: result.error ?? 'Something went wrong' })
        return
      }
      setMessage({ tone: 'ok', text: okText })
      after?.()
      router.refresh()
    })
  }

  function saveAll(after?: () => void) {
    run(
      async () => {
        if (detailsDirty) {
          const res = await updateWebsiteReviewAction(review.id, {
            ...details,
            project_id: details.project_id || null,
            owner_id: details.owner_id || null,
            due_date: details.due_date || null,
            client_due_date: details.client_due_date || null,
          })
          if (!res.success) return res
        }
        if (itemsDirty) {
          const res = await saveReviewItemsAction(
            review.id,
            items.map((item) => ({
              id: item.id,
              page_name: item.page_name,
              section_name: item.section_name,
              kind: item.kind,
              team_note: item.team_note,
              updated_since_last_round: item.updated_since_last_round,
            }))
          )
          if (!res.success) return res
        }
        return { success: true }
      },
      'Saved',
      () => {
        setDetailsDirty(false)
        setItemsDirty(false)
        after?.()
      }
    )
  }

  function send(email: boolean) {
    if (itemsDirty || detailsDirty) {
      setMessage({ tone: 'error', text: 'Save your changes before sending.' })
      return
    }
    run(
      async () => {
        const res = await sendReviewAction(review.id, { email })
        if (!res.success) return res
        await navigator.clipboard?.writeText(res.data.url).catch(() => undefined)
        if (email && !res.data.emailedTo) return { success: false, error: `Link copied, but the email was not sent: ${res.data.emailError}` }
        return { success: true }
      },
      email ? 'Emailed to the client (link also copied)' : 'Link copied to clipboard'
    )
  }

  const dirty = itemsDirty || detailsDirty

  return (
    <div className="space-y-5">
      <div className="hub-card space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block space-y-1 sm:col-span-2 lg:col-span-1">
            <span className="text-xs text-slate-500">Staging site link</span>
            <input className="hub-input" value={details.staging_url} onChange={(e) => setDetail('staging_url', e.target.value)} placeholder="https://staging.example.co.nz" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Project (for tasks &amp; status)</span>
            <select className="hub-input" value={details.project_id} onChange={(e) => setDetail('project_id', e.target.value)}>
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Owner</span>
            <select className="hub-input" value={details.owner_id} onChange={(e) => setDetail('owner_id', e.target.value)}>
              <option value="">Unassigned</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Ask client to reply by</span>
            <input className="hub-input" type="date" value={details.client_due_date} onChange={(e) => setDetail('client_due_date', e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Our changes due</span>
            <input className="hub-input" type="date" value={details.due_date} onChange={(e) => setDetail('due_date', e.target.value)} />
          </label>
          <label className="block space-y-1 sm:col-span-2 lg:col-span-3">
            <span className="text-xs text-slate-500">Welcome message for the client (optional)</span>
            <textarea
              className="hub-input min-h-[70px]"
              value={details.intro_note}
              onChange={(e) => setDetail('intro_note', e.target.value)}
              placeholder="e.g. This round includes the new home page and the About page. Events will come next round."
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <Button type="button" onClick={() => send(true)} disabled={isPending || locked}>
            <Mail className="h-4 w-4" /> {review.status === 'draft' ? 'Send to client' : 'Email link again'}
          </Button>
          <Button type="button" variant="outline" onClick={() => send(false)} disabled={isPending || locked}>
            <Copy className="h-4 w-4" /> {review.status === 'draft' ? 'Mark sent & copy link' : 'Copy link'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <a href={`${review.url}?preview=1`} target="_blank" rel="noreferrer">
              <Eye className="h-4 w-4" /> Preview as client
            </a>
          </Button>
          {missingShots > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" /> {missingShots} section{missingShots === 1 ? '' : 's'} without a screenshot
            </span>
          ) : null}
          {!details.staging_url ? <span className="text-xs text-amber-600">No staging link yet</span> : null}
        </div>
      </div>

      <div className="hub-card space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Pages &amp; sections</h3>
          <p className="text-xs text-slate-500">
            Click a screenshot box and press Ctrl+V to paste, drag a file in, or click to choose one. Content requests ask the client to send
            you text or files.
          </p>
        </div>
        <SectionsEditor
          items={items}
          disabled={isPending || locked}
          makeItem={(base) => ({ ...base, updated_since_last_round: false, has_previous: false, desktop_url: null, mobile_url: null })}
          onChange={(next) => {
            setItems(next)
            setItemsDirty(true)
          }}
          renderExtra={(item) =>
            item.kind === 'section' ? (
              <div className="flex flex-wrap items-start gap-3 pl-6">
                <ScreenshotZone
                  itemId={item.id}
                  view="desktop"
                  url={item.desktop_url}
                  onUploaded={(url) =>
                    setItems((all) =>
                      all.map((i) => (i.key === item.key ? { ...i, desktop_url: url, updated_since_last_round: i.has_previous || i.updated_since_last_round } : i))
                    )
                  }
                  onRemove={() =>
                    item.id &&
                    run(() => removeReviewScreenshotAction(item.id as string, 'desktop'), 'Screenshot removed', () =>
                      setItems((all) => all.map((i) => (i.key === item.key ? { ...i, desktop_url: null } : i)))
                    )
                  }
                />
                <ScreenshotZone
                  itemId={item.id}
                  view="mobile"
                  url={item.mobile_url}
                  onUploaded={(url) => setItems((all) => all.map((i) => (i.key === item.key ? { ...i, mobile_url: url } : i)))}
                  onRemove={() =>
                    item.id &&
                    run(() => removeReviewScreenshotAction(item.id as string, 'mobile'), 'Screenshot removed', () =>
                      setItems((all) => all.map((i) => (i.key === item.key ? { ...i, mobile_url: null } : i)))
                    )
                  }
                />
                {item.has_previous ? (
                  <label className="flex items-center gap-2 self-center text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={item.updated_since_last_round}
                      onChange={(e) => {
                        setItems((all) => all.map((i) => (i.key === item.key ? { ...i, updated_since_last_round: e.target.checked } : i)))
                        setItemsDirty(true)
                      }}
                    />
                    Updated since last round
                  </label>
                ) : null}
              </div>
            ) : null
          }
        />

        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:-mx-6 sm:px-6">
          <Button type="button" onClick={() => saveAll()} loading={isPending} disabled={!dirty || locked}>
            Save changes
          </Button>
          {dirty ? <Badge variant="warning">Unsaved changes</Badge> : null}
          {message ? (
            <span className={cn('text-sm', message.tone === 'error' ? 'text-red-600' : 'text-emerald-600')}>{message.text}</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
