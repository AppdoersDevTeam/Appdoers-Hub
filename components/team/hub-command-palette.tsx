'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type SearchHit = {
  id: string
  type: 'client' | 'lead' | 'project' | 'task'
  title: string
  href: string
}

const typeLabel: Record<SearchHit['type'], string> = {
  client: 'Client',
  lead: 'Lead',
  project: 'Project',
  task: 'Task',
}

export function HubCommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchHit[]>([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((value) => !value)
      }
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const onOpen = () => setOpen(true)
    window.addEventListener('hub:open-search', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('hub:open-search', onOpen)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    const handle = window.setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      if (!res.ok) return
      const data = (await res.json()) as { results: SearchHit[] }
      setResults(data.results ?? [])
      setActive(0)
    }, 180)
    return () => window.clearTimeout(handle)
  }, [open, query])

  if (!open) return null

  const go = (href: string) => {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/40 p-4" onClick={() => setOpen(false)}>
      <div
        className="mx-auto mt-[12vh] w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)))
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((i) => Math.max(i - 1, 0))
            }
            if (e.key === 'Enter' && results[active]) go(results[active].href)
          }}
          placeholder="Search clients, leads, projects, tasks…"
          className="w-full border-b border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none"
        />
        <ul className="max-h-80 overflow-y-auto py-2">
          {query.trim().length < 2 ? (
            <li className="px-4 py-6 text-sm text-slate-500">Type at least 2 characters. Press Esc to close.</li>
          ) : results.length === 0 ? (
            <li className="px-4 py-6 text-sm text-slate-500">No matches.</li>
          ) : (
            results.map((hit, index) => (
              <li key={`${hit.type}-${hit.id}`}>
                <button
                  type="button"
                  onClick={() => go(hit.href)}
                  className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                    index === active ? 'bg-blue-50 text-blue-800' : 'text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{hit.title}</span>
                  <span className="ml-3 shrink-0 text-xs text-slate-500">{typeLabel[hit.type]}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
