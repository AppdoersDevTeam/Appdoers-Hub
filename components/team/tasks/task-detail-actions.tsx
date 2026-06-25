'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteTaskAction } from '@/lib/actions/tasks'
import { TaskStatusSelect } from '@/components/team/tasks/task-status-select'
import { TaskWorkflowStageSelect } from '@/components/team/tasks/task-workflow-stage-select'
import type { TaskStatus, WorkflowStage } from '@/lib/types/database'

interface Props {
  taskId: string
  projectId: string
  currentStatus: TaskStatus
  currentWorkflowStage: WorkflowStage
}

export function TaskDetailActions({ taskId, projectId, currentStatus, currentWorkflowStage }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const remove = () => {
    if (!confirm('Delete this task? This cannot be undone.')) return
    startTransition(async () => {
      await deleteTaskAction(taskId, projectId)
      router.push('/app/tasks')
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <TaskStatusSelect taskId={taskId} projectId={projectId} value={currentStatus} />
      <TaskWorkflowStageSelect taskId={taskId} projectId={projectId} value={currentWorkflowStage} />
      <button
        onClick={remove}
        disabled={isPending}
        className="rounded-md p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
        title="Delete task"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
