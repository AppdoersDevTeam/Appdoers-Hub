'use client'

import { Info } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

export function FieldHelp({ text }: { text: string }) {
  const tooltipId = useId()
  const wrapRef = useRef<HTMLSpanElement>(null)
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const visible = hovered || pinned

  useEffect(() => {
    if (!pinned) return
    const onPointer = (event: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setPinned(false)
        setHovered(false)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPinned(false)
        setHovered(false)
      }
    }
    const timer = window.setTimeout(() => document.addEventListener('pointerdown', onPointer), 200)
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [pinned])

  return (
    <span
      ref={wrapRef}
      className="group/help relative ml-1 inline-flex align-middle"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        if (!pinned) setHovered(false)
      }}
    >
      <button
        type="button"
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label="About this field"
        aria-expanded={visible}
        aria-controls={tooltipId}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setPinned((current) => !current)
        }}
        onFocus={() => setHovered(true)}
        onBlur={() => {
          if (!pinned) setHovered(false)
        }}
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      <span
        className={`pointer-events-none absolute left-0 top-full z-50 w-56 max-w-[min(14rem,calc(100vw-2rem))] pt-2 ${
          visible ? 'block' : 'hidden group-hover/help:block group-focus-within/help:block'
        }`}
      >
        <span
          id={tooltipId}
          role="tooltip"
          className="block whitespace-normal break-words rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs font-normal normal-case leading-snug tracking-normal text-slate-600 shadow-lg"
        >
          {text}
        </span>
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
      {required ? (
        <span className="ml-1 text-red-600">
          *<span className="sr-only"> required</span>
        </span>
      ) : (
        <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 align-middle text-[10px] font-normal normal-case tracking-normal text-slate-500">
          optional
        </span>
      )}
      {help ? <FieldHelp text={help} /> : null}
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
    <div className="block space-y-1.5">
      <FieldLabel required={required} help={help}>
        {label}
      </FieldLabel>
      {children}
    </div>
  )
}
