'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, ExternalLink, FileUp, Paperclip, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { LibraryBody } from './library-body'
import {
  deleteLibraryItemAction,
  getLibraryFileDownloadUrlAction,
  removeLibraryFileAction,
  updateLibraryItemAction,
} from '@/lib/actions/library'
import { submitLibraryUpload } from '@/lib/library/upload-client'
import {
  LIBRARY_KIND_BADGE,
  LIBRARY_KIND_DESCRIPTIONS,
  LIBRARY_KIND_LABELS,
  LIBRARY_KINDS,
  type LibraryKind,
} from '@/lib/library/constants'
import { DOCUMENT_ACCEPT, formatFileSize } from '@/lib/documents'
import { formatDateTime } from '@/lib/utils/format'

export interface LibraryItemDetail {
  id: string
  kind: LibraryKind
  title: string
  summary: string | null
  body: string
  link_url: string | null
  file_name: string | null
  mime_type: string | null
  file_size: number | null
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState(!item.body.trim() && !item.file_name)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [fileMeta, setFileMeta] = useState({
    file_name: item.file_name,
    mime_type: item.mime_type,
    file_size: item.file_size,
  })
  const [form, setForm] = useState({
    kind: item.kind,
    title: item.title,
    summary: item.summary ?? '',
    body: item.body,
    link_url: item.link_url ?? '',
  })

  const busy = isPending || uploading

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

  const handleDownload = () => {
    startTransition(async () => {
      const result = await getLibraryFileDownloadUrlAction(item.id)
      if (!result.success) {
        setError(result.error)
        return
      }
      const a = document.createElement('a')
      a.href = result.data.url
      a.download = result.data.name
      a.target = '_blank'
      a.rel = 'noreferrer'
      document.body.appendChild(a)
      a.click()
      a.remove()
    })
  }

  const handleAttachFile = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setError('Choose a PDF or Word document')
      return
    }
    setError(null)
    setUploading(true)
    const result = await submitLibraryUpload({
      file,
      kind: form.kind,
      title: form.title,
      summary: form.summary,
      itemId: item.id,
    })
    setUploading(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    setFileMeta({
      file_name: result.item.file_name,
      mime_type: result.item.mime_type,
      file_size: result.item.file_size,
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
    router.refresh()
  }

  const handleRemoveFile = () => {
    startTransition(async () => {
      const result = await removeLibraryFileAction(item.id)
      if (!result.success) {
        setError(result.error)
        return
      }
      setFileMeta({ file_name: null, mime_type: null, file_size: null })
      if (fileInputRef.current) fileInputRef.current.value = ''
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
                <Button size="sm" onClick={handleSave} disabled={busy}>
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
                  disabled={busy}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setShowDelete(true)} disabled={busy} aria-label="Delete">
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
            <label className={labelClass}>File (PDF or Word)</label>
            {fileMeta.file_name && (
              <p className="mb-2 flex items-center gap-1.5 text-sm text-slate-600">
                <Paperclip className="h-3.5 w-3.5" />
                {fileMeta.file_name}
                <span className="text-slate-400">({formatFileSize(fileMeta.file_size)})</span>
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={DOCUMENT_ACCEPT}
                className="block min-w-0 flex-1 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              />
              <Button type="button" size="sm" variant="outline" onClick={handleAttachFile} disabled={busy}>
                <FileUp className="h-3.5 w-3.5" />
                {uploading ? 'Uploading…' : fileMeta.file_name ? 'Replace' : 'Attach'}
              </Button>
              {fileMeta.file_name && (
                <Button type="button" size="sm" variant="ghost" onClick={handleRemoveFile} disabled={busy}>
                  Remove file
                </Button>
              )}
            </div>
          </div>
          <div>
            <label className={labelClass}>Written notes</label>
            <p className="mb-2 text-xs text-slate-400">
              Use # headings, - lists, **bold**, and [links](https://example.com). Optional if you uploaded a file.
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
          {fileMeta.file_name && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-800">
                  <Paperclip className="h-3.5 w-3.5 shrink-0" />
                  {fileMeta.file_name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{formatFileSize(fileMeta.file_size)}</p>
              </div>
              <Button size="sm" variant="outline" onClick={handleDownload} disabled={busy}>
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
            </div>
          )}
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
          <LibraryBody
            content={form.body}
            emptyLabel={
              fileMeta.file_name
                ? 'No written notes yet. Edit this item if you want to add notes alongside the file.'
                : 'No content yet. Edit this item to write it, or attach a PDF or Word file.'
            }
          />
        </div>
      )}

      <ConfirmModal
        open={showDelete}
        title="Delete library item"
        message={`Delete "${item.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        isPending={busy}
      />
    </div>
  )
}

function cnTextarea() {
  return `${textareaClass} font-mono text-[13px] leading-relaxed`
}

function placeholderForKind(kind: LibraryKind) {
  if (kind === 'template') {
    return 'Write whatever you need.\n\nHi [CLIENT NAME],\n\n…'
  }
  if (kind === 'workflow') {
    return '# Workflow name\n\n1. First step\n2. Second step\n3. Who to notify when done'
  }
  return 'Write whatever you need — a process, policy, notes, or checklist.'
}
