import Link from 'next/link'
import type { ReactNode } from 'react'

interface Props {
  title: string
  count?: number
  viewAllHref?: string
  viewAllLabel?: string
  borderAccent?: string
  icon?: ReactNode
  emptyMessage: string
  isEmpty: boolean
  children: ReactNode
}

export function ActionPanel({
  title,
  count,
  viewAllHref,
  viewAllLabel = 'View all',
  borderAccent,
  icon,
  emptyMessage,
  isEmpty,
  children,
}: Props) {
  return (
    <div
      className={`hub-card flex flex-col ${borderAccent ? `border-l-4 ${borderAccent}` : ''}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          {icon}
          {title}
          {count !== undefined && count > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {count}
            </span>
          )}
        </h2>
        {viewAllHref && !isEmpty && (
          <Link href={viewAllHref} className="text-xs text-blue-600 hover:underline">
            {viewAllLabel}
          </Link>
        )}
      </div>
      {isEmpty ? (
        <p className="py-4 text-center text-xs text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="divide-y divide-slate-200">{children}</div>
      )}
    </div>
  )
}
