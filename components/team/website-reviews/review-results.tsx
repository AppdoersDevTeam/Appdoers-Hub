'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, FileDown, ListPlus, Lock, Paperclip, RefreshCw, Unlock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { PinnedImage } from '@/components/website-review/pinned-image'
import { cn } from '@/lib/utils/cn'
import { formatFileSize } from '@/lib/documents'
import { getFileDownloadUrlAction } from '@/lib/actions/files'
import {
  closeReviewAction,
  createTasksFromReviewAction,
  regenerateReviewRecordAction,
  reopenReviewAction,
} from '@/lib/actions/website-reviews'
import { TASK_STATUS_CONFIG } from '@/lib/tasks/constants'
import { countReview, groupItemsByPage } from '@/lib/website-review/types'
import type { TeamReviewDetail, TeamReviewItem } from '@/lib/website-review/team'

const ITEM_STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'neutral' }> = {
  looks_good: { label: 'Looks good', variant: 'success' },
  changes: { label: 'Needs changes', variant: 'warning' },
  provided: { label: 'Provided', variant: 'success' },
  pending: { label: 'Not reviewed', variant: 'neutral' },
}

function TaskChip({ item, taskId }: { item: TeamReviewItem; taskId: string | null | undefined }) {
  if (!taskId) return null
  const state = item.task_states[taskId] as keyof typeof TASK_STATUS_CONFIG | undefined
  const config = state ? TASK_STATUS_CONFIG[state] : null
  return (
    <a href={`/app/tasks/${taskId}`} className={cn('ml-2 rounded px-1.5 py-0.5 text-[11px] font-medium', config?.cls ?? 'bg-slate-100 text-slate-500')}>
      Task: {config?.label ?? 'deleted'}
    </a>
  )
}

