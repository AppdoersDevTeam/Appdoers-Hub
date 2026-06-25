'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateTaskWorkflowStageAction } from '@/lib/actions/tasks'
import { WORKFLOW_STAGE_CONFIG, WORKFLOW_STAGE_OPTIONS } from '@/lib/tasks/constants'
import type { WorkflowStage } from '@/lib/types/database'
import { cn } from '@/lib/utils/cn'

interface Props {
  taskId: string
  projectId: string
  value: WorkflowStage
  compact?: boolean
}

export function TaskWorkflowStageSelect({ taskId, projectId, value, compact = false }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const config = WORKFLOW_STAGE_CONFIG[value]

  const onChange = (nextStage: WorkflowStage) => {
    if (nextStage === value) return
    startTransition(async () => {
      await updateTaskWorkflowStageAction(taskId, projectId, nextStage)
      router.refresh()
    })
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as WorkflowStage)}
      disabled={isPending}
      aria-label="Workflow stage"
      className={cn(
        'rounded-md border border-slate-200 bg-white font-medium focus:border-blue-500 focus:outline-none disabled:opacity-60',
        compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        config.cls
      )}
    >
      {WORKFLOW_STAGE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
