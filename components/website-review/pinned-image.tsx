'use client'

import { cn } from '@/lib/utils/cn'
import type { ReviewPin } from '@/lib/website-review/types'

/** Read-only screenshot with numbered pin markers. `numberOffset` lets desktop + mobile share one numbering. */
export function PinnedImage({
  src,
  alt,
  pins,
  numberOffset = 0,
  className,
  highlightId,
}: {
  src: string
  alt: string
  pins: ReviewPin[]
  numberOffset?: number
  className?: string
  highlightId?: string | null
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-md border border-slate-200 bg-slate-50', className)}>
      <img src={src} alt={alt} className="block h-auto w-full" />
      {pins.map((pin, i) => (
        <span
          key={pin.id}
          className={cn(
            'absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-md',
            highlightId === pin.id ? 'scale-125 bg-amber-500' : 'bg-violet-600'
          )}
          style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
        >
          {numberOffset + i + 1}
        </span>
      ))}
    </div>
  )
}
