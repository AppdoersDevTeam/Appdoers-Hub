'use client'

import { Info } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

export function FieldHelp({ text }: { text: string }) {
  const [pinned, setPinned] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const tooltipId = useId()

  useEffect(() => {
    if (!pinned) return
    const onPointer = (event: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setPinned(false)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPinned(false)
    }
    const timer = window.setTimeout(() => {
      document.addEventListener('pointerdown', onPointer)
    }, 0)
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [pinned])

  return (
    <span ref={wrapRef} className="group/help relative inline-flex align-middle">
      <button
        type="button"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label="About this field"
        aria-expanded={pinned}
        aria-controls={tooltipId}
        onPointerDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setPinned((current) => !current)
        }}
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={`absolute left-0 top-full z-30 mt-1.5 w-64 max-w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white p-2.5 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-slate-600 shadow-lg ${
          pinned ? 'visible' : 'invisible group-hover/help:visible group-focus-within/help:visible'
        }`}
      >
        {text}
      </span>
    </span>
  )
}

export function FieldLabel({
  children,
  required,
  help,
}: {
  children: React.ReactNode
  required?: boolean
  help?: string
}) {
  return (
    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
      {children}
      <span className="ml-1 inline-flex items-center gap-1 whitespace-nowrap">
        {required ? (
          <span className="text-red-600">
            *<span className="sr-only"> required</span>
          </span>
        ) : (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal normal-case tracking-normal text-slate-500">
            optional
          </span>
        )}
        {help ? <FieldHelp text={help} /> : null}
      </span>
    </span>
  )
}

export function Field({
  label,
  required,
  help,
  children,
}: {
  label: string
  required?: boolean
  help?: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <FieldLabel required={required} help={help}>
        {label}
      </FieldLabel>
      {children}
    </label>
  )
}
