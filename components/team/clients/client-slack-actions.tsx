'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ExternalLink, Hash, Send, Slack } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  createClientSlackChannelAction,
  sendClientWeeklyDigestAction,
} from '@/lib/actions/clients'
import { cn } from '@/lib/utils/cn'

export function ClientSlackActions({
  clientId,
  planLabel,
  slackChannelId,
  slackChannelName,
}: {
  clientId: string
  planLabel: string
  slackChannelId: string | null
  slackChannelName: string | null
}) {
  const router = useRouter()
  const menuId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const channelName = slackChannelName ? `#${slackChannelName}` : null
  const slackUrl = slackChannelId
    ? `https://slack.com/app_redirect?channel=${slackChannelId}`
    : null

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const createChannel = () => {
    setError(null)
    setNotice(null)
    setOpen(false)
    startTransition(async () => {
      const result = await createClientSlackChannelAction(clientId, planLabel)
      if (!result.success) {
        setError(result.error)
        return
      }
      if (result.data.warning) setNotice(result.data.warning)
      router.refresh()
    })
  }

  const sendDigest = () => {
    setError(null)
    setNotice(null)
    setOpen(false)
    startTransition(async () => {
      const result = await sendClientWeeklyDigestAction(clientId)
      if (!result.success) {
        setError(result.error)
        return
      }
      setNotice('Weekly digest posted to Slack.')
    })
  }

  return (
    <div className="relative flex flex-col items-end gap-1" ref={wrapRef}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        loading={isPending}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <Slack className="h-3.5 w-3.5" />
        Slack actions
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </Button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[14rem] overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          {slackUrl && channelName ? (
            <>
              <a
                href={slackUrl}
                target="_blank"
                rel="noreferrer"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                <Hash className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="flex-1 truncate">Open {channelName}</span>
                <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />
              </a>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                onClick={sendDigest}
              >
                <Send className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                Send this week’s digest
              </button>
            </>
          ) : (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              onClick={createChannel}
            >
              <Hash className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              Create Slack channel
            </button>
          )}
        </div>
      )}

      {error && <p className="max-w-[14rem] text-right text-xs text-red-600">{error}</p>}
      {notice && !error && <p className="max-w-[14rem] text-right text-xs text-slate-500">{notice}</p>}
    </div>
  )
}
