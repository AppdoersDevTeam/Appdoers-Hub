'use client'

import { useEffect, useRef, useState } from 'react'

export function LibraryDocxPreview({
  src,
  title,
  className = 'h-[75vh]',
}: {
  src: string
  title: string
  className?: string
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const ac = new AbortController()
    host.replaceChildren()
    setStatus('loading')
    setError(null)

    void (async () => {
      try {
        const res = await fetch(src, { signal: ac.signal, credentials: 'same-origin' })
        if (!res.ok) {
          throw new Error('Could not load this document')
        }
        const buffer = await res.arrayBuffer()
        const { renderAsync } = await import('docx-preview')
        if (ac.signal.aborted || !hostRef.current) return
        await renderAsync(buffer, hostRef.current, undefined, {
          className: 'docx',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          experimental: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          useBase64URL: true,
        })
        if (!ac.signal.aborted) setStatus('ready')
      } catch (err) {
        if (ac.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Could not preview this document')
        setStatus('error')
      }
    })()

    return () => {
      ac.abort()
      host.replaceChildren()
    }
  }, [src])

  return (
    <div className={`relative overflow-auto bg-[#64748b] ${className}`}>
      {status === 'loading' && (
        <p className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm text-white">
          Loading document…
        </p>
      )}
      {status === 'error' && (
        <p className="p-6 text-sm text-white">{error}. Download the file to open it in Word.</p>
      )}
      <div ref={hostRef} className="library-docx-preview min-h-full" aria-label={title} />
    </div>
  )
}
