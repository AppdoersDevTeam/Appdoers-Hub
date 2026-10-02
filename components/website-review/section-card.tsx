'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Expand, Loader2, Monitor, Paperclip, Pencil, Smartphone, Sparkles, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { signedUpload } from '@/lib/website-review/upload-client'
import type { PublicReviewItem } from '@/lib/website-review/public'
import type { ReviewAttachment, ReviewItemStatus, ReviewPin, ReviewView } from '@/lib/website-review/types'
import { PinImage } from './pin-image'
import { BeforeAfter } from './before-after'

export type ItemAnswer = {
  client_status: ReviewItemStatus
  client_comment: string
  pins: ReviewPin[]
  attachments: (ReviewAttachment & { url?: string | null })[]
}

const TIP_KEY = 'appdoers-review-pin-tip'

function readTipSeen() {
  try {
    return window.localStorage.getItem(TIP_KEY) === '1'
  } catch {
    return true
  }
}

function markTipSeen() {
  try {
    window.localStorage.setItem(TIP_KEY, '1')
  } catch {
    // Storage blocked: the tip simply shows again next time.
  }
}

export function AttachmentList({
  token,
  itemId,
  attachments,
  editable,
  onChange,
  label,
}: {
  token: string
  itemId: string
  attachments: ItemAnswer['attachments']
  editable: boolean
  onChange: (next: ItemAnswer['attachments']) => void
  label: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endpoint = `/api/website-reviews/public/${token}/attachment`

  async function upload(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    setError(null)
    let latest = attachments
    try {
      for (const file of Array.from(files)) {
        const result = await signedUpload<{ attachments: ReviewAttachment[] }>(endpoint, file, { item_id: itemId })
        latest = result.attachments
        onChange(latest)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function remove(path: string) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'remove', item_id: itemId, storage_path: path }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not remove the file')
      onChange(json.attachments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the file')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      {attachments.length > 0 ? (
        <ul className="space-y-1.5">
          {attachments.map((a) => (
            <li key={a.path} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1 truncate">{a.name}</span>
              {editable ? (
                <button type="button" onClick={() => remove(a.path)} className="p-1 text-slate-400 hover:text-red-600" aria-label={`Remove ${a.name}`}>
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {editable ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-violet-400 hover:bg-violet-50 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          {busy ? 'Uploading…' : label}
        </button>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={(e) => {
          void upload(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}

export function SectionCard({
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
  const [view, setView] = useState<ReviewView>(item.desktop_url ? 'desktop' : 'mobile')
  const [activePin, setActivePin] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [showTip, setShowTip] = useState(false)
  const commentRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  useEffect(() => {
    if (answer.client_status === 'changes' && !readTipSeen()) setShowTip(true)
  }, [answer.client_status])

  const imageUrl = view === 'mobile' ? item.mobile_url : item.desktop_url
  const desktopPins = answer.pins.filter((p) => p.view === 'desktop')
  const mobilePins = answer.pins.filter((p) => p.view === 'mobile')
  const viewPins = view === 'desktop' ? desktopPins : mobilePins
  const offset = view === 'desktop' ? 0 : desktopPins.length
  const orderedPins = [...desktopPins, ...mobilePins]
  const isChanges = answer.client_status === 'changes'

  function addPin(x: number, y: number) {
    const pin: ReviewPin = { id: crypto.randomUUID(), x, y, view, comment: '', task_id: null }
    onChange({ pins: [...answer.pins, pin], client_status: 'changes' })
    setActivePin(pin.id)
    setFullscreen(false)
    setShowTip(false)
    markTipSeen()
    setTimeout(() => commentRefs.current[pin.id]?.focus(), 50)
  }

  function updatePin(id: string, comment: string) {
    onChange({ pins: answer.pins.map((p) => (p.id === id ? { ...p, comment } : p)) })
  }

  function removePin(id: string) {
    onChange({ pins: answer.pins.filter((p) => p.id !== id) })
    if (activePin === id) setActivePin(null)
  }

  function selectPin(id: string) {
    setActivePin(id)
    setFullscreen(false)
    setTimeout(() => commentRefs.current[id]?.focus(), 50)
  }

  const pinImage = (big: boolean) =>
    imageUrl ? (
      <PinImage
        src={imageUrl}
        alt={item.section_name}
        pins={viewPins}
        numberOffset={offset}
        editable={editable && isChanges}
        activeId={activePin}
        onAdd={addPin}
        onSelect={selectPin}
        className={cn(view === 'mobile' && !big ? 'mx-auto max-w-[320px]' : '')}
      />
    ) : null

  return (
    <article
      id={`item-${item.id}`}
      className={cn(
        'scroll-mt-24 rounded-2xl border bg-white p-4 shadow-sm sm:p-6',
        answer.client_status === 'looks_good' ? 'border-emerald-300' : isChanges ? 'border-amber-300' : 'border-slate-200'
      )}
    >
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold text-slate-900">{item.section_name}</h3>
        {item.updated ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
            <Sparkles className="h-3.5 w-3.5" /> Updated
          </span>
        ) : null}
      </header>

      {item.team_note ? (
        <p className="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-base text-sky-900">
          <span className="font-semibold">From Appdoers: </span>
          {item.team_note}
        </p>
      ) : null}

      {item.desktop_url && item.mobile_url ? (
        <div className="mb-3 inline-flex rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Screen size">
          {(['desktop', 'mobile'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn(
                'inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-4 text-sm font-medium',
                view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              )}
            >
              {v === 'desktop' ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
              {v === 'desktop' ? 'Computer' : 'Phone'}
            </button>
          ))}
        </div>
      ) : null}

      {imageUrl ? (
        <div className="space-y-2">
          {item.before_url && view === 'desktop' && !isChanges ? (
            <BeforeAfter before={item.before_url} after={imageUrl} alt={item.section_name} />
          ) : (
            pinImage(false)
          )}
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-medium text-violet-700"
          >
            <Expand className="h-4 w-4" /> Make picture bigger
          </button>
        </div>
      ) : null}

      <div className="mt-4">
        <p className="mb-2 text-base font-medium text-slate-800">Are you happy with this part?</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!editable}
            onClick={() => onChange({ client_status: 'looks_good' })}
            className={cn(
              'flex min-h-[56px] items-center justify-center gap-2 rounded-xl border-2 px-3 text-base font-semibold transition-colors disabled:opacity-70',
              answer.client_status === 'looks_good'
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400'
            )}
          >
            <Check className="h-5 w-5" /> Looks good
          </button>
          <button
            type="button"
            disabled={!editable}
            onClick={() => onChange({ client_status: 'changes' })}
            className={cn(
              'flex min-h-[56px] items-center justify-center gap-2 rounded-xl border-2 px-3 text-base font-semibold transition-colors disabled:opacity-70',
              isChanges ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400'
            )}
          >
            <Pencil className="h-5 w-5" /> Needs changes
          </button>
        </div>
      </div>

      {isChanges ? (
        <div className="mt-4 space-y-4">
          {imageUrl && editable ? (
            <p className={cn('rounded-lg px-3 py-2 text-base', showTip ? 'bg-amber-100 font-medium text-amber-900' : 'bg-amber-50 text-amber-900')}>
              👆 Tap the picture on the exact spot you want changed, then type what you&apos;d like.
            </p>
          ) : null}

          {orderedPins.length > 0 ? (
            <ol className="space-y-3">
              {orderedPins.map((pin, i) => (
                <li key={pin.id} className="flex gap-3">
                  <span
                    className={cn(
                      'mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white',
                      activePin === pin.id ? 'bg-amber-500' : 'bg-violet-600'
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <textarea
                      ref={(el) => {
                        commentRefs.current[pin.id] = el
                      }}
                      value={pin.comment}
                      disabled={!editable}
                      onFocus={() => setActivePin(pin.id)}
                      onChange={(e) => updatePin(pin.id, e.target.value)}
                      rows={2}
                      placeholder="What would you like changed here?"
                      className="portal-input min-h-[64px] text-base"
                    />
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      {pin.view === 'mobile' ? <span>On the phone picture</span> : null}
                      {editable ? (
                        <button type="button" onClick={() => removePin(pin.id)} className="inline-flex items-center gap-1 py-1 text-slate-500 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-base font-medium text-slate-800">
              {orderedPins.length ? 'Anything else about this part?' : 'What would you like changed?'}
            </span>
            <textarea
              value={answer.client_comment}
              disabled={!editable}
              onChange={(e) => onChange({ client_comment: e.target.value })}
              rows={3}
              placeholder="e.g. Please use our new logo, and change the heading to 'Welcome home'."
              className="portal-input min-h-[88px] text-base"
            />
          </label>

          <AttachmentList
            token={token}
            itemId={item.id}
            attachments={answer.attachments}
            editable={editable && allowUploads}
            onChange={(attachments) => onChange({ attachments })}
            label="Add photos or files"
          />
        </div>
      ) : null}

      {fullscreen && imageUrl ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/95" role="dialog" aria-modal="true" aria-label={item.section_name}>
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-white safe-top">
            <p className="text-sm">
              {editable && isChanges ? 'Tap where you want something changed.' : item.section_name}
            </p>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-white px-4 text-sm font-semibold text-slate-900"
            >
              Done
            </button>
          </div>
          <div className="flex-1 overflow-auto px-2 pb-6">{pinImage(true)}</div>
        </div>
      ) : null}
    </article>
  )
}
