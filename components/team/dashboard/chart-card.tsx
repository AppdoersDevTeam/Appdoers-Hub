import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  emptyMessage?: string
  isEmpty?: boolean
  className?: string
  children: ReactNode
}

export function ChartCard({
  title,
  subtitle,
  emptyMessage = 'No data for this period',
  isEmpty = false,
  className = '',
  children,
}: Props) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm flex flex-col ${className}`}
    >
      <div className="mb-3 shrink-0">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {isEmpty ? (
        <div className="flex flex-1 min-h-[180px] items-center justify-center">
          <p className="text-sm text-slate-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full">{children}</div>
      )}
    </div>
  )
}

export function DashboardSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}
