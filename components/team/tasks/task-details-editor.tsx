'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { deleteTaskAction, updateTaskDetailsAction } from '@/lib/actions/tasks'
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  TASK_TYPE_OPTIONS,
  WORKFLOW_STAGE_OPTIONS,
} from '@/lib/tasks/constants'
import type { TaskPriority, TaskStatus, TaskType, TeamUser, WorkflowStage } from '@/lib/types/database'

type ProjectOption = {
  id: string
  name: string
  client_id: string
  client_name: string
}

interface TaskDetailsEditorProps {
  taskId: string
  projectId: string
  title: string
  description: string | null
  type: TaskType
  priority: TaskPriority
  status: TaskStatus
  workflowStage: WorkflowStage
  assignedTo: string | null
  dueDate: string | null
  createdAt: string
  updatedAt: string
  createdByName: string
  projects: ProjectOption[]
  teamMembers: Pick<TeamUser, 'id' | 'full_name'>[]
}

const labelClass = 'block text-xs font-medium text-slate-500 mb-1'
const selectClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
const textareaClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none resize-y min-h-[120px]'

export function TaskDetailsEditor({
  taskId,
  projectId,
  title,
  description,
  type,
  priority,
  status,
  workflowStage,
  assignedTo,
  dueDate,
  createdAt,
  updatedAt,
  createdByName,
  projects,
  teamMembers,
}: TaskDetailsEditorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const initialProject = projects.find((project) => project.id === projectId) ?? null

  const [form, setForm] = useState({
    title,
    description: description ?? '',
    type,
    priority,
    status,
    workflowStage,
    clientId: initialProject?.client_id ?? '',
    projectId,
    assignedTo: assignedTo ?? '',
    dueDate: dueDate ?? '',
  })

  const clients = useMemo(() => {
    const byId = new Map<string, string>()
    for (const project of projects) {
      if (!byId.has(project.client_id)) {
        byId.set(project.client_id, project.client_name)
      }
    }
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [projects])

  const projectsForClient = useMemo(
    () =>
      projects
        .filter((project) => project.client_id === form.clientId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [form.clientId, projects]
  )

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === form.projectId) ?? null,
    [form.projectId, projects]
  )

  const set = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) => {
    setSaved(false)
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleClientChange = (clientId: string) => {
    setSaved(false)
    const nextProjects = projects
      .filter((project) => project.client_id === clientId)
      .sort((a, b) => a.name.localeCompare(b.name))

    const keepCurrentProject =
      nextProjects.some((project) => project.id === form.projectId) ? form.projectId : nextProjects[0]?.id ?? ''

    setForm((prev) => ({
      ...prev,
      clientId,
      projectId: keepCurrentProject,
    }))
  }

  const handleSave = () => {
    setError(null)
    if (!form.title.trim()) {
      setError('Title is required')
      return
    }
    if (!form.clientId) {
      setError('Client is required')
      return
    }
    if (!form.projectId) {
      setError('Project is required')
      return
    }

    startTransition(async () => {
      const result = await updateTaskDetailsAction(taskId, projectId, {
        title: form.title.trim(),
        description: form.description.trim() ? form.description.trim() : null,
        type: form.type,
        priority: form.priority,
        status: form.status,
        workflow_stage: form.workflowStage,
        project_id: form.projectId,
        assigned_to: form.assignedTo || null,
        due_date: form.dueDate || null,
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      setSaved(true)
      router.refresh()
    })
  }

  const handleDelete = () => {
    if (!confirm('Delete this task? This cannot be undone.')) return
    startTransition(async () => {
      await deleteTaskAction(taskId, form.projectId)
      router.push('/app/tasks')
    })
  }

  return (
    <div className="hub-card space-y-5 xl:sticky xl:top-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Task Details</h2>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          title="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {saved && !error && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Changes saved.
        </div>
      )}

      <div>
        <label className={labelClass}>Title</label>
        <Input value={form.title} onChange={(e) => set('title', e.target.value)} />
      </div>

      <div>
        <label className={labelClass}>Client</label>
        <select
          className={selectClass}
          value={form.clientId}
          onChange={(e) => handleClientChange(e.target.value)}
        >
          <option value="">Select a client…</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        {selectedProject && (
          <p className="mt-1 text-xs text-slate-500">
            <Link href={`/app/clients/${selectedProject.client_id}`} className="text-blue-600 hover:underline">
              View client profile
            </Link>
          </p>
        )}
      </div>

      <div>
        <label className={labelClass}>Project</label>
        <select
          className={selectClass}
          value={form.projectId}
          onChange={(e) => set('projectId', e.target.value)}
          disabled={!form.clientId || projectsForClient.length === 0}
        >
          {!form.clientId ? (
            <option value="">Select a client first</option>
          ) : projectsForClient.length === 0 ? (
            <option value="">No projects for this client</option>
          ) : (
            projectsForClient.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Type</label>
          <select className={selectClass} value={form.type} onChange={(e) => set('type', e.target.value as TaskType)}>
            {TASK_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Priority</label>
          <select
            className={selectClass}
            value={form.priority}
            onChange={(e) => set('priority', e.target.value as TaskPriority)}
          >
            {TASK_PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select className={selectClass} value={form.status} onChange={(e) => set('status', e.target.value as TaskStatus)}>
            {TASK_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Workflow Stage</label>
          <select
            className={selectClass}
            value={form.workflowStage}
            onChange={(e) => set('workflowStage', e.target.value as WorkflowStage)}
          >
            {WORKFLOW_STAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Assigned To</label>
          <select
            className={selectClass}
            value={form.assignedTo}
            onChange={(e) => set('assignedTo', e.target.value)}
          >
            <option value="">Unassigned</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Due Date</label>
          <Input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          className={textareaClass}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Task details…"
        />
      </div>

      <div className="border-t border-slate-200 pt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <MetaItem label="Created By" value={createdByName} />
        <MetaItem label="Created" value={formatNzDate(createdAt)} />
        <MetaItem label="Last Updated" value={formatNzDateTime(updatedAt)} />
      </div>

      <Button onClick={handleSave} disabled={isPending} className="w-full">
        {isPending ? 'Saving…' : 'Save Changes'}
      </Button>
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-slate-600">{value}</p>
    </div>
  )
}

function formatNzDate(value: string) {
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'Pacific/Auckland',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatNzDateTime(value: string) {
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'Pacific/Auckland',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value))
}
