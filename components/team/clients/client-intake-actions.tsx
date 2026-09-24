'use client'

import { useState, useTransition } from 'react'
import { Check, Clipboard, ClipboardCheck, Link2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createOrReuseClientIntakeAction } from '@/lib/actions/intakes'
import { INTAKE_STATUS_LABELS, type IntakeStatus } from '@/lib/intake/types'

function absoluteUrl(url: string) {
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (typeof window === 'undefined') return url
  return `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`
}

const STATUS_VARIANT: Record<IntakeStatus, 'blue' | 'success' | 'warning' | 'neutral'> = {
  sent: 'blue',
  submitted: 'success',
  updated: 'warning',
  locked: 'neutral',
}

export function ClientIntakeActions({
  clientId,
  intake,
}: {
  clientId: string
  intake: {
    id: string
    status: IntakeStatus
    url: string
  } | null
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [link, setLink] = useState<string | null>(intake ? absoluteUrl(intake.url) : null)
  const [status, setStatus] = useState<IntakeStatus | null>(intake?.status ?? null)
  const [showLink, setShowLink] = useState(false)

  const copy = async (url: string) => {
    const full = absoluteUrl(url)
    try {
      await navigator.clipboard.writeText(full)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy. Select the link instead.')
    }
  }

  const createOrCopy = () => {
    setError(null)
    startTransition(async () => {
      const result = await createOrReuseClientIntakeAction(clientId)
      if (!result.success) {
        setError(result.error)
        return
      }
      const url = absoluteUrl(result.data.url)
      setLink(url)
      setStatus(result.data.status)
      setShowLink(true)
      await copy(url)
    })
  }

  const canReuse = status && status !== 'locked'

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {status && (
          <Badge variant={STATUS_VARIANT[status]}>{INTAKE_STATUS_LABELS[status]}</Badge>
        )}
        <Button type="button" size="sm" variant={canReuse ? 'outline' : 'default'} loading={isPending} onClick={createOrCopy}>
          {canReuse ? (
            <>
              {copied ? <ClipboardCheck className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
              Copy intake link
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              Create intake form
            </>
          )}
        </Button>
      </div>
      {showLink && link && (
        <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-3 text-left">
          <p className="text-xs font-medium text-slate-500">Send this link to the client</p>
          <p className="mt-1 break-all font-mono text-xs text-slate-700">{link}</p>
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600"
            onClick={() => void copy(link)}
          >
            {copied ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy again'}
          </button>
        </div>
      )}
      {error && <p className="text-right text-xs text-red-600">{error}</p>}
    </div>
  )
}
