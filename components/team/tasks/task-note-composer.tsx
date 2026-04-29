'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { addTaskNoteAction } from '@/lib/actions/tasks'

interface Props {
  taskId: string
  projectId: string
}

export function TaskNoteComposer({ taskId, projectId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const content = note.trim()
    if (!content) return

    startTransition(async () => {
      const result = await addTaskNoteAction(taskId, projectId, content)
      if (!result.success) {
        setError(result.error)
        return
      }
      setNote('')
      router.refresh()
    })
  }

  return (
    <div className="hub-card space-y-3">
      <h3 className="text-sm font-semibold text-[#F8FAFC]">Add Note</h3>
      {error && <p className="text-sm text-[#EF4444]">{error}</p>}
      <form onSubmit={submit} className="space-y-3">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Write a task update note..."
          className="w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] placeholder:text-[#475569] focus:border-[#3B82F6] focus:outline-none resize-none"
        />
        <Button type="submit" size="sm" disabled={isPending || !note.trim()}>
          {isPending ? 'Saving…' : 'Add Note'}
        </Button>
      </form>
    </div>
  )
}
