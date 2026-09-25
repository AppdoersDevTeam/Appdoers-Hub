'use client'

import { Search } from 'lucide-react'

export function SearchTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('hub:open-search'))}
      className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 touch-manipulation hover:border-slate-300 hover:text-slate-700"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="truncate">Search</span>
      <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400 sm:inline">
        Ctrl K
      </kbd>
    </button>
  )
}
