'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { addLeadNoteAction } from '@/lib/actions/leads'

const NOTE_TYPES = [
  { value: 'general', label: 'Note' },
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'email', label: 'Email' },
] as const

type NoteType = 'general' | 'call' | 'meeting' | 'email'

const selectClass =
  'rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none'

export function LeadNotes({ leadId }: { leadId: string }) {
  const [isPending, startTransition] = useTransition()
  const [type, setType] = useState<NoteType>('general')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await addLeadNoteAction(leadId, content, type)
      if (!result.success) {
        setError(result.error)
        return
      }
      setContent('')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-3">
        <select
          className={selectClass}
          value={type}
          onChange={(e) => setType(e.target.value as NoteType)}
        >
          {NOTE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        rows={3}
        placeholder="Add a note, call log, or meeting summary…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      <Button type="submit" disabled={isPending || !content.trim()} size="sm">
        {isPending ? 'Adding…' : 'Add Note'}
      </Button>
    </form>
  )
}
