'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { SortDir } from '@/lib/utils/table-sort'

interface SortableThProps {
  label: string
  column: string
  sortKey: string | null
  sortDir: SortDir
  onSort: (column: string, dir: SortDir) => void
  className?: string
  align?: 'left' | 'center'
}

export function SortableTh({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
  className,
  align = 'left',
}: SortableThProps) {
  const active = sortKey === column
  const nextDir: SortDir = active && sortDir === 'asc' ? 'desc' : 'asc'
  const ariaSort = active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'

  return (
    <th
      aria-sort={ariaSort}
      className={cn(
        'px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500',
        align === 'center' ? 'text-center' : 'text-left',
        className
      )}
    >
      <div className={cn('inline-flex items-center gap-1', align === 'center' && 'justify-center')}>
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
      </div>
    </th>
  )
}
