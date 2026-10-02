import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { clientIp, rateLimitHit } from '@/lib/intake/rate-limit'
import { findReviewByToken, loadPublicReview } from '@/lib/website-review/public'
import { notifyReviewSubmitted } from '@/lib/website-review/notify'
import { generateReviewRecordPdf } from '@/lib/website-review/record'
import { dateInDays, setProjectClientStatus } from '@/lib/website-review/server'
import {
  CLIENT_EDITABLE_STATUSES,
  REVIEW_LIMITS,
  REVIEW_SETTINGS_KEY,
  countReview,
  itemAnswerError,
  normalizeItemRow,
  normalizePins,
  normalizeReviewSettings,
  type ReviewItemStatus,
  type ReviewStatus,
} from '@/lib/website-review/types'

const ITEM_STATUSES = new Set<ReviewItemStatus>(['pending', 'looks_good', 'changes', 'provided'])

type Params = { params: Promise<{ token: string }> }

async function readJson(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json()
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest, { params }: Params) {
  const { token } = await params
  if (rateLimitHit(`review-get:${clientIp(req.headers)}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const db = await createServiceClient()
  const review = await loadPublicReview(db, token)
  if (!review) return NextResponse.json({ error: 'This review link is invalid.' }, { status: 404 })
  return NextResponse.json(review)
}

/** Autosave: one item's answer, or the general notes / name. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { token } = await params
  if (rateLimitHit(`review-patch:${clientIp(req.headers)}`, 240, 10 * 60_000)) {
    return NextResponse.json({ error: 'You are saving very quickly. Please wait a moment.' }, { status: 429 })
  }
  const body = await readJson(req)
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const db = await createServiceClient()
  const review = await findReviewByToken(db, token)
  if (!review) return NextResponse.json({ error: 'This review link is invalid.' }, { status: 404 })
  if (!CLIENT_EDITABLE_STATUSES.includes(review.status as ReviewStatus)) {
    return NextResponse.json({ error: 'This review has already been sent.' }, { status: 403 })
  }

  const now = new Date().toISOString()
  const reviewUpdate: Record<string, unknown> = { updated_at: now }
  if (review.status === 'sent') reviewUpdate.status = 'in_progress'

  if (typeof body.item_id === 'string') {
    const status = body.client_status as ReviewItemStatus
    if (!ITEM_STATUSES.has(status)) return NextResponse.json({ error: 'Invalid answer' }, { status: 400 })
    const comment = typeof body.client_comment === 'string' ? body.client_comment.slice(0, REVIEW_LIMITS.commentLength) : ''

    const { data: item } = await db
      .from('website_review_items')
      .select('id, kind, pins')
      .eq('id', body.item_id)
      .eq('review_id', review.id)
      .maybeSingle()
    if (!item) return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    if (item.kind === 'content_request' ? status === 'looks_good' || status === 'changes' : status === 'provided') {
      return NextResponse.json({ error: 'Invalid answer' }, { status: 400 })
    }

    // Keep any task links the team already created for existing pins.
    const existingTaskIds = new Map(normalizePins(item.pins).map((p) => [p.id, p.task_id ?? null]))
    const pins = normalizePins(body.pins).map((p) => ({ ...p, task_id: existingTaskIds.get(p.id) ?? null }))

    const { error } = await db
      .from('website_review_items')
      .update({ client_status: status, client_comment: comment || null, pins, updated_at: now })
      .eq('id', item.id)
    if (error) return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 })
  }

  if (typeof body.general_notes === 'string') {
    reviewUpdate.general_notes = body.general_notes.slice(0, REVIEW_LIMITS.generalNotesLength) || null
  }
  if (typeof body.submitted_by_name === 'string') {
    reviewUpdate.submitted_by_name = body.submitted_by_name.trim().slice(0, REVIEW_LIMITS.nameLength) || null
  }

  const { error } = await db.from('website_reviews').update(reviewUpdate).eq('id', review.id)
  if (error) return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 })
  return NextResponse.json({ ok: true, savedAt: now })
}

/** Final "Send my feedback". */
export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params
  if (rateLimitHit(`review-submit:${clientIp(req.headers)}`, 8, 10 * 60_000)) {
    return NextResponse.json({ error: 'Please wait a few minutes before sending again.' }, { status: 429 })
  }
  const body = await readJson(req)
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const name = typeof body.submitted_by_name === 'string' ? body.submitted_by_name.trim().slice(0, REVIEW_LIMITS.nameLength) : ''
  if (!name) return NextResponse.json({ error: 'Please type your name so we know who sent this.' }, { status: 400 })
  const notes = typeof body.general_notes === 'string' ? body.general_notes.slice(0, REVIEW_LIMITS.generalNotesLength) : ''

  const db = await createServiceClient()
  const review = await findReviewByToken(db, token)
  if (!review) return NextResponse.json({ error: 'This review link is invalid.' }, { status: 404 })
  if (!CLIENT_EDITABLE_STATUSES.includes(review.status as ReviewStatus)) {
    return NextResponse.json({ error: 'This review has already been sent.' }, { status: 403 })
  }

  const { data: rawItems } = await db.from('website_review_items').select('*').eq('review_id', review.id).order('sort_order')
  const items = (rawItems ?? []).map((row) => normalizeItemRow(row as Record<string, unknown>))
  const problems = items.map(itemAnswerError).filter((msg): msg is string => Boolean(msg))
  if (problems.length > 0) return NextResponse.json({ error: problems[0], problems }, { status: 400 })

  const isResubmit = Boolean(review.submitted_at)
  const now = new Date().toISOString()
  const { data: settingsRow } = await db.from('settings').select('value').eq('key', REVIEW_SETTINGS_KEY).maybeSingle()
  const settings = normalizeReviewSettings(settingsRow?.value)

  const { error } = await db
    .from('website_reviews')
    .update({
      status: 'submitted',
      submitted_at: now,
      submitted_by_name: name,
      general_notes: notes || null,
      due_date: review.due_date ?? dateInDays(settings.turnaround_days),
      updated_at: now,
    })
    .eq('id', review.id)
  if (error) return NextResponse.json({ error: 'Could not send your feedback. Please try again.' }, { status: 500 })

  await setProjectClientStatus(db, review.project_id, 'awaiting_appdoers', 'website feedback received', null)
  await db.from('activity_log').insert({
    entity_type: 'client',
    entity_id: review.client_id,
    client_id: review.client_id,
    action: 'website_review_submitted',
    description: `${name} ${isResubmit ? 'updated' : 'sent'} website feedback (round ${review.round_number})`,
    performed_by: null,
  })

  try {
    const record = await generateReviewRecordPdf(db, review.id, null)
    if (!record.ok) console.error('[Website review] PDF record failed:', record.error)
  } catch (err) {
    console.error('[Website review] PDF record failed:', err)
  }

  const client = Array.isArray(review.clients) ? review.clients[0] : review.clients
  try {
    await notifyReviewSubmitted({
      reviewId: review.id,
      clientId: review.client_id,
      companyName: client?.company_name ?? 'Client',
      slackChannelId: client?.slack_channel_id ?? null,
      roundNumber: review.round_number,
      counts: countReview(items),
      submittedByName: name,
      isResubmit,
      ownerId: review.owner_id,
      createdBy: review.created_by,
    })
  } catch (err) {
    console.error('[Website review] notify failed:', err)
  }

  return NextResponse.json({ ok: true })
}
