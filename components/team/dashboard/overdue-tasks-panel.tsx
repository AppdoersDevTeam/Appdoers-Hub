import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { ActionPanel } from './action-panel'
import { formatDate } from '@/lib/utils/format'
import type { OverdueTaskItem } from '@/lib/dashboard/types'

interface Props {
  items: OverdueTaskItem[]
  totalCount: number
}

export function OverdueTasksPanel({ items, totalCount }: Props) {
  return (
    <ActionPanel
      title="Overdue Tasks"
      count={totalCount}
      viewAllHref="/app/tasks"
      borderAccent="border-l-red-500"
      icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
      emptyMessage="No overdue tasks"
      isEmpty={items.length === 0}
    >
      {items.map((task) => (
        <div key={task.id} className="flex items-start justify-between gap-2 py-2">
          <div className="min-w-0">
            <Link
              href={`/app/tasks/${task.id}`}
              className="text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors line-clamp-1"
            >
              {task.title}
            </Link>
            <p className="text-xs text-slate-500 mt-0.5">
              {task.projectName}
              {task.assigneeName ? ` · ${task.assigneeName}` : ''}
            </p>
          </div>
          <span className="shrink-0 text-xs font-medium text-red-600">
            {formatDate(task.dueDate)}
          </span>
        </div>
      ))}
    </ActionPanel>
  )
}
