'use client'

import { useEffect, useState, useTransition } from 'react'
import { Mail, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { previewRecapEmailAction, sendRecapAction, sendRecapEmailAction } from '@/lib/actions/recaps'

interface Props {
  open: boolean
  recapId: string
  defaultEmail: string | null
  /** Saves the current draft; resolves false if saving failed. */
  onBeforeSend: () => Promise<boolean>
  onSent: (sentTo: string | null) => void
  onClose: () => void
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function SendRecapDialog({ open, recapId, defaultEmail, onBeforeSend, onSent, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState(defaultEmail ?? '')
  const [preview, setPreview] = useState<{ subject: string; text: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setEmail(defaultEmail ?? '')
    setError(null)
    setPreview(null)
    startTransition(async () => {
      const saved = await onBeforeSend()
      if (!saved) {
        setError('Could not save the draft. Fix the error and try again.')
        return
      }
      const result = await previewRecapEmailAction(recapId)
      if (result.success) setPreview(result.data)
      else setError(result.error)
    })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (open && e.key === 'Escape' && !isPending) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, isPending, onClose])

  if (!open) return null

  const trimmed = email.trim()
  const emailValid = EMAIL_PATTERN.test(trimmed)

  const handleSendEmail = () => {
    setError(null)
    startTransition(async () => {
      const result = await sendRecapEmailAction(recapId, trimmed)
      if (!result.success) {
        setError(result.error)
        return
      }
      onSent(result.data.sentTo)
    })
  }

  const handleMarkSent = () => {
    setError(null)
    startTransition(async () => {
      const result = await sendRecapAction(recapId)
      if (!result.success) {
        setError(result.error)
        return
      }
      onSent(null)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isPending && onClose()} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-recap-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-xl border border-slate-200 bg-white shadow-2xl sm:rounded-xl"
      >
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 id="send-recap-title" className="text-base font-semibold text-slate-900">
            Send recap to client
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            The recap PDF is attached and the recap is marked as sent in their portal.
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div>
            <label htmlFor="recap-recipient" className="mb-1 block text-xs font-medium text-slate-500">
              Send to
            </label>
            <Input
              id="recap-recipient"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              disabled={isPending}
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-slate-500">
              {defaultEmail
                ? 'Prefilled from the primary contact. Change it if needed; the contact record is not updated.'
                : 'No contact email on record. Enter one to send.'}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2 text-xs text-slate-500">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate font-medium text-slate-700">
                {preview?.subject ?? 'Preparing preview…'}
              </span>
            </div>
            <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap px-4 py-3 font-sans text-xs leading-relaxed text-slate-600">
              {preview?.text ?? ''}
            </pre>
            <div className="flex items-center gap-1.5 border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
              <Paperclip className="h-3.5 w-3.5" /> Recap PDF attached
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center">
          <Button variant="outline" size="sm" onClick={handleMarkSent} disabled={isPending} className="sm:mr-auto">
            Mark as sent (no email)
          </Button>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSendEmail} disabled={isPending || !emailValid || !preview}>
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            {isPending && preview ? 'Sending…' : 'Send email'}
          </Button>
        </div>
      </div>
    </div>
  )
}
