'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, FileText, FileUp, GitBranch, LayoutTemplate, Paperclip, PenLine, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { SlideOver } from '@/components/ui/slide-over'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { createLibraryItemAction, deleteLibraryItemAction } from '@/lib/actions/library'
import { submitLibraryUpload } from '@/lib/library/upload-client'
import {
  LIBRARY_KIND_BADGE,
  LIBRARY_KIND_DESCRIPTIONS,
  LIBRARY_KIND_LABELS,
  LIBRARY_KIND_PLURALS,
  LIBRARY_KINDS,
  titleFromFileName,
  type LibraryKind,
} from '@/lib/library/constants'
import { DOCUMENT_ACCEPT } from '@/lib/documents'
import { formatRelativeTime } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

export interface LibraryListItem {
  id: string
  kind: LibraryKind
  title: string
  summary: string | null
  file_name: string | null
  updated_at: string
  author_name: string | null
}

const KIND_ICONS = {
  document: FileText,
  template: LayoutTemplate,
  workflow: GitBranch,
}

const labelClass = 'block text-xs font-medium text-slate-500 mb-1'
const selectClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none'
const textareaClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none resize-y'

export function LibraryList({
  items,
  canEdit,
}: {
  items: LibraryListItem[]
  canEdit: boolean
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<'all' | LibraryKind>('all')
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LibraryListItem | null>(null)
  const [form, setForm] = useState({
    kind: 'document' as LibraryKind,
    title: '',
    summary: '',
    body: '',
    source: 'write' as 'write' | 'upload',
  })

  const busy = isPending || uploading
  const filtered = items.filter((item) => {
    const haystack = `${item.title} ${item.summary ?? ''} ${item.file_name ?? ''}`.toLowerCase()
    const matchSearch = haystack.includes(search.toLowerCase())
    const matchKind = kindFilter === 'all' || item.kind === kindFilter
    return matchSearch && matchKind
  })

  const counts = {
    all: items.length,
    document: items.filter((i) => i.kind === 'document').length,
    template: items.filter((i) => i.kind === 'template').length,
    workflow: items.filter((i) => i.kind === 'workflow').length,
  }

  const resetForm = () => {
    setForm({ kind: 'document', title: '', summary: '', body: '', source: 'write' })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const closeNew = () => {
    setShowNew(false)
    setError(null)
    resetForm()
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const file = fileInputRef.current?.files?.[0]

    if (form.source === 'upload') {
      if (!file) {
        setError('Choose a PDF or Word document')
        return
      }
      setUploading(true)
      const result = await submitLibraryUpload({
        file,
        kind: form.kind,
        title: form.title,
        summary: form.summary,
      })
      setUploading(false)
      if (!result.success) {
        setError(result.error)
        return
      }
      closeNew()
      router.push(`/app/library/${result.item.id}`)
      return
    }

    if (!form.title.trim()) {
      setError('Title is required')
      return
    }
    startTransition(async () => {
      const result = await createLibraryItemAction({
        kind: form.kind,
        title: form.title,
        summary: form.summary,
        body: form.body,
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      closeNew()
      router.push(`/app/library/${result.data.id}`)
    })
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteLibraryItemAction(deleteTarget.id)
      if (!result.success) {
        setError(result.error)
        return
      }
      setDeleteTarget(null)
      router.refresh()
    })
  }

  return (
    <>
      {error && !showNew && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search library…"
            className="pl-9"
          />
        </div>
        {canEdit && (
          <Button onClick={() => setShowNew(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New item
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', ...LIBRARY_KINDS] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setKindFilter(kind)}
            aria-pressed={kindFilter === kind}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              kindFilter === kind
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
            )}
          >
            {kind === 'all' ? 'All' : LIBRARY_KIND_PLURALS[kind]}
            <span className="ml-1.5 text-slate-400">{counts[kind]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={items.length === 0 ? 'No library items yet' : 'No matching items'}
          description={
            items.length === 0
              ? 'Write a process in Hub, or upload a PDF or Word document so the team can follow the same work.'
              : 'Try a different search or filter.'
          }
          action={
            canEdit && items.length === 0 ? (
              <Button onClick={() => setShowNew(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> Add first item
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => {
            const Icon = KIND_ICONS[item.kind]
            return (
              <div key={item.id} className="hub-card flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant={LIBRARY_KIND_BADGE[item.kind]}>{LIBRARY_KIND_LABELS[item.kind]}</Badge>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      disabled={busy}
                      className="rounded p-1 text-slate-400 hover:text-red-600"
                      title="Delete"
                      aria-label={`Delete ${item.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Link href={`/app/library/${item.id}`} className="mt-3 group">
                  <div className="flex items-start gap-2">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <h2 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600">
                      {item.title}
                    </h2>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-slate-500">
                    {item.summary || 'No summary yet.'}
                  </p>
                </Link>
                {item.file_name && (
                  <p className="mt-3 flex items-center gap-1.5 truncate text-xs text-slate-500">
                    <Paperclip className="h-3 w-3 shrink-0" />
                    {item.file_name}
                  </p>
                )}
                <p className="mt-auto pt-4 text-xs text-slate-400">
                  Updated {formatRelativeTime(item.updated_at)}
                  {item.author_name ? ` · ${item.author_name}` : ''}
                </p>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete library item"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isPending={busy}
      />

      <SlideOver
        open={showNew}
        onClose={closeNew}
        title="New library item"
        subtitle="Write it in Hub, or upload a PDF or Word file"
      >
        <form onSubmit={handleCreate} className="space-y-5 px-6 py-5">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
          )}
          <div>
            <p className={labelClass}>How do you want to add this?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, source: 'write' }))}
                aria-pressed={form.source === 'write'}
                className={cn(
                  'rounded-lg border px-3 py-3 text-left transition-colors',
                  form.source === 'write'
                    ? 'border-blue-200 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                )}
              >
                <PenLine className="mb-1.5 h-4 w-4" />
                <span className="block text-sm font-medium">Write it</span>
                <span className="mt-0.5 block text-xs opacity-80">Notes, process, or copy</span>
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, source: 'upload' }))}
                aria-pressed={form.source === 'upload'}
                className={cn(
                  'rounded-lg border px-3 py-3 text-left transition-colors',
                  form.source === 'upload'
                    ? 'border-blue-200 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                )}
              >
                <FileUp className="mb-1.5 h-4 w-4" />
                <span className="block text-sm font-medium">Upload a file</span>
                <span className="mt-0.5 block text-xs opacity-80">PDF, DOC, or DOCX</span>
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>Type *</label>
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
            <label className={labelClass}>Title {form.source === 'write' ? '*' : ''}</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Onboarding a new client"
              required={form.source === 'write'}
            />
            {form.source === 'upload' && (
              <p className="mt-1 text-xs text-slate-400">Leave blank to use the file name.</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Summary</label>
            <textarea
              className={textareaClass}
              rows={3}
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              placeholder="Short description of what this is for"
            />
          </div>
          {form.source === 'write' ? (
            <div>
              <label className={labelClass}>Content</label>
              <textarea
                className={`${textareaClass} font-mono text-[13px] leading-relaxed`}
                rows={10}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Write whatever you need — a process, template, notes, or checklist."
              />
            </div>
          ) : (
            <div>
              <label className={labelClass}>File (PDF or Word) *</label>
              <input
                ref={fileInputRef}
                type="file"
                accept={DOCUMENT_ACCEPT}
                required
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file && !form.title.trim()) {
                    setForm((f) => ({ ...f, title: titleFromFileName(file.name) }))
                  }
                }}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={busy} className="flex-1">
              {busy
                ? form.source === 'upload'
                  ? 'Uploading…'
                  : 'Creating…'
                : form.source === 'upload'
                  ? 'Upload'
                  : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={closeNew}>
              Cancel
            </Button>
          </div>
        </form>
      </SlideOver>
    </>
  )
}
