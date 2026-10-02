import { cn } from '@/lib/utils/cn'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4',
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="break-words text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 break-words text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action && (
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:shrink-0 sm:flex-nowrap">
          {action}
        </div>
      )}
    </div>
  )
}
