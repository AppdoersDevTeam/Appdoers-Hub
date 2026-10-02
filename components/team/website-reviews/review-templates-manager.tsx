'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Plus, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { cn } from '@/lib/utils/cn'
import {
  createReviewTemplateAction,
  deleteReviewTemplateAction,
  duplicateReviewTemplateAction,
  saveReviewSettingsAction,
  saveReviewTemplateAction,
} from '@/lib/actions/review-templates'
import type { ReviewItemKind, ReviewSettings } from '@/lib/website-review/types'
import { SectionsEditor, type EditableSection } from './sections-editor'

export type TemplateWithItems = {
  id: string
  name: string
  description: string
  is_default: boolean
  items: { id: string; page_name: string; section_name: string; kind: ReviewItemKind; team_note: string | null }[]
}

function toEditable(tpl: TemplateWithItems): EditableSection[] {
  return tpl.items.map((item) => ({ ...item, key: item.id }))
}

export function ReviewTemplatesManager({
  templates,
  settings,
}: {
  templates: TemplateWithItems[]
  settings: ReviewSettings
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState<string | null>(templates[0]?.id ?? null)
  const selected = templates.find((t) => t.id === selectedId) ?? null

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [items, setItems] = useState<EditableSection[]>([])
  const [dirty, setDirty] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [videoUrl, setVideoUrl] = useState(settings.walkthrough_video_url)
  const [turnaround, setTurnaround] = useState(String(settings.turnaround_days))

  const loadedId = useRef<string | null>(null)
  useEffect(() => {
    if (!selected) return
    // Refresh from the server copy unless the user is mid-edit on this same template.
    if (selected.id === loadedId.current && dirty) return
    loadedId.current = selected.id
    setName(selected.name)
    setDescription(selected.description)
    setIsDefault(selected.is_default)
    setItems(toEditable(selected))
    setDirty(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

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

  function createTemplate() {
    run(
      async () => {
        const result = await createReviewTemplateAction({ name: 'New template' })
        if (result.success) setSelectedId(result.data.id)
        return result
      },
      'Template created'
    )
  }

  function save() {
    if (!selected) return
    run(
      () =>
        saveReviewTemplateAction(selected.id, {
          name,
          description,
          is_default: isDefault,
          items: items.map((item) => ({
            id: item.id,
            page_name: item.page_name,
            section_name: item.section_name,
            kind: item.kind,
            team_note: item.team_note,
          })),
        }),
      'Template saved',
      () => setDirty(false)
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <div className="space-y-4">
        <div className="hub-card space-y-2 p-3 sm:p-3">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => {
                if (dirty && !window.confirm('Discard unsaved changes?')) return
                setSelectedId(tpl.id)
              }}
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                tpl.id === selectedId ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-700 hover:bg-slate-50'
              )}
            >
              <span className="truncate">{tpl.name}</span>
              <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
                {tpl.is_default ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> : null}
                {tpl.items.length}
              </span>
            </button>
          ))}
          {templates.length === 0 ? <p className="px-3 py-2 text-sm text-slate-500">No templates yet.</p> : null}
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={createTemplate} disabled={isPending}>
            <Plus className="h-4 w-4" /> New template
          </Button>
        </div>

        <div className="hub-card space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Review settings</h3>
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Walkthrough video link (shown to clients)</span>
            <input className="hub-input" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Our turnaround after feedback (days)</span>
            <input className="hub-input" type="number" min={1} max={60} value={turnaround} onChange={(e) => setTurnaround(e.target.value)} />
          </label>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={isPending}
            onClick={() =>
              run(
                () => saveReviewSettingsAction({ walkthrough_video_url: videoUrl, turnaround_days: Number(turnaround) }),
                'Settings saved'
              )
            }
          >
            Save settings
          </Button>
        </div>
      </div>

      {selected ? (
        <div className="hub-card space-y-5">
          <div className="flex flex-wrap items-start gap-3">
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
              <input
                className="hub-input font-semibold"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setDirty(true)
                }}
                aria-label="Template name"
              />
              <input
                className="hub-input"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setDirty(true)
                }}
                placeholder="Description (optional)"
                aria-label="Description"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => {
                    setIsDefault(e.target.checked)
                    setDirty(true)
                  }}
                />
                Default
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  run(
                    async () => {
                      const result = await duplicateReviewTemplateAction(selected.id)
                      if (result.success) setSelectedId(result.data.id)
                      return result
                    },
                    'Template duplicated'
                  )
                }
              >
                <Copy className="h-3.5 w-3.5" /> Duplicate
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3.5 w-3.5 text-red-500" /> Delete
              </Button>
            </div>
          </div>

          <SectionsEditor
            items={items}
            makeItem={(base) => base}
            onChange={(next) => {
              setItems(next)
              setDirty(true)
            }}
            disabled={isPending}
          />

          <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:-mx-6 sm:px-6">
            <Button type="button" onClick={save} loading={isPending} disabled={!dirty}>
              Save template
            </Button>
            {dirty ? <Badge variant="warning">Unsaved changes</Badge> : null}
            {message ? (
              <span className={cn('text-sm', message.tone === 'error' ? 'text-red-600' : 'text-emerald-600')}>{message.text}</span>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="hub-card text-sm text-slate-500">Create a template to get started.</div>
      )}

      <ConfirmModal
        open={confirmDelete}
        title="Delete template?"
        message="Existing reviews keep their sections. This only removes the template."
        confirmLabel="Delete"
        danger
        isPending={isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          selected &&
          run(() => deleteReviewTemplateAction(selected.id), 'Template deleted', () => {
            setConfirmDelete(false)
            setSelectedId(templates.find((t) => t.id !== selected.id)?.id ?? null)
          })
        }
      />
    </div>
  )
}
