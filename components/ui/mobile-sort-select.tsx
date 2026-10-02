'use client'

import type { TableColumnDef } from '@/hooks/use-table-prefs'
import type { SortDir } from '@/lib/utils/table-sort'
import { LIST_SELECT_CLASS } from '@/components/ui/list-toolbar'
import { cn } from '@/lib/utils/cn'

interface Props {
  columns: TableColumnDef[]
  sortKey: string | null
  sortDir: SortDir
  onSort: (column: string, dir: SortDir) => void
  className?: string
}

/** Sort control for the mobile card view, where column headers aren't shown. */
export function MobileSortSelect({ columns, sortKey, sortDir, onSort, className }: Props) {
  const sortable = columns.filter((c) => c.sortable !== false)
  if (sortable.length === 0) return null

  const value = sortKey ? `${sortKey}:${sortDir}` : ''

  return (
    <select
      aria-label="Sort by"
      className={cn(LIST_SELECT_CLASS, 'md:hidden', className)}
      value={value}
      onChange={(e) => {
        const [column, dir] = e.target.value.split(':')
        if (column) onSort(column, dir === 'desc' ? 'desc' : 'asc')
      }}
    >
      <option value="" disabled>
        Sort by…
      </option>
      {sortable.flatMap((col) => [
        <option key={`${col.id}:asc`} value={`${col.id}:asc`}>
          {col.label} ↑
        </option>,
        <option key={`${col.id}:desc`} value={`${col.id}:desc`}>
          {col.label} ↓
        </option>,
      ])}
    </select>
  )
}
