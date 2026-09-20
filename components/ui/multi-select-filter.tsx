'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export type MultiSelectOption = { value: string; label: string }

interface Props {
  label: string
  allLabel: string
  emptyLabel?: string
  options: MultiSelectOption[]
  value: string[]
  onChange: (next: string[]) => void
  className?: string
}

export function MultiSelectFilter({
  label,
  allLabel,
  emptyLabel = 'None selected',
  options,
  value,
  onChange,
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const allCheckboxRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const selected = useMemo(() => new Set(value), [value])
  const allSelected = options.length > 0 && options.every((option) => selected.has(option.value))
  const noneSelected = value.length === 0

  const buttonText = useMemo(() => {
    if (allSelected) return allLabel
    if (noneSelected) return emptyLabel
    return options.filter((option) => selected.has(option.value)).map((option) => option.label).join(', ')
  }, [allLabel, allSelected, emptyLabel, noneSelected, options, selected])

  useEffect(() => {
    if (!allCheckboxRef.current) return
    allCheckboxRef.current.indeterminate = !allSelected && !noneSelected
  }, [allSelected, noneSelected, open])

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

  const toggle = (optionValue: string) => {
    if (selected.has(optionValue)) {
      onChange(value.filter((item) => item !== optionValue))
      return
    }
    onChange([...value, optionValue])
  }

  const toggleAll = () => {
    if (allSelected) return
    onChange(options.map((option) => option.value))
  }

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        title={buttonText}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-w-[10.5rem] max-w-[16rem] items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
      >
        <span className="truncate">{buttonText}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
          className="absolute left-0 top-full z-50 mt-1 min-w-full rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-slate-900 hover:bg-slate-50">
            <input
              ref={allCheckboxRef}
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="rounded border-slate-300"
            />
            {allLabel}
          </label>
          <div className="my-1 border-t border-slate-100" />
          {options.map((option) => {
            const checked = selected.has(option.value)
            return (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-slate-900 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  role="option"
                  aria-selected={checked}
                  checked={checked}
                  onChange={() => toggle(option.value)}
                  className="rounded border-slate-300"
                />
                {option.label}
              </label>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
