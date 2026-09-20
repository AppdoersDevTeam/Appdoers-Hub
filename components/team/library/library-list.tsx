'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, FileText, GitBranch, LayoutTemplate, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { SlideOver } from '@/components/ui/slide-over'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { createLibraryItemAction, deleteLibraryItemAction } from '@/lib/actions/library'
import {
  LIBRARY_KIND_BADGE,
  LIBRARY_KIND_DESCRIPTIONS,
  LIBRARY_KIND_LABELS,
  LIBRARY_KIND_PLURALS,
  LIBRARY_KINDS,
  type LibraryKind,
} from '@/lib/library/constants'
import { formatRelativeTime } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

export interface LibraryListItem {
  id: string
  kind: LibraryKind
  title: string
  summary: string | null
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
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<'all' | LibraryKind>('all')
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LibraryListItem | null>(null)
  const [form, setForm] = useState({
    kind: 'document' as LibraryKind,
    title: '',
    summary: '',
  })

  const filtered = items.filter((item) => {
    const haystack = `${item.title} ${item.summary ?? ''}`.toLowerCase()
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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.title.trim()) {
      setError('Title is required')
      return
    }
    startTransition(async () => {
      const result = await createLibraryItemAction({
        kind: form.kind,
        title: form.title,
        summary: form.summary,
        body: '',
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      setShowNew(false)
      setForm({ kind: 'document', title: '', summary: '' })
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
              ? 'Add internal documents, templates, and workflows so the team can follow the same processes.'
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
                      disabled={isPending}
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
        isPending={isPending}
      />

      <SlideOver
        open={showNew}
        onClose={() => setShowNew(false)}
        title="New library item"
        subtitle="Documents, templates, and workflows for the team"
      >
        <form onSubmit={handleCreate} className="space-y-5 px-6 py-5">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
          )}
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
            <label className={labelClass}>Title *</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Onboarding a new client"
              required
            />
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
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? 'Creating…' : 'Create and write'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowNew(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </SlideOver>
    </>
  )
}
