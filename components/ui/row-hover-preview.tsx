'use client'

import type { ReactNode } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils/cn'

export type HoverMetaItem = {
  label: string
  value: ReactNode
}

export function RowHoverPreviewProvider({ children }: { children: ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={300} skipDelayDuration={100}>
      {children}
    </Tooltip.Provider>
  )
}

interface Props {
  title: string
  meta: HoverMetaItem[]
  children: ReactNode
  className?: string
  badge?: ReactNode
}

export function RowHoverPreview({ title, meta, children, className, badge }: Props) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span className={cn('inline-flex min-w-0 max-w-full items-center gap-2', className)}>
          {children}
          {badge}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className="z-50 max-w-sm rounded-md border border-slate-200 bg-white px-3 py-2.5 shadow-lg"
        >
          <p className="break-words text-sm font-semibold text-slate-900">{title}</p>
          {meta.length > 0 ? (
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              {meta.map((item) => (
                <div key={item.label} className="contents">
                  <dt className="text-slate-500">{item.label}</dt>
                  <dd className="min-w-0 truncate text-slate-800">{item.value || '—'}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <Tooltip.Arrow className="fill-white stroke-slate-200" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
