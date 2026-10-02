'use client'

import { cn } from '@/lib/utils/cn'
import type { ReviewPin } from '@/lib/website-review/types'

/** Screenshot the client taps to drop numbered pins. Pin numbers continue from `numberOffset`. */
export function PinImage({
  src,
  alt,
  pins,
  numberOffset = 0,
  editable,
  activeId,
  onAdd,
  onSelect,
  className,
}: {
  src: string
  alt: string
  pins: ReviewPin[]
  numberOffset?: number
  editable: boolean
  activeId: string | null
  onAdd: (x: number, y: number) => void
  onSelect: (id: string) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative select-none overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm',
        editable ? 'cursor-crosshair' : '',
        className
      )}
      onClick={(e) => {
        if (!editable) return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        onAdd(Math.round(x * 10) / 10, Math.round(y * 10) / 10)
      }}
    >
      <img src={src} alt={alt} draggable={false} className="pointer-events-none block h-auto w-full" />
      {pins.map((pin, i) => (
        <button
          key={pin.id}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onSelect(pin.id)
          }}
          className={cn(
            'absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-white text-sm font-bold text-white shadow-lg transition-transform',
            activeId === pin.id ? 'scale-110 bg-amber-500' : 'bg-violet-600'
          )}
          style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
          aria-label={`Change ${numberOffset + i + 1}`}
        >
          {numberOffset + i + 1}
        </button>
      ))}
    </div>
  )
}
