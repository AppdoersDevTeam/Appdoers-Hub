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
  general: 'bg-[#475569]/10 text-[#475569]',
  call: 'bg-[#3B82F6]/10 text-[#3B82F6]',
  meeting: 'bg-[#10B981]/10 text-[#10B981]',
  email: 'bg-[#F59E0B]/10 text-[#F59E0B]',
  internal: 'bg-[#94A3B8]/10 text-[#94A3B8]',
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

  const selectClass = 'rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#3B82F6] focus:outline-none'

  return (
    <div className="space-y-4">
      {/* Add note form */}
      <div className="hub-card space-y-3">
        <h3 className="text-sm font-semibold text-[#F1F5F9]">Add Note</h3>
        {error && <p className="text-sm text-[#EF4444]">{error}</p>}
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
            className="w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] placeholder:text-[#475569] focus:border-[#3B82F6] focus:outline-none resize-none"
          />
          <Button type="submit" size="sm" disabled={isPending || !content.trim()}>
            {isPending ? 'Saving…' : 'Add Note'}
          </Button>
        </form>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="rounded-lg border border-[#1F2D45] px-4 py-8 text-center text-[#475569]">
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
                  <span className="text-xs text-[#475569]">
                    {note.team_users?.full_name ?? 'Team'} · {formatDateTime(note.created_at)}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(note.id)}
                  disabled={isPending}
                  className="shrink-0 rounded p-1 text-[#475569] opacity-0 group-hover:opacity-100 hover:bg-[#1F2D45] hover:text-[#EF4444] transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-2 text-sm text-[#CBD5E1] whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
