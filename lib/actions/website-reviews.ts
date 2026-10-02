'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireTeamAccess } from '@/lib/supabase/route-access'
import { DOCUMENT_BUCKET } from '@/lib/documents'
import { sendEmail } from '@/lib/email/resend'
import { logActivity } from './activity'
import { hashReviewToken, makeReviewToken, reviewPublicUrl } from '@/lib/website-review/token'
import { buildReviewEmail } from '@/lib/website-review/review-email'
import { setProjectClientStatus } from '@/lib/website-review/server'
import { generateReviewRecordPdf } from '@/lib/website-review/record'
import { hubClientReviewsPath } from '@/lib/website-review/notify'
import {
  INCLUDED_ROUNDS,
  normalizeItemRow,
  reviewStoragePrefix,
  roundLabel,
  type ReviewItemKind,
  type ReviewStatus,
} from '@/lib/website-review/types'

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string }

export type ReviewItemInput = {
  id?: string
  page_name: string
  section_name: string
  kind: ReviewItemKind
  team_note: string | null
  updated_since_last_round: boolean
}

export type ExtraRoundBilling = { mode: 'add'; price: number } | { mode: 'skip' }

const EXTRA_ROUND_PLAN_KEY = 'extra_feedback_round'

function clientPath(clientId: string) {
  return `/app/clients/${clientId}`
}