function ItemResult({ item }: { item: TeamReviewItem }) {
  const desktopPins = item.pins.filter((p) => p.view === 'desktop')
  const mobilePins = item.pins.filter((p) => p.view === 'mobile')
  const status = ITEM_STATUS[item.client_status]
  const showMobile = Boolean(item.mobile_url && (mobilePins.length > 0 || !item.desktop_url))

  return (
    <div className="grid gap-4 border-t border-slate-100 py-4 first:border-t-0 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="space-y-2">
        {item.desktop_url ? <PinnedImage src={item.desktop_url} alt={item.section_name} pins={desktopPins} /> : null}
        {showMobile && item.mobile_url ? (
          <PinnedImage src={item.mobile_url} alt={`${item.section_name} (mobile)`} pins={mobilePins} numberOffset={desktopPins.length} className="max-w-[240px]" />
        ) : null}
        {!item.desktop_url && !item.mobile_url ? (
          <div className="rounded-md border border-dashed border-slate-200 p-4 text-xs text-slate-400">
            {item.kind === 'content_request' ? 'Content request' : 'No screenshot'}
          </div>
        ) : null}
      </div>
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold text-slate-900">{item.section_name}</h4>
          <Badge variant={status.variant}>{status.label}</Badge>
          {item.updated_since_last_round ? <Badge variant="blue">Updated</Badge> : null}
        </div>
        {item.team_note ? <p className="text-xs text-slate-400">Asked: {item.team_note}</p> : null}
        {[...desktopPins, ...mobilePins].length > 0 ? (
          <ol className="space-y-1.5 text-sm text-slate-700">
            {[...desktopPins, ...mobilePins].map((pin, i) => (
              <li key={pin.id} className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">{i + 1}</span>
                <span className="min-w-0 break-words">
                  {pin.comment || <em className="text-slate-400">No comment</em>}
                  {pin.view === 'mobile' ? <span className="ml-1 text-xs text-slate-400">(mobile)</span> : null}
                  <TaskChip item={item} taskId={pin.task_id} />
                </span>
              </li>
            ))}
          </ol>
        ) : null}
        {item.client_comment ? (
          <p className="whitespace-pre-wrap break-words rounded-md bg-slate-50 p-2 text-sm text-slate-700">
            {item.client_comment}
            <TaskChip item={item} taskId={item.task_id} />
          </p>
        ) : null}
        {item.client_attachments.length > 0 ? (
          <ul className="space-y-1">
            {item.client_attachments.map((a) => (
              <li key={a.path}>
                <a
                  href={item.attachment_urls[a.path]}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  <Paperclip className="h-3.5 w-3.5" /> {a.name}
                  <span className="text-xs text-slate-400">{formatFileSize(a.size)}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        {!item.client_comment && item.task_id && item.kind === 'content_request' ? <TaskChip item={item} taskId={item.task_id} /> : null}
      </div>
    </div>
  )
}

export function ReviewResults({ review }: { review: TeamReviewDetail }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [confirm, setConfirm] = useState<'close' | 'reopen' | null>(null)
  const counts = countReview(review.items)
  const groups = groupItemsByPage(review.items)
  const hasFeedback = Boolean(review.submitted_at) || review.items.some((i) => i.client_status !== 'pending')

  function run(task: () => Promise<{ success: boolean; error?: string }>, okText: string) {
    setMessage(null)
    startTransition(async () => {
      const result = await task()
      setMessage(result.success ? { tone: 'ok', text: okText } : { tone: 'error', text: result.error ?? 'Something went wrong' })
      setConfirm(null)
      if (result.success) router.refresh()
    })
  }

  async function downloadRecord() {
    if (!review.record_file_id) return
    const result = await getFileDownloadUrlAction(review.record_file_id)
    if (result.success) window.open(result.data.url, '_blank', 'noopener')
    else setMessage({ tone: 'error', text: result.error })
  }

  if (!hasFeedback) {
    return (
      <div className="hub-card text-sm text-slate-500">
        {review.status === 'draft'
          ? 'No feedback yet. Send the review to the client from the Sections tab.'
          : review.first_opened_at
            ? 'The client has opened the review but has not answered anything yet.'
            : 'Waiting for the client to open the review.'}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="hub-card space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Looks good', value: counts.looksGood, cls: 'text-emerald-600' },
            { label: 'Needs changes', value: counts.changes, cls: 'text-amber-600' },
            { label: 'Not reviewed', value: counts.notReviewed, cls: 'text-slate-500' },
            { label: 'Content provided', value: `${counts.requestsProvided}/${counts.requests}`, cls: 'text-blue-600' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-md border border-slate-200 p-3">
              <p className={cn('text-2xl font-semibold', stat.cls)}>{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
        {review.submitted_at ? (
          <p className="text-xs text-slate-500">
            Sent by {review.submitted_by_name || 'the client'} on {new Date(review.submitted_at).toLocaleString('en-NZ')}
          </p>
        ) : (
          <p className="text-xs text-amber-600">The client is still working on this — answers below are their draft.</p>
        )}
        {review.general_notes ? (
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">General notes</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{review.general_notes}</p>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <Button
            type="button"
            onClick={() =>
              run(async () => {
                const res = await createTasksFromReviewAction(review.id)
                if (res.success && res.data.created === 0) return { success: false, error: 'No new changes to turn into tasks.' }
                return res
              }, 'Tasks created')
            }
            disabled={isPending || !review.submitted_at}
            title={review.project_id ? undefined : 'Link a project in the Sections tab first'}
          >
            <ListPlus className="h-4 w-4" /> Create tasks from changes
          </Button>
          {review.record_file_id ? (
            <Button type="button" variant="outline" onClick={downloadRecord}>
              <FileDown className="h-4 w-4" /> Feedback PDF
            </Button>
          ) : null}
          {review.submitted_at ? (
            <Button type="button" variant="ghost" onClick={() => run(() => regenerateReviewRecordAction(review.id), 'PDF regenerated')} disabled={isPending}>
              <RefreshCw className="h-4 w-4" /> {review.record_file_id ? 'Rebuild PDF' : 'Create PDF'}
            </Button>
          ) : null}
          {review.status === 'closed' ? (
            <Button type="button" variant="outline" onClick={() => setConfirm('reopen')} disabled={isPending}>
              <Unlock className="h-4 w-4" /> Reopen for client
            </Button>
          ) : review.status === 'submitted' ? (
            <>
              <Button type="button" variant="outline" onClick={() => setConfirm('reopen')} disabled={isPending}>
                <Unlock className="h-4 w-4" /> Let client edit again
              </Button>
              <Button type="button" variant="outline" onClick={() => setConfirm('close')} disabled={isPending}>
                <Lock className="h-4 w-4" /> Close round
              </Button>
            </>
          ) : null}
          {message ? (
            <span className={cn('text-sm', message.tone === 'error' ? 'text-red-600' : 'text-emerald-600')}>{message.text}</span>
          ) : null}
        </div>
        {!review.project_id ? (
          <p className="text-xs text-amber-600">Link this review to a project (Sections tab) to create tasks and update project status.</p>
        ) : null}
      </div>

      {groups.map((group) => (
        <div key={group.page} className="hub-card">
          <h3 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-900">
            {group.page}
            {group.items.every((i) => i.client_status === 'looks_good' || i.client_status === 'provided') ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : null}
          </h3>
          {group.items.map((item) => (
            <ItemResult key={item.id} item={item} />
          ))}
        </div>
      ))}

      <ConfirmModal
        open={confirm !== null}
        title={confirm === 'close' ? 'Close this round?' : 'Let the client edit again?'}
        message={
          confirm === 'close'
            ? 'The client will no longer be able to change their answers.'
            : 'The client can change their answers and send them again. You will be notified when they do.'
        }
        confirmLabel={confirm === 'close' ? 'Close round' : 'Reopen'}
        isPending={isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          run(() => (confirm === 'close' ? closeReviewAction(review.id) : reopenReviewAction(review.id)), confirm === 'close' ? 'Round closed' : 'Reopened')
        }
      />
    </div>
  )
}
