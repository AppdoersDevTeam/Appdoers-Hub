'use client'

import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { SortDir } from '@/lib/utils/table-sort'

interface Props {
  label: string
  column: string
  sortKey: string | null
  sortDir: SortDir
  onSort: (column: string, dir: SortDir) => void
  width?: number
  onResize?: (column: string, width: number) => void
  minWidth?: number
  className?: string
  align?: 'left' | 'center'
  resizable?: boolean
  sortable?: boolean
}

export function ResizableSortableTh({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
  width,
  onResize,
  minWidth = 80,
  className,
  align = 'left',
  resizable = true,
  sortable = true,
}: Props) {
  const active = sortKey === column
  const nextDir: SortDir = active && sortDir === 'asc' ? 'desc' : 'asc'
  const ariaSort = sortable ? (active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined
  const startX = useRef(0)
  const startW = useRef(0)

  const onPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      if (!onResize || !resizable) return
      event.preventDefault()
      event.stopPropagation()
      const th = (event.currentTarget as HTMLElement).closest('th')
      const current = width ?? th?.getBoundingClientRect().width ?? minWidth
      startX.current = event.clientX
      startW.current = current
      const target = event.currentTarget as HTMLElement
      target.setPointerCapture(event.pointerId)

      const onMove = (e: PointerEvent) => {
        const next = Math.max(minWidth, startW.current + (e.clientX - startX.current))
        onResize(column, next)
      }
      const onUp = (e: PointerEvent) => {
        target.releasePointerCapture(e.pointerId)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [column, minWidth, onResize, resizable, width]
  )

  return (
    <th
      aria-sort={ariaSort}
      style={width != null ? { width, minWidth: Math.min(width, minWidth) } : undefined}
      className={cn(
        'relative px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500',
        align === 'center' ? 'text-center' : 'text-left',
        className
      )}
    >
      <div className={cn('inline-flex items-center gap-1 pr-2', align === 'center' && 'justify-center')}>
        {sortable ? (
          <>
            <button
              type="button"
              onClick={() => onSort(column, nextDir)}
              className="whitespace-nowrap hover:text-slate-800"
            >
              {label}
            </button>
            <span className="flex flex-col -space-y-1">
              <button
                type="button"
                tabIndex={-1}
                onClick={() => onSort(column, 'asc')}
                className="rounded p-0 leading-none"
                aria-label={`Sort ${label} ascending`}
                title="Sort ascending"
              >
                <ChevronUp
                  className={cn(
                    'h-3 w-3',
                    active && sortDir === 'asc' ? 'text-blue-600' : 'text-slate-300 hover:text-slate-500'
                  )}
                />
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => onSort(column, 'desc')}
                className="rounded p-0 leading-none"
                aria-label={`Sort ${label} descending`}
                title="Sort descending"
              >
                <ChevronDown
                  className={cn(
                    'h-3 w-3',
                    active && sortDir === 'desc' ? 'text-blue-600' : 'text-slate-300 hover:text-slate-500'
                  )}
                />
              </button>
            </span>
          </>
        ) : (
          <span className="whitespace-nowrap">{label}</span>
        )}
      </div>
      {resizable && onResize ? (
        <span
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${label} column`}
          onPointerDown={onPointerDown}
          className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize touch-none select-none hover:bg-blue-200/80"
        />
      ) : null}
    </th>
  )
}
