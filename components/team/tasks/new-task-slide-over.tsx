'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SlideOver } from '@/components/ui/slide-over'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createTaskAction } from '@/lib/actions/tasks'
import type { TaskType, TaskPriority, TeamUser } from '@/lib/types/database'

const TYPES: { value: TaskType; label: string }[] = [
  { value: 'feature', label: 'Feature' },
  { value: 'bug', label: 'Bug' },
  { value: 'revision', label: 'Revision' },
  { value: 'content', label: 'Content' },
  { value: 'design', label: 'Design' },
  { value: 'admin', label: 'Admin' },
]

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'p0', label: 'P0 — Critical' },
  { value: 'p1', label: 'P1 — High' },
  { value: 'p2', label: 'P2 — Medium' },
  { value: 'p3', label: 'P3 — Low' },
]

interface Props {
  open: boolean
  onClose: () => void
  projects: { id: string; name: string }[]
  teamMembers: Pick<TeamUser, 'id' | 'full_name'>[]
  defaultProjectId?: string
}

const labelClass = 'block text-xs font-medium text-[#94A3B8] mb-1'
const selectClass = 'w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]'

export function NewTaskSlideOver({ open, onClose, projects, teamMembers, defaultProjectId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    project_id: defaultProjectId ?? '',
    title: '',
    description: '',
    type: 'feature' as TaskType,
    priority: 'p2' as TaskPriority,
    assigned_to: '',
    due_date: '',
    live_url: '',
  })

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.project_id) { setError('Project is required'); return }
    if (!form.title.trim()) { setError('Title is required'); return }

    startTransition(async () => {
      const result = await createTaskAction({
        project_id: form.project_id,
        title: form.title,
        description: form.description || undefined,
        type: form.type,
        priority: form.priority,
        assigned_to: form.assigned_to || undefined,
        due_date: form.due_date || undefined,
        live_url: form.live_url || undefined,
      })
      if (!result.success) { setError(result.error); return }
      setForm((f) => ({ ...f, title: '', description: '', due_date: '', assigned_to: '', live_url: '' }))
      onClose()
      router.refresh()
    })
  }

  return (
    <SlideOver open={open} onClose={onClose} title="New Task" width="lg">
      <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
        {error && (
          <div className="rounded-md border border-[#EF4444]/20 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#EF4444]">
            {error}
          </div>
        )}

        <div>
          <label className={labelClass}>Project *</label>
          <select className={selectClass} value={form.project_id} onChange={(e) => set('project_id', e.target.value)} required>
            <option value="">Select a project…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Title *</label>
          <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Fix mobile nav bug" required />
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            className="w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#475569] focus:border-[#3B82F6] focus:outline-none resize-none"
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Task details…"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Type</label>
            <select className={selectClass} value={form.type} onChange={(e) => set('type', e.target.value)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Priority</label>
            <select className={selectClass} value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Assigned To</label>
            <select className={selectClass} value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)}>
              <option value="">Unassigned</option>
              {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Due Date</label>
            <Input type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Live URL</label>
          <Input type="url" value={form.live_url} onChange={(e) => set('live_url', e.target.value)} placeholder="https://example.com" />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? 'Creating…' : 'Create Task'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
        </div>
      </form>
    </SlideOver>
  )
}
