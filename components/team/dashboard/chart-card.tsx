import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  emptyMessage?: string
  isEmpty?: boolean
  children: ReactNode
}

export function ChartCard({
  title,
  subtitle,
  emptyMessage = 'No data for this period',
  isEmpty = false,
  children,
}: Props) {
  return (
    <div className="hub-card flex h-full min-h-[280px] flex-col">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {isEmpty ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-slate-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0">{children}</div>
      )}
    </div>
  )
}
