'use client'

import { CheckCircle2, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { PublicReviewItem } from '@/lib/website-review/public'
import { AttachmentList, type ItemAnswer } from './section-card'

/** "Please provide…" item: the client types text and/or uploads files. Marked provided once anything is given. */
export function ContentRequestCard({
  item,
  answer,
  editable,
  allowUploads,
  token,
  onChange,
}: {
  item: PublicReviewItem
  answer: ItemAnswer
  editable: boolean
  allowUploads: boolean
  token: string
  onChange: (patch: Partial<ItemAnswer>) => void
}) {
  const provided = answer.client_status === 'provided'

  function statusFor(comment: string, count: number) {
    return comment.trim() || count > 0 ? 'provided' : 'pending'
  }

  return (
    <article
      id={`item-${item.id}`}
      className={cn('scroll-mt-24 rounded-2xl border-2 bg-white p-4 shadow-sm sm:p-6', provided ? 'border-emerald-300' : 'border-dashed border-sky-300')}
    >
      <header className="mb-2 flex flex-wrap items-center gap-2">
        <Inbox className="h-5 w-5 text-sky-600" />
        <h3 className="text-lg font-semibold text-slate-900">{item.section_name}</h3>
        {provided ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Got it
          </span>
        ) : null}
      </header>
      <p className="mb-3 text-base text-slate-600">{item.team_note || 'We need this from you to finish your website.'}</p>

      <label className="block">
        <span className="mb-1 block text-base font-medium text-slate-800">Type it here</span>
        <textarea
          value={answer.client_comment}
          disabled={!editable}
          rows={4}
          onChange={(e) =>
            onChange({ client_comment: e.target.value, client_status: statusFor(e.target.value, answer.attachments.length) })
          }
          placeholder="You can paste text here, or upload files below."
          className="portal-input min-h-[110px] text-base"
        />
      </label>

      <div className="mt-3">
        <AttachmentList
          token={token}
          itemId={item.id}
          attachments={answer.attachments}
          editable={editable && allowUploads}
          onChange={(attachments) =>
            onChange({ attachments, client_status: statusFor(answer.client_comment, attachments.length) })
          }
          label="Upload photos or files"
        />
      </div>
      {!provided && editable ? (
        <p className="mt-3 text-sm text-slate-500">Not ready yet? That&apos;s okay — you can still send your feedback and get this to us later.</p>
      ) : null}
    </article>
  )
}
