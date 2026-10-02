import { buildSlackAlert, hubClientUrl, postToSlackChannel, sendToChannel, slackOpenHub } from '@/lib/slack'
import { createNotifications } from '@/lib/notifications'
import { roundLabel, type ReviewCounts } from './types'

export function hubClientReviewsPath(clientId: string, reviewId?: string) {
  return `/app/clients/${clientId}?tab=reviews${reviewId ? `&review=${reviewId}` : ''}`
}

function hubReviewUrl(clientId: string, reviewId: string) {
  const base = hubClientUrl(clientId)
  return base ? `${base}?tab=reviews&review=${reviewId}` : ''
}

function recipients(...ids: (string | null | undefined)[]) {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))]
}

export async function notifyReviewSubmitted(input: {
  reviewId: string
  clientId: string
  companyName: string
  slackChannelId: string | null
  roundNumber: number
  counts: ReviewCounts
  submittedByName: string | null
  isResubmit: boolean
  ownerId: string | null
  createdBy: string | null
}) {
  const title = `${input.isResubmit ? 'Website feedback updated' : 'Website feedback received'} — ${input.companyName}`
  const text = `${input.companyName} ${input.isResubmit ? 'updated' : 'sent'} their website feedback (${roundLabel(input.roundNumber)}).`
  const summary = `${input.counts.looksGood} looks good · ${input.counts.changes} need changes · ${input.counts.notReviewed} not reviewed`

  await createNotifications(
    recipients(input.ownerId, input.createdBy).map((teamUserId) => ({
      teamUserId,
      type: 'review' as const,
      title,
      body: summary,
      entityType: 'website_review',
      entityId: input.reviewId,
      href: hubClientReviewsPath(input.clientId, input.reviewId),
    }))
  )

  const blocks = buildSlackAlert({
    text,
    title,
    fields: [
      { label: 'Round', value: roundLabel(input.roundNumber) },
      { label: 'Sent by', value: input.submittedByName || 'Client' },
      { label: 'Looks good', value: String(input.counts.looksGood) },
      { label: 'Needs changes', value: `${input.counts.changes} (${input.counts.pins} pinned notes)` },
      { label: 'Not reviewed', value: String(input.counts.notReviewed) },
      { label: 'Content provided', value: `${input.counts.requestsProvided} of ${input.counts.requests}` },
    ],
    action: slackOpenHub(hubReviewUrl(input.clientId, input.reviewId)),
  })

  if (input.slackChannelId) {
    const posted = await postToSlackChannel(input.slackChannelId, text, blocks)
    if (posted.ok) return
  }
  await sendToChannel('projects', text, blocks)
}

export async function notifyReviewOpened(input: {
  reviewId: string
  clientId: string
  companyName: string
  roundNumber: number
  ownerId: string | null
  createdBy: string | null
}) {
  await createNotifications(
    recipients(input.ownerId, input.createdBy).map((teamUserId) => ({
      teamUserId,
      type: 'review' as const,
      title: `${input.companyName} opened their website review`,
      body: roundLabel(input.roundNumber),
      entityType: 'website_review',
      entityId: input.reviewId,
      href: hubClientReviewsPath(input.clientId, input.reviewId),
    }))
  )
}
