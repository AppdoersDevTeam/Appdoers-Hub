'use client'

import { useRef, useState } from 'react'
import { Loader2, Monitor, Smartphone, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { signedUpload } from '@/lib/website-review/upload-client'
import { SCREENSHOT_TYPES } from '@/lib/website-review/types'

/**
 * Click to pick, drag a file in, or click then Ctrl+V to paste a screenshot.
 * Disabled until the section has been saved (needs an id).
 */
export function ScreenshotZone({
  itemId,
  view,
  url,
  onUploaded,
  onRemove,
}: {
  itemId: string | undefined
  view: 'desktop' | 'mobile'
  url: string | null
  onUploaded: (url: string | null) => void
  onRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const Icon = view === 'mobile' ? Smartphone : Monitor
  const label = view === 'mobile' ? 'Mobile (optional)' : 'Desktop'

  async function upload(file: File | null | undefined) {
    if (!file || !itemId) return
    if (!SCREENSHOT_TYPES.has(file.type)) {
      setError('PNG or JPG only')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await signedUpload<{ url: string | null }>(`/api/website-reviews/items/${itemId}/screenshot`, file, { view })
      onUploaded(result.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  if (!itemId) {
    return (
      <div className="flex h-24 w-full items-center justify-center rounded-md border border-dashed border-slate-200 px-3 text-center text-xs text-slate-400 sm:w-44">
        Save sections to add a {view} screenshot
      </div>
    )
  }

  return (
    <div className="w-full sm:w-44">
      <div
        role="button"
        tabIndex={0}
        aria-label={`${label} screenshot: click to choose, or focus and paste`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onPaste={(e) => {
          const file = Array.from(e.clipboardData.files)[0]
          if (file) {
            e.preventDefault()
            void upload(file)
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void upload(e.dataTransfer.files[0])
        }}
        className={cn(
          'group relative flex h-24 cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-slate-50 text-xs text-slate-500 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200',
          dragging ? 'border-blue-500 bg-blue-50' : url ? 'border-slate-200' : 'border-dashed border-slate-300 hover:border-blue-400'
        )}
      >
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        ) : url ? (
          <img src={url} alt={`${label} screenshot`} className="h-full w-full object-cover object-top" />
        ) : (
          <span className="flex flex-col items-center gap-1 px-2 text-center">
            <Icon className="h-4 w-4" />
            {label}
            <span className="text-[10px] text-slate-400">Click, drop or paste</span>
          </span>
        )}
        {url && !busy ? (
          <span className="absolute left-1 top-1 rounded bg-white/90 px-1 text-[10px] text-slate-600">
            <Icon className="mr-0.5 inline h-3 w-3" />
            {view}
          </span>
        ) : null}
      </div>
      {url && !busy ? (
        <button type="button" onClick={onRemove} className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-500">
          <X className="h-3 w-3" /> Remove
        </button>
      ) : null}
      {error ? <p className="mt-1 text-[11px] text-red-600">{error}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          void upload(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}
