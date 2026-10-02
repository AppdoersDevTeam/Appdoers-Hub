import type { SupabaseClient } from '@supabase/supabase-js'
import { DOCUMENT_BUCKET } from '@/lib/documents'
import { signedUrlMap } from './server'
import { reviewPublicUrl } from './token'
import { normalizeItemRow, type ReviewItemRow, type ReviewStatus } from './types'

export type TeamReviewSummary = {
  id: string
  round_number: number
  status: ReviewStatus
  sent_at: string | null
  first_opened_at: string | null
  submitted_at: string | null
  due_date: string | null
}

export type TeamReviewItem = ReviewItemRow & {
  desktop_url: string | null
  mobile_url: string | null
  attachment_urls: Record<string, string>
  task_states: Record<string, string>
}

export type TeamReviewDetail = {
  id: string
  round_number: number
  status: ReviewStatus
  url: string
  staging_url: string | null
  intro_note: string | null
  project_id: string | null
  owner_id: string | null
  due_date: string | null
  client_due_date: string | null
  general_notes: string | null
  submitted_by_name: string | null
  submitted_at: string | null
  sent_at: string | null
  first_opened_at: string | null
  record_file_id: string | null
  has_previous: boolean
  items: TeamReviewItem[]
}

export type ClientReviewsData = {
  reviews: TeamReviewSummary[]
  selected: TeamReviewDetail | null
}

export async function loadClientReviews(
  db: SupabaseClient,
  clientId: string,
  selectedId: string | null
): Promise<ClientReviewsData> {
  const { data: rows } = await db
    .from('website_reviews')
    .select('id, round_number, status, sent_at, first_opened_at, submitted_at, due_date')
    .eq('client_id', clientId)
    .order('round_number', { ascending: false })
  const reviews = (rows ?? []) as TeamReviewSummary[]

  const pickId = reviews.some((r) => r.id === selectedId) ? selectedId : reviews[0]?.id
  if (!pickId) return { reviews, selected: null }

  const [{ data: review }, { data: rawItems }] = await Promise.all([
    db.from('website_reviews').select('*').eq('id', pickId).single(),
    db.from('website_review_items').select('*').eq('review_id', pickId).order('sort_order'),
  ])
  if (!review) return { reviews, selected: null }

  const items = (rawItems ?? []).map((row) => normalizeItemRow(row as Record<string, unknown>))
  const urls = await signedUrlMap(
    db,
    DOCUMENT_BUCKET,
    items.flatMap((i) => [i.screenshot_path, i.screenshot_mobile_path, ...i.client_attachments.map((a) => a.path)])
  )

  const taskIds = items.flatMap((i) => [i.task_id, ...i.pins.map((p) => p.task_id)]).filter((id): id is string => Boolean(id))
  const { data: tasks } = taskIds.length
    ? await db.from('tasks').select('id, status').in('id', taskIds)
    : { data: [] as { id: string; status: string }[] }
  const taskStates = Object.fromEntries((tasks ?? []).map((t) => [t.id as string, t.status as string]))

  return {
    reviews,
    selected: {
      id: review.id,
      round_number: review.round_number,
      status: review.status,
      url: reviewPublicUrl(review.share_token),
      staging_url: review.staging_url,
      intro_note: review.intro_note,
      project_id: review.project_id,
      owner_id: review.owner_id,
      due_date: review.due_date,
      client_due_date: review.client_due_date,
      general_notes: review.general_notes,
      submitted_by_name: review.submitted_by_name,
      submitted_at: review.submitted_at,
      sent_at: review.sent_at,
      first_opened_at: review.first_opened_at,
      record_file_id: review.record_file_id,
      has_previous: items.some((i) => i.previous_item_id),
      items: items.map((item) => ({
        ...item,
        desktop_url: item.screenshot_path ? urls.get(item.screenshot_path) ?? null : null,
        mobile_url: item.screenshot_mobile_path ? urls.get(item.screenshot_mobile_path) ?? null : null,
        attachment_urls: Object.fromEntries(
          item.client_attachments.map((a) => [a.path, urls.get(a.path) ?? '']).filter(([, url]) => url)
        ),
        task_states: Object.fromEntries(
          [item.task_id, ...item.pins.map((p) => p.task_id)]
            .filter((id): id is string => Boolean(id && taskStates[id]))
            .map((id) => [id, taskStates[id]])
        ),
      })),
    },
  }
}
