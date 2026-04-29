'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { updateTaskStatusAction, deleteTaskAction } from '@/lib/actions/tasks'
import { Trash2 } from 'lucide-react'

const STATUS_FLOW: Record<string, string> = {
  open: 'in_progress',
  in_progress: 'awaiting_review',
  awaiting_review: 'closed',
}

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'In Progress',
  awaiting_review: 'Awaiting Review',
  closed: 'Closed',
}

interface Props {
  taskId: string
  projectId: string
  currentStatus: string
}

export function TaskDetailActions({ taskId, projectId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const nextStatus = STATUS_FLOW[currentStatus]

  const advance = () => {
    if (!nextStatus) return
    startTransition(async () => {
      await updateTaskStatusAction(taskId, projectId, nextStatus as 'open' | 'in_progress' | 'awaiting_review' | 'closed')
      router.refresh()
    })
  }

  const remove = () => {
    if (!confirm('Delete this task? This cannot be undone.')) return
    startTransition(async () => {
      await deleteTaskAction(taskId, projectId)
      router.push('/app/tasks')
    })
  }

  return (
    <div className="flex items-center gap-2">
      {nextStatus && (
        <Button onClick={advance} disabled={isPending} size="sm">
          → {STATUS_LABELS[nextStatus]}
        </Button>
      )}
      <button
        onClick={remove}
        disabled={isPending}
        className="rounded-md p-2 text-[#475569] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
        title="Delete task"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
