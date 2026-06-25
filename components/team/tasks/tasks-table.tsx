'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NewTaskSlideOver } from './new-task-slide-over'
import { TaskStatusSelect } from './task-status-select'
import { deleteTaskAction } from '@/lib/actions/tasks'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { formatDate } from '@/lib/utils/format'
import { TASK_STATUS_CONFIG, TASK_STATUS_OPTIONS } from '@/lib/tasks/constants'
import { cn } from '@/lib/utils/cn'
import type { TeamUser } from '@/lib/types/database'

type TaskRow = {
  id: string
  title: string
  type: string
  priority: string
  status: string
  project_id: string
  project_name: string
  client_name: string
  assigned_to_name: string | null
  due_date: string | null
  updated_at: string
}

const typeConfig: Record<string, { label: string; cls: string }> = {
  feature: { label: 'Feature', cls: 'bg-blue-50 text-blue-700' },
  bug: { label: 'Bug', cls: 'bg-red-50 text-red-700' },
  revision: { label: 'Revision', cls: 'bg-amber-50 text-amber-700' },
  content: { label: 'Content', cls: 'bg-emerald-50 text-emerald-700' },
  design: { label: 'Design', cls: 'bg-purple-50 text-purple-700' },
  admin: { label: 'Admin', cls: 'bg-slate-100 text-slate-500' },
}

const priorityConfig: Record<string, { label: string; cls: string }> = {
  p0: { label: 'P0', cls: 'bg-red-100 text-red-700 font-bold' },
  p1: { label: 'P1', cls: 'bg-orange-50 text-orange-700' },
  p2: { label: 'P2', cls: 'bg-amber-50 text-amber-700' },
  p3: { label: 'P3', cls: 'bg-slate-100 text-slate-500' },
}

interface Props {
  tasks: TaskRow[]
  projects: { id: string; name: string }[]
  teamMembers: Pick<TeamUser, 'id' | 'full_name'>[]
  defaultProjectId?: string
  showProjectCol?: boolean
}

export function TasksTable({ tasks, projects, teamMembers, defaultProjectId, showProjectCol = true }: Props) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('open')
  const [showNew, setShowNew] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TaskRow | null>(null)

  const today = new Date().toISOString().split('T')[0]

  const filtered = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || t.type === typeFilter
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter
    const matchStatus = statusFilter === 'all' || t.status === statusFilter
    return matchSearch && matchType && matchPriority && matchStatus
  })

  const handleDelete = () => {
    if (!deleteTarget) return
    startTransition(async () => {
      await deleteTaskAction(deleteTarget.id, deleteTarget.project_id)
      setDeleteTarget(null)
    })
  }

  const selectClass = 'rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none'

  const cols = ['Title', 'Type', 'Priority', ...(showProjectCol ? ['Project', 'Client'] : []), 'Assigned To', 'Due Date', 'Status', '']

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" className="pl-9" />
        </div>
        <select className={selectClass} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          {Object.entries(typeConfig).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
        </select>
        <select className={selectClass} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="all">All Priorities</option>
          {Object.entries(priorityConfig).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
        </select>
        <select className={selectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          {TASK_STATUS_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> New Task
        </Button>
      </div>

      <div className="hub-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {cols.map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={cols.length} className="px-4 py-10 text-center text-slate-500">
                    {tasks.length === 0 ? 'No tasks yet.' : 'No tasks match your filters.'}
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const ty = typeConfig[t.type] ?? typeConfig.admin
                  const pr = priorityConfig[t.priority] ?? priorityConfig.p3
                  const isOverdue = t.due_date && t.due_date < today && t.status !== 'closed'

                  return (
                    <tr key={t.id} className={cn('transition-colors hover:bg-slate-50', isOverdue && 'border-l-2 border-l-[#EF4444]')}>
                      <td className="px-4 py-3">
                        <Link href={`/app/tasks/${t.id}`} className={cn('font-medium hover:text-blue-600 transition-colors', isOverdue ? 'text-red-600' : 'text-slate-900')}>
                          {t.title}
                        </Link>
                        {isOverdue && <span className="ml-2 text-xs text-red-600">Overdue</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', ty.cls)}>{ty.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', pr.cls)}>{pr.label}</span>
                      </td>
                      {showProjectCol && (
                        <>
                          <td className="px-4 py-3 text-slate-600">
                            <Link href={`/app/projects/${t.project_id}`} className="hover:text-blue-600 transition-colors">{t.project_name}</Link>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{t.client_name}</td>
                        </>
                      )}
                      <td className="px-4 py-3 text-slate-600">{t.assigned_to_name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{t.due_date ? formatDate(t.due_date) : '—'}</td>
                      <td className="px-4 py-3">
                        <TaskStatusSelect
                          taskId={t.id}
                          projectId={t.project_id}
                          value={t.status as 'open' | 'in_progress' | 'awaiting_review' | 'closed'}
                          compact
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setDeleteTarget(t)}
                            disabled={isPending}
                            className="rounded p-1 text-slate-500 hover:text-red-600 transition-colors"
                            title="Delete task"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewTaskSlideOver
        open={showNew}
        onClose={() => setShowNew(false)}
        projects={projects}
        teamMembers={teamMembers}
        defaultProjectId={defaultProjectId}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Task"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete Task"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isPending={isPending}
      />
    </>
  )
}
