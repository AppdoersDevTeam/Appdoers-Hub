'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { logActivity } from './activity'
import {
  isValidLibraryLink,
  parseLibraryKind,
  type LibraryKind,
} from '@/lib/library/constants'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface LibraryItemInput {
  kind: LibraryKind
  title: string
  summary?: string
  body?: string
  link_url?: string
}

function emptyToNull(value?: string | null): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

async function requireTeamUser() {
  const supabase = await createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, error: 'Unauthorized' as const, userId: null }

  const { data: teamUser } = await supabase
    .from('team_users')
    .select('id')
    .eq('id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!teamUser) return { supabase, error: 'Unauthorized' as const, userId: null }
  return { supabase, error: null, userId: user.id }
}

function validateInput(input: LibraryItemInput): string | null {
  if (!parseLibraryKind(input.kind)) return 'Type must be document, template, or workflow'
  if (!input.title?.trim()) return 'Title is required'
  if (input.link_url !== undefined && input.link_url.trim() && !isValidLibraryLink(input.link_url.trim())) {
    return 'Link must be a valid http or https URL'
  }
  return null
}

export async function createLibraryItemAction(
  input: LibraryItemInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, error: authError, userId } = await requireTeamUser()
    if (authError || !userId) return { success: false, error: authError ?? 'Unauthorized' }

    const validationError = validateInput(input)
    if (validationError) return { success: false, error: validationError }

    const { data, error } = await supabase
      .from('hub_library_items')
      .insert({
        kind: input.kind,
        title: input.title.trim(),
        summary: emptyToNull(input.summary),
        body: input.body?.trim() ?? '',
        link_url: emptyToNull(input.link_url),
        created_by: userId,
        updated_by: userId,
      })
      .select('id')
      .single()

    if (error || !data) return { success: false, error: error?.message ?? 'Could not create item' }

    await logActivity({
      entityType: 'library',
      entityId: data.id,
      action: 'created',
      description: `${input.kind} "${input.title.trim()}" added to Library`,
    })

    revalidatePath('/app/library')
    return { success: true, data: { id: data.id } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function updateLibraryItemAction(
  id: string,
  input: LibraryItemInput
): Promise<ActionResult<undefined>> {
  try {
    const { supabase, error: authError, userId } = await requireTeamUser()
    if (authError || !userId) return { success: false, error: authError ?? 'Unauthorized' }

    const validationError = validateInput(input)
    if (validationError) return { success: false, error: validationError }

    const { error } = await supabase
      .from('hub_library_items')
      .update({
        kind: input.kind,
        title: input.title.trim(),
        summary: emptyToNull(input.summary),
        body: input.body ?? '',
        link_url: emptyToNull(input.link_url),
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    await logActivity({
      entityType: 'library',
      entityId: id,
      action: 'updated',
      description: `${input.kind} "${input.title.trim()}" updated`,
    })

    revalidatePath('/app/library')
    revalidatePath(`/app/library/${id}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function deleteLibraryItemAction(id: string): Promise<ActionResult<undefined>> {
  try {
    const { supabase, error: authError } = await requireTeamUser()
    if (authError) return { success: false, error: authError }

    const { data: item } = await supabase
      .from('hub_library_items')
      .select('id, title, kind')
      .eq('id', id)
      .maybeSingle()

    if (!item) return { success: false, error: 'Item not found' }

    const { error } = await supabase.from('hub_library_items').delete().eq('id', id)
    if (error) return { success: false, error: error.message }

    await logActivity({
      entityType: 'library',
      entityId: id,
      action: 'deleted',
      description: `${item.kind} "${item.title}" deleted from Library`,
    })

    revalidatePath('/app/library')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
