'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function addNoteAction(
  entityType: string,
  entityId: string,
  content: string,
  type?: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!content.trim()) return { success: false, error: 'Note content is required' }

    const { data, error } = await supabase
      .from('notes')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        author_id: user?.id,
        type: type ?? 'general',
        content: content.trim(),
      })
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath(`/app/clients/${entityId}`)
    revalidatePath(`/app/leads/${entityId}`)
    revalidatePath(`/app/projects/${entityId}`)
    return { success: true, data: { id: data.id } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function deleteNoteAction(
  noteId: string,
  entityType: string,
  entityId: string
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { error } = await supabase.from('notes').delete().eq('id', noteId)
    if (error) return { success: false, error: error.message }
    revalidatePath(`/app/${entityType}s/${entityId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
