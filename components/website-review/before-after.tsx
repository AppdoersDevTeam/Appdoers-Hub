'use client'

import { useState } from 'react'

/** Drag the handle (or use the slider) to compare last round's screenshot with the new one. */
export function BeforeAfter({ before, after, alt }: { before: string; after: string; alt: string }) {
  const [split, setSplit] = useState(50)

  return (
    <div className="space-y-2">
      <div className="relative select-none overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <img src={after} alt={`${alt} (new)`} draggable={false} className="block h-auto w-full" />
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
          <img src={before} alt={`${alt} (before)`} draggable={false} className="block h-full w-full object-cover object-top" />
        </div>
        <div className="pointer-events-none absolute inset-y-0 w-1 -translate-x-1/2 bg-white shadow" style={{ left: `${split}%` }} />
        <span className="absolute left-2 top-2 rounded-full bg-slate-900/70 px-2 py-0.5 text-xs font-medium text-white">Before</span>
        <span className="absolute right-2 top-2 rounded-full bg-violet-600 px-2 py-0.5 text-xs font-medium text-white">Now</span>
      </div>
      <label className="flex items-center gap-3 text-sm text-slate-600">
        <span>Before</span>
        <input
          type="range"
          min={0}
          max={100}
          value={split}
          onChange={(e) => setSplit(Number(e.target.value))}
          className="h-8 flex-1 accent-violet-600"
          aria-label="Compare before and now"
        />
        <span>Now</span>
      </label>
    </div>
  )
}
