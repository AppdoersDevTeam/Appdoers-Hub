import { cn } from '@/lib/utils/cn'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  portal?: boolean
}

export function EmptyState({ icon: Icon, title, description, action, className, portal = false }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center',
        portal ? 'border-slate-200 bg-slate-50' : 'border-[#1F2D45] bg-[#111827]',
        className
      )}
    >
      {Icon && (
        <div className={cn('mb-4 rounded-full p-3', portal ? 'bg-slate-100' : 'bg-[#1C2537]')}>
          <Icon className={cn('h-6 w-6', portal ? 'text-slate-400' : 'text-[#475569]')} />
        </div>
      )}
      <h3 className={cn('text-sm font-medium', portal ? 'text-slate-700' : 'text-[#F1F5F9]')}>{title}</h3>
      {description && (
        <p className={cn('mt-1 text-sm', portal ? 'text-slate-500' : 'text-[#94A3B8]')}>{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
