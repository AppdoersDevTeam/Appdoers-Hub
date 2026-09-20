'use client'

import { useState, useTransition } from 'react'
import { ExternalLink, Hash, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  createClientSlackChannelAction,
  sendClientWeeklyDigestAction,
} from '@/lib/actions/clients'

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
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const channelName = slackChannelName ? `#${slackChannelName}` : null
  const slackUrl = slackChannelId
    ? `https://slack.com/app_redirect?channel=${slackChannelId}`
    : null

  const createChannel = () => {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await createClientSlackChannelAction(clientId, planLabel)
      if (!result.success) {
        setError(result.error)
        return
      }
      if (result.data.warning) setNotice(result.data.warning)
    })
  }

  const sendDigest = () => {
    setError(null)
    setNotice(null)
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
    <div className="flex max-w-md flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {slackUrl && channelName ? (
          <>
            <a
              href={slackUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Hash className="h-3.5 w-3.5" />
              {channelName}
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </a>
            <Button type="button" size="sm" variant="outline" loading={isPending} onClick={sendDigest}>
              <Send className="h-3.5 w-3.5" />
              Send this week’s digest
            </Button>
          </>
        ) : (
          <Button type="button" size="sm" loading={isPending} onClick={createChannel}>
            Create Slack channel
          </Button>
        )}
      </div>
      {error && <p className="text-right text-xs text-red-600">{error}</p>}
      {notice && !error && <p className="text-right text-xs text-slate-500">{notice}</p>}
    </div>
  )
}