function cleanUrl(url: string | null | undefined) {
  const trimmed = url?.trim() ?? ''
  if (!trimmed) return null
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

async function addExtraRoundAddon(
  db: SupabaseClient,
  clientId: string,
  roundNumber: number,
  price: number
): Promise<string | null> {
  const { data: service } = await db
    .from('service_catalog')
    .select('id')
    .eq('plan_key', EXTRA_ROUND_PLAN_KEY)
    .maybeSingle()
  if (!service) return 'The "Extra feedback round" add-on is missing from the service catalog.'

  const note = `Round ${roundNumber} (${new Date().toISOString().slice(0, 10)})`
  const { data: existing } = await db
    .from('client_services')
    .select('id, quantity, notes')
    .eq('client_id', clientId)
    .eq('service_catalog_id', service.id)
    .maybeSingle()

  const { error } = existing
    ? await db
        .from('client_services')
        .update({
          quantity: (existing.quantity ?? 1) + 1,
          setup_fee: price,
          notes: [existing.notes, note].filter(Boolean).join('; ').slice(0, 1000),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    : await db.from('client_services').insert({
        client_id: clientId,
        service_catalog_id: service.id,
        quantity: 1,
        monthly_fee: 0,
        setup_fee: price,
        notes: note,
      })
  return error ? error.message : null
}

export async function getExtraRoundPriceAction(): Promise<ActionResult<{ price: number }>> {
  const access = await requireTeamAccess()
  if (!access.ok) return { success: false, error: access.message }
  const { data } = await access.db
    .from('service_catalog')
    .select('setup_fee')
    .eq('plan_key', EXTRA_ROUND_PLAN_KEY)
    .maybeSingle()
  return { success: true, data: { price: Number(data?.setup_fee ?? 0) } }
}

export async function createWebsiteReviewAction(
  clientId: string,
  input: { projectId: string | null; templateId: string | null; stagingUrl: string; billing?: ExtraRoundBilling }
): Promise<ActionResult<{ id: string }>> {
  try {
    const access = await requireTeamAccess()
    if (!access.ok) return { success: false, error: access.message }
    const db = access.db

    const { data: client } = await db.from('clients').select('id, company_name').eq('id', clientId).single()
    if (!client) return { success: false, error: 'Client not found' }

    const { data: previous } = await db
      .from('website_reviews')
      .select('id, round_number, project_id, staging_url, template_id')
      .eq('client_id', clientId)
      .order('round_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    const roundNumber = (previous?.round_number ?? 0) + 1

    if (roundNumber > INCLUDED_ROUNDS) {
      if (!input.billing) return { success: false, error: 'Choose whether to bill this extra round.' }
      if (input.billing.mode === 'add') {
        if (!Number.isFinite(input.billing.price) || input.billing.price < 0) {
          return { success: false, error: 'Enter a valid price for the extra round.' }
        }
        const billingError = await addExtraRoundAddon(db, clientId, roundNumber, input.billing.price)
        if (billingError) return { success: false, error: billingError }
      }
    }

    let templateId = input.templateId
    if (!previous && !templateId) {
      const { data: fallback } = await db
        .from('review_templates')
        .select('id')
        .order('is_default', { ascending: false })
        .order('created_at')
        .limit(1)
        .maybeSingle()
      templateId = fallback?.id ?? null
    }

    const token = makeReviewToken()
    const { data: review, error } = await db
      .from('website_reviews')
      .insert({
        client_id: clientId,
        project_id: input.projectId ?? previous?.project_id ?? null,
        template_id: previous ? previous.template_id : templateId,
        round_number: roundNumber,
        title: `Website review — ${roundLabel(roundNumber)}`,
        staging_url: cleanUrl(input.stagingUrl) ?? previous?.staging_url ?? null,
        token_hash: hashReviewToken(token),
        share_token: token,
        status: 'draft',
        owner_id: access.userId,
        created_by: access.userId,
      })
      .select('id')
      .single()
    if (error || !review) {
      return {
        success: false,
        error: error?.code === '23505' ? 'Another round was just created — refresh and try again.' : error?.message ?? 'Could not create review',
      }
    }

    let rows: Record<string, unknown>[] = []
    if (previous) {
      const { data: prevItems } = await db
        .from('website_review_items')
        .select('id, page_name, section_name, kind, team_note, sort_order, screenshot_path, screenshot_mobile_path')
        .eq('review_id', previous.id)
        .order('sort_order')
      rows = (prevItems ?? []).map((item) => ({
        review_id: review.id,
        page_name: item.page_name,
        section_name: item.section_name,
        kind: item.kind,
        team_note: item.team_note,
        sort_order: item.sort_order,
        screenshot_path: item.screenshot_path,
        screenshot_mobile_path: item.screenshot_mobile_path,
        previous_screenshot_path: item.screenshot_path,
        previous_item_id: item.id,
      }))
    } else if (templateId) {
      const { data: tplItems } = await db
        .from('review_template_items')
        .select('page_name, section_name, kind, team_note, sort_order')
        .eq('template_id', templateId)
        .order('sort_order')
      rows = (tplItems ?? []).map((item) => ({ ...item, review_id: review.id }))
    }

    if (rows.length > 0) {
      const { error: itemsError } = await db.from('website_review_items').insert(rows)
      if (itemsError) {
        await db.from('website_reviews').delete().eq('id', review.id)
        return { success: false, error: itemsError.message }
      }
    }

    const billingNote =
      roundNumber > INCLUDED_ROUNDS
        ? input.billing?.mode === 'add'
          ? ` — extra round billed at $${input.billing.price.toFixed(2)}`
          : ' — extra round not billed (goodwill)'
        : ''
    await logActivity({
      entityType: 'client',
      entityId: clientId,
      clientId,
      action: 'website_review_created',
      description: `Website review ${roundLabel(roundNumber)} created${billingNote}`,
    })
    revalidatePath(clientPath(clientId))
    return { success: true, data: { id: review.id } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function updateWebsiteReviewAction(
  reviewId: string,
  input: {
    staging_url: string
    intro_note: string
    project_id: string | null
    owner_id: string | null
    due_date: string | null
    client_due_date: string | null
  }
): Promise<ActionResult> {
  try {
    const access = await requireTeamAccess()
    if (!access.ok) return { success: false, error: access.message }

    const { data, error } = await access.db
      .from('website_reviews')
      .update({
        staging_url: cleanUrl(input.staging_url),
        intro_note: input.intro_note.trim().slice(0, 2000) || null,
        project_id: input.project_id || null,
        owner_id: input.owner_id || null,
        due_date: input.due_date || null,
        client_due_date: input.client_due_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .select('client_id')
      .single()
    if (error || !data) return { success: false, error: error?.message ?? 'Review not found' }

    revalidatePath(clientPath(data.client_id))
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function saveReviewItemsAction(reviewId: string, items: ReviewItemInput[]): Promise<ActionResult> {
  try {
    const access = await requireTeamAccess()
    if (!access.ok) return { success: false, error: access.message }
    const db = access.db

    const { data: review } = await db.from('website_reviews').select('client_id').eq('id', reviewId).single()
    if (!review) return { success: false, error: 'Review not found' }

    const cleaned = items
      .map((item, index) => ({
        id: item.id,
        page_name: item.page_name.trim().slice(0, 120),
        section_name: item.section_name.trim().slice(0, 160),
        kind: (item.kind === 'content_request' ? 'content_request' : 'section') as ReviewItemKind,
        team_note: item.team_note?.trim().slice(0, 1000) || null,
        updated_since_last_round: Boolean(item.updated_since_last_round),
        sort_order: (index + 1) * 10,
      }))
      .filter((item) => item.page_name && item.section_name)

    const { data: currentRows } = await db.from('website_review_items').select('id').eq('review_id', reviewId)
    const currentIds = new Set((currentRows ?? []).map((r) => r.id as string))
    const keepIds = new Set(cleaned.map((i) => i.id).filter((id): id is string => Boolean(id && currentIds.has(id))))
    const removeIds = [...currentIds].filter((id) => !keepIds.has(id))

    if (removeIds.length > 0) {
      const { data: removed } = await db
        .from('website_review_items')
        .select('screenshot_path, screenshot_mobile_path, previous_screenshot_path, client_attachments')
        .in('id', removeIds)
      const { error } = await db.from('website_review_items').delete().in('id', removeIds)
      if (error) return { success: false, error: error.message }
      await removeOrphanedFiles(db, reviewId, removed ?? [])
    }

    for (const item of cleaned.filter((i) => i.id && keepIds.has(i.id))) {
      const { id, ...fields } = item
      const { error } = await db
        .from('website_review_items')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', id as string)
        .eq('review_id', reviewId)
      if (error) return { success: false, error: error.message }
    }

    const fresh = cleaned.filter((i) => !i.id || !keepIds.has(i.id))
    if (fresh.length > 0) {
      const { error } = await db
        .from('website_review_items')
        .insert(fresh.map(({ id: _id, ...fields }) => ({ ...fields, review_id: reviewId })))
      if (error) return { success: false, error: error.message }
    }

    revalidatePath(clientPath(review.client_id))
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

/** Removes storage objects no longer referenced by any item of any round (screenshots carry across rounds). */
async function removeOrphanedFiles(
  db: SupabaseClient,
  reviewId: string,
  removed: Record<string, unknown>[]
) {
  const candidates = new Set<string>()
  for (const row of removed) {
    for (const key of ['screenshot_path', 'screenshot_mobile_path']) {
      const value = row[key]
      if (typeof value === 'string' && value.includes(`/${reviewId}/`)) candidates.add(value)
    }
    for (const attachment of normalizeItemRow(row).client_attachments) candidates.add(attachment.path)
  }
  if (candidates.size === 0) return

  const paths = [...candidates]
  const stillUsed = new Set<string>()
  for (const column of ['screenshot_path', 'screenshot_mobile_path', 'previous_screenshot_path']) {
    const { data } = await db.from('website_review_items').select(column).in(column, paths)
    for (const row of (data ?? []) as unknown as Record<string, string | null>[]) {
      const value = row[column]
      if (value) stillUsed.add(value)
    }
  }
  const orphaned = paths.filter((p) => !stillUsed.has(p))
  if (orphaned.length > 0) await db.storage.from(DOCUMENT_BUCKET).remove(orphaned)
}

export async function removeReviewScreenshotAction(itemId: string, view: 'desktop' | 'mobile'): Promise<ActionResult> {
  try {
    const access = await requireTeamAccess()
    if (!access.ok) return { success: false, error: access.message }
    const column = view === 'mobile' ? 'screenshot_mobile_path' : 'screenshot_path'

    const { data: item } = await access.db
      .from('website_review_items')
      .select(`review_id, ${column}, website_reviews(client_id)`)
      .eq('id', itemId)
      .single()
    if (!item) return { success: false, error: 'Section not found' }

    const { error } = await access.db
      .from('website_review_items')
      .update({ [column]: null, updated_at: new Date().toISOString() })
      .eq('id', itemId)
    if (error) return { success: false, error: error.message }

    const row = item as unknown as Record<string, unknown>
    await removeOrphanedFiles(access.db, row.review_id as string, [{ [column]: row[column] }])

    const parent = row.website_reviews as { client_id: string } | { client_id: string }[] | null
    const clientId = Array.isArray(parent) ? parent[0]?.client_id : parent?.client_id
    if (clientId) revalidatePath(clientPath(clientId))
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function sendReviewAction(
  reviewId: string,
  options: { email: boolean }
): Promise<ActionResult<{ url: string; emailedTo: string | null; emailError: string | null }>> {
  try {
    const access = await requireTeamAccess()
    if (!access.ok) return { success: false, error: access.message }
    const db = access.db

    const { data: review } = await db
      .from('website_reviews')
      .select('id, client_id, project_id, round_number, status, share_token, client_due_date, clients(company_name)')
      .eq('id', reviewId)
      .single()
    if (!review) return { success: false, error: 'Review not found' }
    if (review.status === 'closed') return { success: false, error: 'This round is closed. Reopen it first.' }

    const { count } = await db
      .from('website_review_items')
      .select('id', { count: 'exact', head: true })
      .eq('review_id', reviewId)
    if (!count) return { success: false, error: 'Add at least one section before sending.' }

    const url = reviewPublicUrl(review.share_token)
    const client = Array.isArray(review.clients) ? review.clients[0] : review.clients

    let emailedTo: string | null = null
    let emailError: string | null = null
    if (options.email) {
      const { data: contacts } = await db
        .from('client_contacts')
        .select('full_name, email, is_primary')
        .eq('client_id', review.client_id)
        .order('is_primary', { ascending: false })
        .limit(1)
      const contact = contacts?.[0]
      if (!contact?.email) {
        emailError = 'No client contact with an email address.'
      } else {
        const message = buildReviewEmail({
          clientName: client?.company_name ?? 'your organisation',
          contactName: contact.full_name,
          roundNumber: review.round_number,
          reviewUrl: url,
          clientDueDate: review.client_due_date,
        })
        const sent = await sendEmail({ to: contact.email, ...message })
        if (sent.ok) emailedTo = contact.email
        else emailError = sent.error
      }
    }

    if (review.status === 'draft') {
      const { error } = await db
        .from('website_reviews')
        .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', reviewId)
      if (error) return { success: false, error: error.message }
      await setProjectClientStatus(db, review.project_id, 'awaiting_client', 'website review sent', access.userId)
    }

    await logActivity({
      entityType: 'client',
      entityId: review.client_id,
      clientId: review.client_id,
      action: 'website_review_sent',
      description: `Website review ${roundLabel(review.round_number)} ${emailedTo ? `emailed to ${emailedTo}` : 'link shared'}`,
    })
    revalidatePath(clientPath(review.client_id))
    return { success: true, data: { url, emailedTo, emailError } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

async function setReviewStatus(reviewId: string, status: ReviewStatus, action: string): Promise<ActionResult> {
  const access = await requireTeamAccess()
  if (!access.ok) return { success: false, error: access.message }

  const now = new Date().toISOString()
  const { data, error } = await access.db
    .from('website_reviews')
    .update({ status, closed_at: status === 'closed' ? now : null, updated_at: now })
    .eq('id', reviewId)
    .select('client_id, round_number, project_id')
    .single()
  if (error || !data) return { success: false, error: error?.message ?? 'Review not found' }

  if (status === 'reopened') {
    await setProjectClientStatus(access.db, data.project_id, 'awaiting_client', 'website review reopened', access.userId)
  }

  await logActivity({
    entityType: 'client',
    entityId: data.client_id,
    clientId: data.client_id,
    action,
    description: `Website review ${roundLabel(data.round_number)} ${status === 'closed' ? 'closed' : 'reopened for the client'}`,
  })
  revalidatePath(clientPath(data.client_id))
  return { success: true, data: undefined }
}

export async function reopenReviewAction(reviewId: string): Promise<ActionResult> {
  try {
    return await setReviewStatus(reviewId, 'reopened', 'website_review_reopened')
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function closeReviewAction(reviewId: string): Promise<ActionResult> {
  try {
    return await setReviewStatus(reviewId, 'closed', 'website_review_closed')
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function deleteReviewAction(reviewId: string): Promise<ActionResult> {
  try {
    const access = await requireTeamAccess()
    if (!access.ok) return { success: false, error: access.message }
    const db = access.db

    const { data: review } = await db
      .from('website_reviews')
      .select('client_id, round_number, record_file_id')
      .eq('id', reviewId)
      .single()
    if (!review) return { success: false, error: 'Review not found' }

    const { data: later } = await db
      .from('website_reviews')
      .select('id')
      .eq('client_id', review.client_id)
      .gt('round_number', review.round_number)
      .limit(1)
    if (later && later.length > 0) return { success: false, error: 'Only the latest round can be deleted.' }

    const { data: items } = await db
      .from('website_review_items')
      .select('screenshot_path, screenshot_mobile_path, previous_screenshot_path, client_attachments')
      .eq('review_id', reviewId)

    const { error } = await db.from('website_reviews').delete().eq('id', reviewId)
    if (error) return { success: false, error: error.message }

    await removeOrphanedFiles(db, reviewId, items ?? [])
    const { data: leftovers } = await db.storage
      .from(DOCUMENT_BUCKET)
      .list(`${reviewStoragePrefix(review.client_id, reviewId)}attachments`)
    if (leftovers && leftovers.length > 0) {
      await db.storage
        .from(DOCUMENT_BUCKET)
        .remove(leftovers.map((f) => `${reviewStoragePrefix(review.client_id, reviewId)}attachments/${f.name}`))
    }

    await logActivity({
      entityType: 'client',
      entityId: review.client_id,
      clientId: review.client_id,
      action: 'website_review_deleted',
      description: `Website review ${roundLabel(review.round_number)} deleted`,
    })
    revalidatePath(clientPath(review.client_id))
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

function truncate(text: string, max: number) {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

export async function createTasksFromReviewAction(reviewId: string): Promise<ActionResult<{ created: number }>> {
  try {
    const access = await requireTeamAccess()
    if (!access.ok) return { success: false, error: access.message }
    const db = access.db

    const { data: review } = await db
      .from('website_reviews')
      .select('id, client_id, project_id, round_number, owner_id')
      .eq('id', reviewId)
      .single()
    if (!review) return { success: false, error: 'Review not found' }
    if (!review.project_id) return { success: false, error: 'Link this review to a project first.' }

    const { data: rawItems } = await db
      .from('website_review_items')
      .select('*')
      .eq('review_id', reviewId)
      .order('sort_order')
    const items = (rawItems ?? []).map((row) => normalizeItemRow(row as Record<string, unknown>))

    const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '')
    const link = `${base}${hubClientReviewsPath(review.client_id, reviewId)}`
    const prefix = `[Review R${review.round_number}]`
    let created = 0

    const insertTask = async (title: string, description: string, type: 'revision' | 'content') => {
      const { data, error } = await db
        .from('tasks')
        .insert({
          project_id: review.project_id,
          title: truncate(title, 200),
          description,
          type,
          priority: 'p2',
          status: 'open',
          assigned_to: review.owner_id,
          created_by: access.userId,
        })
        .select('id')
        .single()
      if (error || !data) throw new Error(error?.message ?? 'Could not create task')
      created += 1
      return data.id as string
    }

    for (const item of items) {
      const where = `${item.page_name} › ${item.section_name}`
      let pinsChanged = false
      const pins = []
      for (const [index, pin] of item.pins.entries()) {
        if (pin.task_id || !pin.comment.trim()) {
          pins.push(pin)
          continue
        }
        const taskId = await insertTask(
          `${prefix} ${where} #${index + 1}: ${truncate(pin.comment, 90)}`,
          `${pin.comment}\n\nPinned on the ${pin.view} screenshot of "${where}".\nReview: ${link}`,
          'revision'
        )
        pins.push({ ...pin, task_id: taskId })
        pinsChanged = true
      }

      let itemTaskId = item.task_id
      const comment = item.client_comment?.trim() ?? ''
      const wantsItemTask =
        !itemTaskId &&
        ((item.kind === 'section' && item.client_status === 'changes' && comment) ||
          (item.kind === 'content_request' && item.client_status === 'provided' && (comment || item.client_attachments.length > 0)))
      if (wantsItemTask) {
        const isContent = item.kind === 'content_request'
        const files = item.client_attachments.length ? `\n\nFiles provided: ${item.client_attachments.map((a) => a.name).join(', ')}` : ''
        itemTaskId = await insertTask(
          isContent ? `${prefix} Add provided content: ${where}` : `${prefix} ${where}: ${truncate(comment, 90)}`,
          `${comment || '(no comment)'}${files}\n\nReview: ${link}`,
          isContent ? 'content' : 'revision'
        )
      }

      if (pinsChanged || itemTaskId !== item.task_id) {
        const { error } = await db
          .from('website_review_items')
          .update({ pins, task_id: itemTaskId, updated_at: new Date().toISOString() })
          .eq('id', item.id)
        if (error) return { success: false, error: error.message }
      }
    }

    if (created > 0) {
      await logActivity({
        entityType: 'client',
        entityId: review.client_id,
        clientId: review.client_id,
        action: 'website_review_tasks_created',
        description: `${created} task${created === 1 ? '' : 's'} created from website review ${roundLabel(review.round_number)}`,
      })
    }
    revalidatePath(clientPath(review.client_id))
    revalidatePath(`/app/projects/${review.project_id}`)
    return { success: true, data: { created } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function getReviewFileUrlAction(path: string, download?: string): Promise<ActionResult<{ url: string }>> {
  try {
    const access = await requireTeamAccess()
    if (!access.ok) return { success: false, error: access.message }
    if (!path.startsWith('website-reviews/')) return { success: false, error: 'Invalid file' }

    const { data, error } = await access.db.storage
      .from(DOCUMENT_BUCKET)
      .createSignedUrl(path, 600, download ? { download } : undefined)
    if (error || !data) return { success: false, error: error?.message ?? 'Could not open file' }
    return { success: true, data: { url: data.signedUrl } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function regenerateReviewRecordAction(reviewId: string): Promise<ActionResult> {
  try {
    const access = await requireTeamAccess()
    if (!access.ok) return { success: false, error: access.message }
    const result = await generateReviewRecordPdf(access.db, reviewId, access.userId)
    if (!result.ok) return { success: false, error: result.error }
    revalidatePath(clientPath(result.clientId))
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
