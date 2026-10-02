import type { ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import type { HoverMetaItem } from '@/components/ui/row-hover-preview'

interface MobileCardListProps {
  children: ReactNode
  /** Shown instead of the list when there are no rows */
  empty?: ReactNode
  isEmpty?: boolean
  className?: string
}

/**
 * Phone-sized replacement for list tables. Rendered below `md`; pair with a
 * `hidden md:block` wrapper around the desktop table.
 */
export function MobileCardList({ children, empty, isEmpty, className }: MobileCardListProps) {
  return (
    <div className={cn('hub-card overflow-hidden p-0 md:hidden', className)}>
      {isEmpty ? (
        <p className="px-4 py-10 text-center text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-slate-200">{children}</ul>
      )}
    </div>
  )
}

interface MobileCardProps {
  title: ReactNode
  href?: string
  /** Rendered beside the title (e.g. status pill) */
  badge?: ReactNode
  /** Small line under the title */
  subtitle?: ReactNode
  meta?: HoverMetaItem[]
  /** Interactive controls (buttons, selects) — kept outside the title link */
  actions?: ReactNode
  /** Extra content below meta (e.g. inline status select) */
  footer?: ReactNode
  className?: string
}

export function MobileCard({
  title,
  href,
  badge,
  subtitle,
  meta = [],
  actions,
  footer,
  className,
}: MobileCardProps) {
  const visibleMeta = meta.filter(
    (m) => m.value !== null && m.value !== undefined && m.value !== ''
  )

  return (
    <li className={cn('px-4 py-3', className)}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {href ? (
              <Link
                href={href}
                className="min-w-0 break-words py-0.5 font-medium text-slate-900 hover:text-blue-600"
              >
                {title}
              </Link>
            ) : (
              <span className="min-w-0 break-words py-0.5 font-medium text-slate-900">{title}</span>
            )}
            {badge}
          </div>
          {subtitle ? (
            <div className="mt-0.5 break-words text-xs text-slate-500">{subtitle}</div>
          ) : null}
        </div>
        {actions ? <div className="-mr-2 -mt-1 flex shrink-0 items-center">{actions}</div> : null}
      </div>
      {visibleMeta.length > 0 ? (
        <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
          {visibleMeta.map((item) => (
            <div key={item.label} className="contents">
              <dt className="text-slate-500">{item.label}</dt>
              <dd className="min-w-0 break-words text-slate-700">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {footer ? <div className="mt-3">{footer}</div> : null}
    </li>
  )
}
