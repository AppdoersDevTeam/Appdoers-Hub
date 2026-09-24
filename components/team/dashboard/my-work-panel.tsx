import Link from 'next/link'
import { todayYmd } from '@/lib/utils/format'
import { WORKFLOW_STAGE_CONFIG } from '@/lib/tasks/constants'
import type { WorkflowStage } from '@/lib/types/database'

type MyTask = {
  id: string
  title: string
  due_date: string | null
  workflow_stage: WorkflowStage
  project_name: string
}

export function MyWorkPanel({ tasks }: { tasks: MyTask[] }) {
  const today = todayYmd()

  return (
    <div className="hub-card">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">My work</h2>
          <p className="text-xs text-slate-500">Open tasks assigned to you</p>
        </div>
        <Link href="/app/tasks?mine=1" className="text-xs font-medium text-blue-600 hover:underline">
          View all
        </Link>
      </div>
      {tasks.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">Nothing assigned to you.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {tasks.slice(0, 8).map((task) => {
            const overdue = Boolean(task.due_date && task.due_date < today)
            const stage = WORKFLOW_STAGE_CONFIG[task.workflow_stage]
            return (
              <li key={task.id}>
                <Link href={`/app/tasks/${task.id}`} className="block py-2.5 hover:bg-slate-50">
                  <p className="text-sm font-medium text-slate-900">{task.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {task.project_name}
                    {stage ? ` · ${stage.label}` : ''}
                    {task.due_date ? ` · due ${task.due_date}` : ''}
                    {overdue ? ' · overdue' : ''}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
