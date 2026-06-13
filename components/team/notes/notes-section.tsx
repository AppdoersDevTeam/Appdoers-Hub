'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addNoteAction, deleteNoteAction } from '@/lib/actions/notes'
import { cn } from '@/lib/utils/cn'
import { formatDateTime } from '@/lib/utils/format'

interface Note {
  id: string
  content: string
  type: string | null
  created_at: string
  team_users: { full_name: string } | null
}

const NOTE_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'email', label: 'Email' },
  { value: 'internal', label: 'Internal' },
]

const typeColors: Record<string, string> = {
  general: 'bg-slate-100 text-slate-500',
  call: 'bg-blue-50 text-blue-700',
  meeting: 'bg-emerald-50 text-emerald-700',
  email: 'bg-amber-50 text-amber-700',
  internal: 'bg-slate-100 text-slate-500',
}

export function NotesSection({
  notes: initialNotes,
  entityType,
  entityId,
}: {
  notes: Note[]
  entityType: string
  entityId: string
}) {
  const [isPending, startTransition] = useTransition()
  const [notes, setNotes] = useState(initialNotes)
  const [content, setContent] = useState('')
  const [type, setType] = useState('general')
  const [error, setError] = useState<string | null>(null)

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!content.trim()) return
    startTransition(async () => {
      const result = await addNoteAction(entityType, entityId, content, type)
      if (!result.success) { setError(result.error); return }
      // Optimistic update
      setNotes((prev) => [{
        id: result.data.id,
        content: content.trim(),
        type,
        created_at: new Date().toISOString(),
        team_users: null,
      }, ...prev])
      setContent('')
    })
  }

  const handleDelete = (noteId: string) => {
    if (!confirm('Delete this note?')) return
    startTransition(async () => {
      const result = await deleteNoteAction(noteId, entityType, entityId)
      if (result.success) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId))
      }
    })
  }

  const selectClass = 'rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none'

  return (
    <div className="space-y-4">
      {/* Add note form */}
      <div className="hub-card space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Add Note</h3>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="flex items-center gap-3">
            <select className={cn(selectClass, 'w-36')} value={type} onChange={(e) => setType(e.target.value)}>
              {NOTE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="Write a note…"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none resize-none"
          />
          <Button type="submit" size="sm" disabled={isPending || !content.trim()}>
            {isPending ? 'Saving…' : 'Add Note'}
          </Button>
        </form>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="rounded-lg border border-slate-200 px-4 py-8 text-center text-slate-500">
          No notes yet. Add the first note above.
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="hub-card group relative">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', typeColors[note.type ?? 'general'] ?? typeColors.general)}>
                    {NOTE_TYPES.find((t) => t.value === note.type)?.label ?? 'General'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {note.team_users?.full_name ?? 'Team'} · {formatDateTime(note.created_at)}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(note.id)}
                  disabled={isPending}
                  className="shrink-0 rounded p-1 text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-slate-100 hover:text-red-600 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
