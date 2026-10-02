'use server'

import { revalidatePath } from 'next/cache'
import { requireTeamAccess } from '@/lib/supabase/route-access'
import { logActivity } from './activity'
import {
  REVIEW_SETTINGS_KEY,
  normalizeReviewSettings,
  type ReviewItemKind,
  type ReviewSettings,
} from '@/lib/website-review/types'

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string }

export type TemplateItemInput = {
  id?: string
  page_name: string
  section_name: string
  kind: ReviewItemKind
  team_note: string | null
}

const TEMPLATES_PATH = '/app/review-templates'

function cleanItems(items: TemplateItemInput[]) {
  return items
    .map((item, index) => ({
      id: item.id,
      page_name: item.page_name.trim().slice(0, 120),
      section_name: item.section_name.trim().slice(0, 160),
      kind: (item.kind === 'content_request' ? 'content_request' : 'section') as ReviewItemKind,
      team_note: item.team_note?.trim().slice(0, 1000) || null,
      sort_order: (index + 1) * 10,
    }))
    .filter((item) => item.page_name && item.section_name)
}

export async function createReviewTemplateAction(input: {
  name: string
  description?: string
}): Promise<ActionResult<{ id: string }>> {
  try {
    const access = await requireTeamAccess()
    if (!access.ok) return { success: false, error: access.message }
    const name = input.name.trim()
    if (!name) return { success: false, error: 'Template name is required' }

    const { data, error } = await access.db
      .from('review_templates')
      .insert({ name: name.slice(0, 120), description: input.description?.trim() || null, created_by: access.userId })
      .select('id')
      .single()
    if (error || !data) return { success: false, error: error?.message ?? 'Could not create template' }

    revalidatePath(TEMPLATES_PATH)
    return { success: true, data: { id: data.id } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function saveReviewTemplateAction(
  templateId: string,
  input: { name: string; description: string | null; is_default: boolean; items: TemplateItemInput[] }
): Promise<ActionResult> {
  try {
    const access = await requireTeamAccess()
    if (!access.ok) return { success: false, error: access.message }
    const name = input.name.trim()
    if (!name) return { success: false, error: 'Template name is required' }

    const items = cleanItems(input.items)
    if (items.length === 0) return { success: false, error: 'Add at least one section' }

    if (input.is_default) {
      await access.db.from('review_templates').update({ is_default: false }).neq('id', templateId)
    }

    const { error: tplError } = await access.db
      .from('review_templates')
      .update({
        name: name.slice(0, 120),
        description: input.description?.trim() || null,
        is_default: input.is_default,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
    if (tplError) return { success: false, error: tplError.message }

    const keepIds = items.map((i) => i.id).filter((id): id is string => Boolean(id))
    let removeQuery = access.db.from('review_template_items').delete().eq('template_id', templateId)
    if (keepIds.length > 0) removeQuery = removeQuery.not('id', 'in', `(${keepIds.join(',')})`)
    const { error: removeError } = await removeQuery
    if (removeError) return { success: false, error: removeError.message }

    const existing = items.filter((i) => i.id)
    const fresh = items.filter((i) => !i.id)
    if (existing.length > 0) {
      const { error } = await access.db
        .from('review_template_items')
        .upsert(existing.map((i) => ({ ...i, template_id: templateId })), { onConflict: 'id' })
      if (error) return { success: false, error: error.message }
    }
    if (fresh.length > 0) {
      const { error } = await access.db
        .from('review_template_items')
        .insert(fresh.map(({ id: _id, ...i }) => ({ ...i, template_id: templateId })))
      if (error) return { success: false, error: error.message }
    }

    revalidatePath(TEMPLATES_PATH)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function duplicateReviewTemplateAction(templateId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const access = await requireTeamAccess()
    if (!access.ok) return { success: false, error: access.message }

    const { data: tpl } = await access.db
      .from('review_templates')
      .select('name, description, review_template_items(page_name, section_name, kind, team_note, sort_order)')
      .eq('id', templateId)
      .single()
    if (!tpl) return { success: false, error: 'Template not found' }

    const { data: created, error } = await access.db
      .from('review_templates')
      .insert({ name: `${tpl.name} (copy)`.slice(0, 120), description: tpl.description, created_by: access.userId })
      .select('id')
      .single()
    if (error || !created) return { success: false, error: error?.message ?? 'Could not duplicate template' }

    const items = (tpl.review_template_items ?? []) as {
      page_name: string
      section_name: string
      kind: string
      team_note: string | null
      sort_order: number
    }[]
    if (items.length > 0) {
      const { error: itemsError } = await access.db
        .from('review_template_items')
        .insert(items.map((i) => ({ ...i, template_id: created.id })))
      if (itemsError) return { success: false, error: itemsError.message }
    }

    revalidatePath(TEMPLATES_PATH)
    return { success: true, data: { id: created.id } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function deleteReviewTemplateAction(templateId: string): Promise<ActionResult> {
  try {
    const access = await requireTeamAccess()
    if (!access.ok) return { success: false, error: access.message }

    const { error } = await access.db.from('review_templates').delete().eq('id', templateId)
    if (error) return { success: false, error: error.message }

    revalidatePath(TEMPLATES_PATH)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

/** Copies a review's current pages/sections into a new template. */
export async function saveReviewAsTemplateAction(
  reviewId: string,
  name: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const access = await requireTeamAccess()
    if (!access.ok) return { success: false, error: access.message }
    const trimmed = name.trim()
    if (!trimmed) return { success: false, error: 'Template name is required' }

    const { data: review } = await access.db
      .from('website_reviews')
      .select('client_id, website_review_items(page_name, section_name, kind, team_note, sort_order)')
      .eq('id', reviewId)
      .single()
    if (!review) return { success: false, error: 'Review not found' }

    const { data: created, error } = await access.db
      .from('review_templates')
      .insert({ name: trimmed.slice(0, 120), created_by: access.userId })
      .select('id')
      .single()
    if (error || !created) return { success: false, error: error?.message ?? 'Could not create template' }

    const items = (review.website_review_items ?? []) as {
      page_name: string
      section_name: string
      kind: string
      team_note: string | null
      sort_order: number
    }[]
    if (items.length > 0) {
      const { error: itemsError } = await access.db
        .from('review_template_items')
        .insert(items.map((i) => ({ ...i, template_id: created.id })))
      if (itemsError) return { success: false, error: itemsError.message }
    }

    await logActivity({
      entityType: 'client',
      entityId: review.client_id,
      clientId: review.client_id,
      action: 'review_template_created',
      description: `Saved website review as template "${trimmed}"`,
    })
    revalidatePath(TEMPLATES_PATH)
    return { success: true, data: { id: created.id } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function saveReviewSettingsAction(input: ReviewSettings): Promise<ActionResult> {
  try {
    const access = await requireTeamAccess()
    if (!access.ok) return { success: false, error: access.message }

    const value = normalizeReviewSettings(input)
    if (value.walkthrough_video_url && !/^https?:\/\//i.test(value.walkthrough_video_url)) {
      return { success: false, error: 'Walkthrough video must be a full https:// link' }
    }

    const { error } = await access.db
      .from('settings')
      .upsert({ key: REVIEW_SETTINGS_KEY, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) return { success: false, error: error.message }

    revalidatePath(TEMPLATES_PATH)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
