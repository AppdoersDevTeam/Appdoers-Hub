'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ListFilter } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export const LIST_SELECT_CLASS =
  'h-9 max-w-[12rem] shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none'

interface ListToolbarProps {
  search: ReactNode
  filters?: ReactNode
  /** Content shown inside the Filters popover (e.g. type/priority) */
  secondaryFilters?: ReactNode
  /** Active secondary filter count for badge */
  secondaryActiveCount?: number
  actions?: ReactNode
  className?: string
}

/**
 * Left-aligned, wrapping toolbar — search on top row with primary actions,
 * filters flow naturally underneath (no forced right-rail cluster).
 */
export function ListToolbar({
  search,
  filters,
  secondaryFilters,
  secondaryActiveCount = 0,
  actions,
  className,
}: ListToolbarProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1 basis-[16rem]">{search}</div>
        {actions}
      </div>
      {(filters || secondaryFilters) && (
        <div className="flex flex-wrap items-center gap-2">
          {filters}
          {secondaryFilters ? (
            <div ref={wrapRef} className="relative">
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpen((v) => !v)}
                className={cn(
                  LIST_SELECT_CLASS,
                  'inline-flex max-w-none items-center gap-1.5',
                  secondaryActiveCount > 0 && 'border-blue-300 bg-blue-50 text-blue-800'
                )}
              >
                <ListFilter className="h-3.5 w-3.5 shrink-0" />
                More
                {secondaryActiveCount > 0 ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold text-white">
                    {secondaryActiveCount}
                  </span>
                ) : null}
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform',
                    open && 'rotate-180'
                  )}
                />
              </button>
              {open ? (
                <div
                  id={panelId}
                  role="dialog"
                  aria-label="More filters"
                  className="absolute left-0 top-full z-50 mt-1 flex w-[min(16rem,calc(100vw-2rem))] flex-col gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-lg"
                >
                  {secondaryFilters}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
