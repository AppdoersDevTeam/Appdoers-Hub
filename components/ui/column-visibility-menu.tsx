'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Columns3 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { TableColumnDef } from '@/hooks/use-table-prefs'
import { LIST_SELECT_CLASS } from '@/components/ui/list-toolbar'

interface Props {
  columns: TableColumnDef[]
  visible: string[]
  onToggle: (id: string) => void
  onReset: () => void
  className?: string
}

export function ColumnVisibilityMenu({ columns, visible, onToggle, onReset, className }: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const visibleSet = new Set(visible)
  const hideable = columns.filter((c) => c.hideable !== false)

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
    <div ref={wrapRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label="Show or hide columns"
        title="Columns"
        onClick={() => setOpen((v) => !v)}
        className={cn(LIST_SELECT_CLASS, 'inline-flex items-center gap-1.5')}
      >
        <Columns3 className="h-3.5 w-3.5 shrink-0" />
        Columns
      </button>
      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          aria-label="Visible columns"
          className="absolute right-0 top-full z-50 mt-1 min-w-[12rem] rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          {hideable.map((col) => {
            const checked = visibleSet.has(col.id)
            return (
              <label
                key={col.id}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-slate-900 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  role="option"
                  aria-selected={checked}
                  checked={checked}
                  onChange={() => onToggle(col.id)}
                  className="rounded border-slate-300"
                />
                {col.label}
              </label>
            )
          })}
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            onClick={() => {
              onReset()
              setOpen(false)
            }}
            className="w-full px-3 py-1.5 text-left text-sm text-blue-600 hover:bg-slate-50"
          >
            Reset columns
          </button>
        </div>
      ) : null}
    </div>
  )
}
