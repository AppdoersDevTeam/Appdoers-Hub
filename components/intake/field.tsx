'use client'

import { Info } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

function HelpCard({ id, text }: { id: string; text: string }) {
  return (
    <span
      id={id}
      role="tooltip"
      className="mt-1.5 block w-full whitespace-normal break-words rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs font-normal normal-case leading-snug tracking-normal text-white shadow-sm"
    >
      {text}
    </span>
  )
}

export function FieldHelp({ text }: { text: string }) {
  const tooltipId = useId()
  const wrapRef = useRef<HTMLSpanElement>(null)
  const [pinned, setPinned] = useState(false)

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
    const timer = window.setTimeout(() => document.addEventListener('pointerdown', onPointer), 200)
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [pinned])

  return (
    <span ref={wrapRef} className="group/help relative ml-1 inline-flex align-middle">
      <button
        type="button"
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label="About this field"
        aria-expanded={pinned}
        aria-controls={tooltipId}
        onMouseDown={(event) => {
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
        className={`absolute left-0 top-full z-50 mt-2 w-56 whitespace-normal break-words rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs font-normal normal-case leading-snug tracking-normal text-white shadow-lg ${
          pinned ? 'block' : 'hidden group-hover/help:block group-focus-within/help:block'
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
  const tooltipId = useId()
  const wrapRef = useRef<HTMLSpanElement>(null)
  const [pinned, setPinned] = useState(false)

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
    const timer = window.setTimeout(() => document.addEventListener('pointerdown', onPointer), 200)
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [pinned])

  return (
    <span ref={wrapRef} className="group/help block text-xs font-medium uppercase tracking-wide text-slate-500">
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
      {help ? (
        <button
          type="button"
          className="ml-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full align-middle text-slate-400 transition-colors hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="About this field"
          aria-expanded={pinned}
          aria-controls={tooltipId}
          onMouseDown={(event) => {
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
      ) : null}
      {help ? (
        <span className={pinned ? 'block' : 'hidden group-hover/help:block group-focus-within/help:block'}>
          <HelpCard id={tooltipId} text={help} />
        </span>
      ) : null}
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
      <span className="block [&_.hub-input]:border-slate-300 [&_.hub-input]:bg-slate-50 [&_.portal-input]:border-slate-300 [&_.portal-input]:bg-slate-50">
        {children}
      </span>
    </label>
  )
}
