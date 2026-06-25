import type { TaskStatus, WorkflowStage } from '@/lib/types/database'

export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; cls: string }> = {
  open: { label: 'Open', cls: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'In Progress', cls: 'bg-blue-50 text-blue-700' },
  awaiting_review: { label: 'Awaiting Review', cls: 'bg-amber-50 text-amber-700' },
  closed: { label: 'Closed', cls: 'bg-emerald-50 text-emerald-700' },
}

export const WORKFLOW_STAGE_CONFIG: Record<WorkflowStage, { label: string; cls: string }> = {
  pm: { label: 'PM', cls: 'bg-slate-100 text-slate-600' },
  designer: { label: 'Designer', cls: 'bg-purple-50 text-purple-700' },
  developer: { label: 'Developer', cls: 'bg-blue-50 text-blue-700' },
  qa: { label: 'QA', cls: 'bg-amber-50 text-amber-700' },
  reviewer: { label: 'Reviewer', cls: 'bg-orange-50 text-orange-700' },
  done: { label: 'Done', cls: 'bg-emerald-50 text-emerald-700' },
}

export const TASK_STATUS_OPTIONS = Object.entries(TASK_STATUS_CONFIG).map(([value, { label }]) => ({
  value: value as TaskStatus,
  label,
}))

export const WORKFLOW_STAGE_OPTIONS = Object.entries(WORKFLOW_STAGE_CONFIG).map(([value, { label }]) => ({
  value: value as WorkflowStage,
  label,
}))
