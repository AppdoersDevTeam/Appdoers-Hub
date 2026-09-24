'use client'

import { useEffect, useMemo, useState } from 'react'
import { LayoutGrid, Table2 } from 'lucide-react'
import { TasksTable } from './tasks-table'
import { TasksKanban } from './tasks-kanban'
import { cn } from '@/lib/utils/cn'
import type { TeamUser } from '@/lib/types/database'

type TaskRow = {
  id: string
  title: string
  type: string
  priority: string
  status: string
  workflow_stage?: string
  project_id: string
  project_name: string
  client_id?: string
  client_name: string
  assigned_to?: string | null
  assigned_to_name: string | null
  due_date: string | null
  time_spent: number
  updated_at: string
}

export function TasksWorkspace({
  tasks,
  projects,
  filterProjects,
  clients,
  teamMembers,
  showProjectCol,
  currentUserId,
  defaultMine,
}: {
  tasks: TaskRow[]
  projects: { id: string; name: string }[]
  filterProjects?: { id: string; name: string; client_id: string }[]
  clients: { id: string; company_name: string }[]
  teamMembers: Pick<TeamUser, 'id' | 'full_name'>[]
  showProjectCol: boolean
  currentUserId?: string
  defaultMine?: boolean
}) {
  const [view, setView] = useState<'table' | 'board'>('table')
  const [assigneeFilter, setAssigneeFilter] = useState(() =>
    defaultMine && currentUserId ? currentUserId : 'all'
  )

  useEffect(() => {
    if (defaultMine && currentUserId) {
      setAssigneeFilter(currentUserId)
    }
  }, [defaultMine, currentUserId])

  const mine = Boolean(currentUserId && assigneeFilter === currentUserId)

  const boardTasks = useMemo(() => {
    if (assigneeFilter === 'all') return tasks
    if (assigneeFilter === 'unassigned') return tasks.filter((task) => !task.assigned_to)
    return tasks.filter((task) => task.assigned_to === assigneeFilter)
  }, [tasks, assigneeFilter])

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {currentUserId && (
          <button
            type="button"
            onClick={() =>
              setAssigneeFilter((value) => (value === currentUserId ? 'all' : currentUserId))
            }
            className={cn(
              'rounded-md border px-3 py-1.5 text-xs font-medium',
              mine ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'
            )}
            title={mine ? 'Showing your tasks — click to show everyone' : 'Show only your tasks'}
          >
            My tasks
          </button>
        )}
        <div className="inline-flex rounded-md border border-slate-200 p-0.5 sm:ml-auto">
          <button
            type="button"
            onClick={() => setView('table')}
            className={cn(
              'inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium',
              view === 'table' ? 'bg-slate-900 text-white' : 'text-slate-600'
            )}
          >
            <Table2 className="h-3.5 w-3.5" /> Table
          </button>
          <button
            type="button"
            onClick={() => setView('board')}
            className={cn(
              'inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium',
              view === 'board' ? 'bg-slate-900 text-white' : 'text-slate-600'
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Board
          </button>
        </div>
      </div>
      {view === 'table' ? (
        <TasksTable
          tasks={tasks}
          projects={projects}
          filterProjects={filterProjects}
          clients={clients}
          teamMembers={teamMembers}
          showProjectCol={showProjectCol}
          currentUserId={currentUserId}
          assigneeFilter={assigneeFilter}
          onAssigneeFilterChange={setAssigneeFilter}
        />
      ) : (
        <TasksKanban
          tasks={boardTasks.map((task) => ({
            id: task.id,
            title: task.title,
            project_id: task.project_id,
            project_name: task.project_name,
            client_name: task.client_name,
            assigned_to_name: task.assigned_to_name,
            due_date: task.due_date,
            workflow_stage: task.workflow_stage ?? 'pm',
            status: task.status,
          }))}
        />
      )}
    </div>
  )
}
