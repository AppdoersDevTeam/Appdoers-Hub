'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SlideOver } from '@/components/ui/slide-over'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createProjectAction } from '@/lib/actions/projects'

interface Client {
  id: string
  company_name: string
}

interface Props {
  open: boolean
  onClose: () => void
  clients: Client[]
  defaultClientId?: string
}

const labelClass = 'block text-xs font-medium text-[#94A3B8] mb-1'
const selectClass =
  'w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]'

export function NewProjectSlideOver({ open, onClose, clients, defaultClientId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    client_id: defaultClientId ?? '',
    name: '',
    type: 'web' as 'web' | 'ecommerce' | 'community' | 'custom',
    start_date: '',
    target_launch_date: '',
    estimated_hours: '',
    description: '',
  })

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.client_id) { setError('Client is required'); return }
    if (!form.name.trim()) { setError('Project name is required'); return }

    startTransition(async () => {
      const result = await createProjectAction({
        client_id: form.client_id,
        name: form.name,
        type: form.type,
        start_date: form.start_date || undefined,
        target_launch_date: form.target_launch_date || undefined,
        estimated_hours: parseFloat(form.estimated_hours) || undefined,
        description: form.description || undefined,
      })
      if (!result.success) { setError(result.error); return }
      onClose()
      router.push(`/app/projects/${result.data.id}`)
    })
  }

  return (
    <SlideOver open={open} onClose={onClose} title="New Project" width="lg">
      <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
        {error && (
          <div className="rounded-md border border-[#EF4444]/20 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#EF4444]">
            {error}
          </div>
        )}

        <div>
          <label className={labelClass}>Client *</label>
          <select
            className={selectClass}
            value={form.client_id}
            onChange={(e) => set('client_id', e.target.value)}
            required
          >
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Project Name *</label>
          <Input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Acme Website Redesign"
            required
          />
        </div>

        <div>
          <label className={labelClass}>Project Type</label>
          <select
            className={selectClass}
            value={form.type}
            onChange={(e) => set('type', e.target.value as 'web' | 'ecommerce' | 'community' | 'custom')}
          >
            <option value="web">Web</option>
            <option value="ecommerce">E-commerce</option>
            <option value="community">Community</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Start Date</label>
            <Input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Target Launch</label>
            <Input type="date" value={form.target_launch_date} onChange={(e) => set('target_launch_date', e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Estimated Hours</label>
          <Input
            type="number"
            min={0}
            value={form.estimated_hours}
            onChange={(e) => set('estimated_hours', e.target.value)}
            placeholder="e.g. 40"
          />
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            className="w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#475569] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] resize-none"
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Brief project description…"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? 'Creating…' : 'Create Project'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
        </div>
      </form>
    </SlideOver>
  )
}
