export const INCLUDED_ROUNDS = 3

export type ReviewStatus = 'draft' | 'sent' | 'in_progress' | 'submitted' | 'reopened' | 'closed'
export type ReviewItemKind = 'section' | 'content_request'
export type ReviewItemStatus = 'pending' | 'looks_good' | 'changes' | 'provided'
export type ReviewView = 'desktop' | 'mobile'

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  in_progress: 'Client reviewing',
  submitted: 'Feedback received',
  reopened: 'Reopened',
  closed: 'Closed',
}

/** Statuses in which the client may still edit their answers. */
export const CLIENT_EDITABLE_STATUSES: ReviewStatus[] = ['sent', 'in_progress', 'reopened']

export const REVIEW_LIMITS = {
  pinsPerItem: 30,
  commentLength: 4000,
  generalNotesLength: 10000,
  nameLength: 120,
  attachmentsPerItem: 10,
  attachmentMaxBytes: 10 * 1024 * 1024,
  screenshotMaxBytes: 15 * 1024 * 1024,
} as const

export const SCREENSHOT_TYPES = new Set(['image/png', 'image/jpeg'])
export const ATTACHMENT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
])

export type ReviewPin = {
  id: string
  x: number
  y: number
  view: ReviewView
  comment: string
  task_id?: string | null
}

export type ReviewAttachment = { path: string; name: string; size: number }

export type ReviewItemRow = {
  id: string
  review_id: string
  page_name: string
  section_name: string
  kind: ReviewItemKind
  team_note: string | null
  sort_order: number
  screenshot_path: string | null
  screenshot_mobile_path: string | null
  previous_screenshot_path: string | null
  updated_since_last_round: boolean
  previous_item_id: string | null
  client_status: ReviewItemStatus
  client_comment: string | null
  pins: ReviewPin[]
  client_attachments: ReviewAttachment[]
  task_id: string | null
}

export type ReviewSettings = {
  walkthrough_video_url: string
  turnaround_days: number
}

export const DEFAULT_REVIEW_SETTINGS: ReviewSettings = {
  walkthrough_video_url: '',
  turnaround_days: 5,
}

export const REVIEW_SETTINGS_KEY = 'website_reviews'

export function normalizeReviewSettings(value: unknown): ReviewSettings {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const days = Number(raw.turnaround_days)
  return {
    walkthrough_video_url: typeof raw.walkthrough_video_url === 'string' ? raw.walkthrough_video_url.trim() : '',
    turnaround_days: Number.isFinite(days) && days >= 1 && days <= 60 ? Math.round(days) : DEFAULT_REVIEW_SETTINGS.turnaround_days,
  }
}

function clamp(n: number) {
  return Math.min(100, Math.max(0, n))
}

export function normalizePins(value: unknown): ReviewPin[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === 'object')
    .map((p) => ({
      id: typeof p.id === 'string' && p.id ? p.id.slice(0, 40) : crypto.randomUUID(),
      x: clamp(Number(p.x) || 0),
      y: clamp(Number(p.y) || 0),
      view: (p.view === 'mobile' ? 'mobile' : 'desktop') as ReviewView,
      comment: typeof p.comment === 'string' ? p.comment.slice(0, REVIEW_LIMITS.commentLength) : '',
      task_id: typeof p.task_id === 'string' ? p.task_id : null,
    }))
    .slice(0, REVIEW_LIMITS.pinsPerItem)
}

export function normalizeAttachments(value: unknown): ReviewAttachment[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((a): a is Record<string, unknown> => Boolean(a) && typeof a === 'object' && typeof (a as { path?: unknown }).path === 'string')
    .map((a) => ({ path: String(a.path), name: String(a.name ?? 'file'), size: Number(a.size) || 0 }))
    .slice(0, REVIEW_LIMITS.attachmentsPerItem)
}

export function normalizeItemRow(row: Record<string, unknown>): ReviewItemRow {
  return {
    ...(row as unknown as ReviewItemRow),
    pins: normalizePins(row.pins),
    client_attachments: normalizeAttachments(row.client_attachments),
  }
}

export type PageGroup<T> = { page: string; items: T[] }

/** Groups items by page name, keeping the order in which pages first appear. */
export function groupItemsByPage<T extends { page_name: string; sort_order: number }>(items: T[]): PageGroup<T>[] {
  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order)
  const groups: PageGroup<T>[] = []
  for (const item of sorted) {
    const group = groups.find((g) => g.page === item.page_name)
    if (group) group.items.push(item)
    else groups.push({ page: item.page_name, items: [item] })
  }
  return groups
}

export type ReviewCounts = {
  looksGood: number
  changes: number
  notReviewed: number
  requests: number
  requestsProvided: number
  pins: number
}

export function countReview(items: Pick<ReviewItemRow, 'kind' | 'client_status' | 'pins'>[]): ReviewCounts {
  const counts: ReviewCounts = { looksGood: 0, changes: 0, notReviewed: 0, requests: 0, requestsProvided: 0, pins: 0 }
  for (const item of items) {
    if (item.kind === 'content_request') {
      counts.requests += 1
      if (item.client_status === 'provided') counts.requestsProvided += 1
      continue
    }
    if (item.client_status === 'looks_good') counts.looksGood += 1
    else if (item.client_status === 'changes') counts.changes += 1
    else counts.notReviewed += 1
    counts.pins += item.pins.length
  }
  return counts
}

/** A "Needs changes" answer must say what to change; returns a client-friendly message or null. */
export function itemAnswerError(item: Pick<ReviewItemRow, 'kind' | 'client_status' | 'client_comment' | 'pins' | 'section_name'>): string | null {
  if (item.kind === 'section' && item.client_status === 'changes') {
    const hasPinText = item.pins.some((p) => p.comment.trim())
    if (!hasPinText && !item.client_comment?.trim()) {
      return `"${item.section_name}": please tell us what to change (tap the picture or type a comment).`
    }
  }
  return null
}

export function safeFileName(name: string, fallback = 'file') {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || fallback
}

export function roundLabel(round: number) {
  return round > INCLUDED_ROUNDS ? `Round ${round} (extra)` : `Round ${round} of ${INCLUDED_ROUNDS}`
}

export function reviewStoragePrefix(clientId: string, reviewId: string) {
  return `website-reviews/${clientId}/${reviewId}/`
}
