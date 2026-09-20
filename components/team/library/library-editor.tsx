'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { LibraryBody } from './library-body'
import { deleteLibraryItemAction, updateLibraryItemAction } from '@/lib/actions/library'
import {
  LIBRARY_KIND_BADGE,
  LIBRARY_KIND_DESCRIPTIONS,
  LIBRARY_KIND_LABELS,
  LIBRARY_KINDS,
  type LibraryKind,
} from '@/lib/library/constants'
import { formatDateTime } from '@/lib/utils/format'

export interface LibraryItemDetail {
  id: string
  kind: LibraryKind
  title: string
  summary: string | null
  body: string
  link_url: string | null
  created_at: string
  updated_at: string
  author_name: string | null
  editor_name: string | null
}

const labelClass = 'block text-xs font-medium text-slate-500 mb-1'
const selectClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none'
const textareaClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none resize-y'

export function LibraryEditor({
  item,
  canEdit,
}: {
  item: LibraryItemDetail
  canEdit: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(!item.body.trim())
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [form, setForm] = useState({
    kind: item.kind,
    title: item.title,
    summary: item.summary ?? '',
    body: item.body,
    link_url: item.link_url ?? '',
  })

  const handleSave = () => {
    setError(null)
    startTransition(async () => {
      const result = await updateLibraryItemAction(item.id, form)
      if (!result.success) {
        setError(result.error)
        return
      }
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      router.refresh()
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteLibraryItemAction(item.id)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.push('/app/library')
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <Link href="/app/library" className="mt-1 text-slate-500 hover:text-slate-700" aria-label="Back to library">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">{form.title || 'Untitled'}</h1>
            <Badge variant={LIBRARY_KIND_BADGE[form.kind]}>
              {LIBRARY_KIND_LABELS[form.kind]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Updated {formatDateTime(item.updated_at)}
            {item.editor_name || item.author_name ? ` · ${item.editor_name || item.author_name}` : ''}
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button size="sm" onClick={handleSave} disabled={isPending}>
                  {isPending ? 'Saving…' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setForm({
                      kind: item.kind,
                      title: item.title,
                      summary: item.summary ?? '',
                      body: item.body,
                      link_url: item.link_url ?? '',
                    })
                    setEditing(false)
                    setError(null)
                  }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setShowDelete(true)} disabled={isPending} aria-label="Delete">
              <Trash2 className="h-3.5 w-3.5 text-slate-500" />
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
      )}
      {saved && !error && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          Saved
        </div>
      )}

      {editing ? (
        <div className="hub-card space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Type</label>
              <select
                className={selectClass}
                value={form.kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as LibraryKind }))}
              >
                {LIBRARY_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {LIBRARY_KIND_LABELS[kind]} — {LIBRARY_KIND_DESCRIPTIONS[kind]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>External link</label>
              <Input
                value={form.link_url}
                onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
                placeholder="https://…"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Title *</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Summary</label>
            <textarea
              className={textareaClass}
              rows={2}
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              placeholder="One-line description for the library list"
            />
          </div>
          <div>
            <label className={labelClass}>Content</label>
            <p className="mb-2 text-xs text-slate-400">
              Use # headings, - lists, **bold**, and [links](https://example.com).
            </p>
            <textarea
              className={cnTextarea()}
              rows={18}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder={placeholderForKind(form.kind)}
            />
          </div>
        </div>
      ) : (
        <div className="hub-card space-y-5">
          {form.summary && <p className="text-sm text-slate-600">{form.summary}</p>}
          {form.link_url && (
            <a
              href={form.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Open linked resource <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <LibraryBody content={form.body} />
        </div>
      )}

      <ConfirmModal
        open={showDelete}
        title="Delete library item"
        message={`Delete "${item.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        isPending={isPending}
      />
    </div>
  )
}

function cnTextarea() {
  return `${textareaClass} font-mono text-[13px] leading-relaxed`
}

function placeholderForKind(kind: LibraryKind) {
  if (kind === 'template') {
    return 'Paste the reusable copy here.\n\nHi [CLIENT NAME],\n\n…'
  }
  if (kind === 'workflow') {
    return '# Workflow name\n\n1. First step\n2. Second step\n3. Who to notify when done'
  }
  return '# Guide title\n\nWrite the internal process or policy here.'
}
