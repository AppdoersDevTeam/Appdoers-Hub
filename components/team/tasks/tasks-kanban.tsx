'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateTaskWorkflowStageAction } from '@/lib/actions/tasks'
import { WORKFLOW_STAGE_CONFIG, WORKFLOW_STAGE_OPTIONS } from '@/lib/tasks/constants'
import type { WorkflowStage } from '@/lib/types/database'
import { cn } from '@/lib/utils/cn'
import { todayYmd } from '@/lib/utils/format'

type KanbanTask = {
  id: string
  title: string
  project_id: string
  project_name: string
  client_name: string
  assigned_to_name: string | null
  due_date: string | null
  workflow_stage: string
  status: string
}

export function TasksKanban({ tasks }: { tasks: KanbanTask[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const today = todayYmd()

  const move = (task: KanbanTask, stage: WorkflowStage) => {
    if (stage === task.workflow_stage) return
    startTransition(async () => {
      const result = await updateTaskWorkflowStageAction(task.id, task.project_id, stage)
      if (result.success) router.refresh()
    })
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {WORKFLOW_STAGE_OPTIONS.map((column) => {
        const cards = tasks.filter((task) => (task.workflow_stage || 'pm') === column.value)
        return (
          <section key={column.value} className="w-64 shrink-0 rounded-lg border border-slate-200 bg-slate-50">
            <header className="flex items-center justify-between px-3 py-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {column.label}
              </h3>
              <span className="text-xs text-slate-400">{cards.length}</span>
            </header>
            <div className="space-y-2 px-2 pb-3">
              {cards.map((task) => {
                const overdue = Boolean(task.due_date && task.due_date < today && task.status !== 'closed')
                return (
                  <article key={task.id} className="rounded-md border border-slate-200 bg-white p-3">
                    <Link href={`/app/tasks/${task.id}`} className="text-sm font-medium text-slate-900 hover:text-blue-600">
                      {task.title}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">
                      {task.client_name} · {task.project_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {task.assigned_to_name ?? 'Unassigned'}
                      {task.due_date ? ` · ${task.due_date}` : ''}
                    </p>
                    {overdue && <p className="mt-1 text-xs font-medium text-red-600">Overdue</p>}
                    <select
                      value={task.workflow_stage || 'pm'}
                      disabled={isPending}
                      onChange={(e) => move(task, e.target.value as WorkflowStage)}
                      className={cn(
                        'mt-2 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs',
                        WORKFLOW_STAGE_CONFIG[task.workflow_stage as WorkflowStage]?.cls
                      )}
                    >
                      {WORKFLOW_STAGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
