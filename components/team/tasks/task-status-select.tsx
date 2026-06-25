'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateTaskStatusAction } from '@/lib/actions/tasks'
import { TASK_STATUS_CONFIG, TASK_STATUS_OPTIONS } from '@/lib/tasks/constants'
import type { TaskStatus } from '@/lib/types/database'
import { cn } from '@/lib/utils/cn'

interface Props {
  taskId: string
  projectId: string
  value: TaskStatus
  compact?: boolean
}

export function TaskStatusSelect({ taskId, projectId, value, compact = false }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const config = TASK_STATUS_CONFIG[value]

  const onChange = (nextStatus: TaskStatus) => {
    if (nextStatus === value) return
    startTransition(async () => {
      await updateTaskStatusAction(taskId, projectId, nextStatus)
      router.refresh()
    })
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as TaskStatus)}
      disabled={isPending}
      aria-label="Task status"
      className={cn(
        'rounded-md border border-slate-200 bg-white font-medium focus:border-blue-500 focus:outline-none disabled:opacity-60',
        compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        config.cls
      )}
    >
      {TASK_STATUS_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
