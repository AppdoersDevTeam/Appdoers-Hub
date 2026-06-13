'use client'

import { useTransition } from 'react'
import { updateClientStatusAction } from '@/lib/actions/projects'
import type { ClientFacingStatus } from '@/lib/types/database'

const OPTIONS: { value: ClientFacingStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'awaiting_appdoers', label: 'Awaiting Appdoers' },
  { value: 'awaiting_client', label: 'Awaiting Client' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
]

interface Props {
  projectId: string
  currentStatus: string
}

export function ClientStatusSelector({ projectId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as ClientFacingStatus
    startTransition(async () => {
      await updateClientStatusAction(projectId, newStatus)
    })
  }

  return (
    <select
      value={currentStatus}
      onChange={handleChange}
      disabled={isPending}
      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none disabled:opacity-50"
      title="Set client-facing status"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
