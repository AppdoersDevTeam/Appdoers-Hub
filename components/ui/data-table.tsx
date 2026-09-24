'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'
import {
  FLEX_COLUMN_WIDTH,
  resolveColumnWidth,
  type TableColumnDef,
} from '@/hooks/use-table-prefs'

export { FLEX_COLUMN_WIDTH, resolveColumnWidth }

export function sumColumnWidths(
  columns: TableColumnDef[],
  widths: Record<string, number>
): number {
  return columns.reduce((sum, col) => sum + resolveColumnWidth(col, widths), 0)
}

interface DataTableProps {
  columns: TableColumnDef[]
  widthFor: (id: string) => number
  children: ReactNode
  className?: string
}

/**
 * Fixed-layout table that keeps pixel column widths and scrolls horizontally
 * instead of crushing columns (which caused overlapping cell text).
 */
export function DataTable({ columns, widthFor, children, className }: DataTableProps) {
  const total = columns.reduce((sum, col) => sum + widthFor(col.id), 0)

  return (
    <table
      className={cn('table-fixed text-sm', className)}
      style={{ width: Math.max(total, 640), minWidth: total }}
    >
      <colgroup>
        {columns.map((col) => (
          <col key={col.id} style={{ width: widthFor(col.id) }} />
        ))}
      </colgroup>
      {children}
    </table>
  )
}

export const dataTableCellClass = 'overflow-hidden px-4 py-3 align-middle'
