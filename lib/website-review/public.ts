import type { SupabaseClient } from '@supabase/supabase-js'
import { DOCUMENT_BUCKET } from '@/lib/documents'
import { APPDOERS_COMPANY_DEFAULTS } from '@/lib/pdf/company-defaults'
import { signedUrlMap } from './server'
import { hashReviewToken } from './token'
import {
  CLIENT_EDITABLE_STATUSES,
  INCLUDED_ROUNDS,
  REVIEW_SETTINGS_KEY,
  normalizeItemRow,
  normalizeReviewSettings,
  type ReviewAttachment,
  type ReviewItemKind,
  type ReviewItemStatus,
  type ReviewPin,
  type ReviewStatus,
} from './types'

export type DoneState = 'done' | 'in_progress' | 'planned' | 'noted'

export type PublicReviewItem = {
  id: string
  page_name: string
  section_name: string
  kind: ReviewItemKind
  team_note: string | null
  desktop_url: string | null
  mobile_url: string | null
  before_url: string | null
  updated: boolean
  previously_approved: boolean
  client_status: ReviewItemStatus
  client_comment: string
  pins: ReviewPin[]
  attachments: (ReviewAttachment & { url: string | null })[]
}

export type AskedDidEntry = { page_name: string; section_name: string; request: string; state: DoneState }

export type PublicReview = {
  id: string
  clientId: string
  companyName: string
  roundNumber: number
  includedRounds: number
  status: ReviewStatus
  editable: boolean
  stagingUrl: string | null
  introNote: string | null
  clientDueDate: string | null
  generalNotes: string
  submittedByName: string
  submittedAt: string | null
  helpPhone: string
  helpEmail: string
  walkthroughVideoUrl: string
  items: PublicReviewItem[]
  askedDid: AskedDidEntry[]
}

const TASK_STATE: Record<string, DoneState> = {
  closed: 'done',
  awaiting_review: 'in_progress',
  in_progress: 'in_progress',
  open: 'planned',
}

/** Finds a review by its public token (null when invalid, or a draft unless `allowDraft` for team previews). */
export async function findReviewByToken(db: SupabaseClient, token: string, options: { allowDraft?: boolean } = {}) {
  const { data } = await db
    .from('website_reviews')
    .select('*, clients(company_name, slack_channel_id)')
    .eq('token_hash', hashReviewToken(token.trim()))
    .maybeSingle()
  if (!data || (data.status === 'draft' && !options.allowDraft)) return null
  return data
}

export async function loadPublicReview(
  db: SupabaseClient,
  token: string,
  options: { allowDraft?: boolean } = {}
): Promise<PublicReview | null> {
  const review = await findReviewByToken(db, token, options)
  if (!review) return null

  const [{ data: rawItems }, { data: settingsRow }, { data: owner }] = await Promise.all([
    db.from('website_review_items').select('*').eq('review_id', review.id).order('sort_order'),
    db.from('settings').select('value').eq('key', REVIEW_SETTINGS_KEY).maybeSingle(),
    review.owner_id
      ? db.from('team_users').select('phone, email').eq('id', review.owner_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  const items = (rawItems ?? []).map((row) => normalizeItemRow(row as Record<string, unknown>))

  const previousIds = items.map((i) => i.previous_item_id).filter((id): id is string => Boolean(id))
  const { data: rawPrevious } = previousIds.length
    ? await db.from('website_review_items').select('*').in('id', previousIds)
    : { data: [] as Record<string, unknown>[] }
  const previous = new Map(
    (rawPrevious ?? []).map((row) => {
      const item = normalizeItemRow(row as Record<string, unknown>)
      return [item.id, item] as const
    })
  )

  const taskIds = [...previous.values()].flatMap((p) => [p.task_id, ...p.pins.map((pin) => pin.task_id)]).filter((id): id is string => Boolean(id))
  const { data: tasks } = taskIds.length
    ? await db.from('tasks').select('id, status').in('id', taskIds)
    : { data: [] as { id: string; status: string }[] }
  const taskState = new Map((tasks ?? []).map((t) => [t.id as string, TASK_STATE[t.status as string] ?? 'planned']))

  const urls = await signedUrlMap(
    db,
    DOCUMENT_BUCKET,
    items.flatMap((i) => [i.screenshot_path, i.screenshot_mobile_path, i.previous_screenshot_path, ...i.client_attachments.map((a) => a.path)]),
    6 * 3600
  )

  const askedDid: AskedDidEntry[] = []
  for (const item of items) {
    const prev = item.previous_item_id ? previous.get(item.previous_item_id) : null
    if (!prev) continue
    for (const pin of prev.pins) {
      if (!pin.comment.trim()) continue
      askedDid.push({
        page_name: item.page_name,
        section_name: item.section_name,
        request: pin.comment,
        state: pin.task_id ? taskState.get(pin.task_id) ?? 'planned' : 'noted',
      })
    }
    if (prev.client_status === 'changes' && prev.client_comment?.trim()) {
      askedDid.push({
        page_name: item.page_name,
        section_name: item.section_name,
        request: prev.client_comment,
        state: prev.task_id ? taskState.get(prev.task_id) ?? 'planned' : 'noted',
      })
    }
  }

  const client = Array.isArray(review.clients) ? review.clients[0] : review.clients
  const settings = normalizeReviewSettings(settingsRow?.value)

  return {
    id: review.id,
    clientId: review.client_id,
    companyName: client?.company_name ?? '',
    roundNumber: review.round_number,
    includedRounds: INCLUDED_ROUNDS,
    status: review.status as ReviewStatus,
    editable: CLIENT_EDITABLE_STATUSES.includes(review.status as ReviewStatus),
    stagingUrl: review.staging_url,
    introNote: review.intro_note,
    clientDueDate: review.client_due_date,
    generalNotes: review.general_notes ?? '',
    submittedByName: review.submitted_by_name ?? '',
    submittedAt: review.submitted_at,
    helpPhone: owner?.phone?.trim() || APPDOERS_COMPANY_DEFAULTS.phone,
    helpEmail: APPDOERS_COMPANY_DEFAULTS.email,
    walkthroughVideoUrl: settings.walkthrough_video_url,
    askedDid,
    items: items.map((item) => {
      const prev = item.previous_item_id ? previous.get(item.previous_item_id) : null
      const hasBefore = item.updated_since_last_round && item.previous_screenshot_path && item.previous_screenshot_path !== item.screenshot_path
      return {
        id: item.id,
        page_name: item.page_name,
        section_name: item.section_name,
        kind: item.kind,
        team_note: item.team_note,
        desktop_url: item.screenshot_path ? urls.get(item.screenshot_path) ?? null : null,
        mobile_url: item.screenshot_mobile_path ? urls.get(item.screenshot_mobile_path) ?? null : null,
        before_url: hasBefore ? urls.get(item.previous_screenshot_path as string) ?? null : null,
        updated: item.updated_since_last_round,
        previously_approved: Boolean(prev && prev.client_status === 'looks_good' && !item.updated_since_last_round),
        client_status: item.client_status,
        client_comment: item.client_comment ?? '',
        pins: item.pins,
        attachments: item.client_attachments.map((a) => ({ ...a, url: urls.get(a.path) ?? null })),
      }
    }),
  }
}
