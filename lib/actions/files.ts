'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient, createServiceClient } from '@/lib/supabase/server'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

const BUCKET = 'client-files'

// ─── Get Signed Download URL ──────────────────────────────────────────────────

export async function getFileDownloadUrlAction(
  fileId: string
): Promise<ActionResult<{ url: string; name: string }>> {
  try {
    const supabase = await createSupabaseClient()

    const { data: file } = await supabase
      .from('files')
      .select('storage_path, name')
      .eq('id', fileId)
      .single()

    if (!file) return { success: false, error: 'File not found' }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(file.storage_path, 300) // 5 min expiry

    if (error || !data) return { success: false, error: error?.message ?? 'Could not generate URL' }

    return { success: true, data: { url: data.signedUrl, name: file.name } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Toggle Client Visibility ─────────────────────────────────────────────────

export async function toggleFileVisibilityAction(
  fileId: string,
  isVisible: boolean
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { error } = await supabase
      .from('files')
      .update({ is_client_visible: isVisible })
      .eq('id', fileId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/app/files')
    revalidatePath('/app/clients')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Delete File ──────────────────────────────────────────────────────────────

export async function deleteFileAction(
  fileId: string,
  clientId: string
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const service = await createServiceClient()

    const { data: file } = await supabase
      .from('files')
      .select('storage_path')
      .eq('id', fileId)
      .single()

    if (!file) return { success: false, error: 'File not found' }

    // Delete from storage
    await service.storage.from(BUCKET).remove([file.storage_path])

    // Delete from DB
    const { error } = await supabase.from('files').delete().eq('id', fileId)
    if (error) return { success: false, error: error.message }

    revalidatePath('/app/files')
    revalidatePath(`/app/clients/${clientId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Update File Name / Folder ────────────────────────────────────────────────

export async function updateFileAction(
  fileId: string,
  updates: { name?: string; folder?: string }
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { error } = await supabase.from('files').update(updates).eq('id', fileId)
    if (error) return { success: false, error: error.message }
    revalidatePath('/app/files')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Get Portal File Download URL ─────────────────────────────────────────────

export async function getPortalFileDownloadUrlAction(
  fileId: string
): Promise<ActionResult<{ url: string; name: string }>> {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Verify this file belongs to the user's client and is visible
    const { data: contact } = await supabase
      .from('client_contacts')
      .select('client_id')
      .eq('portal_user_id', user?.id ?? '')
      .single()

    if (!contact) return { success: false, error: 'Unauthorized' }

    const { data: file } = await supabase
      .from('files')
      .select('storage_path, name')
      .eq('id', fileId)
      .eq('client_id', contact.client_id)
      .eq('is_client_visible', true)
      .single()

    if (!file) return { success: false, error: 'File not found or not accessible' }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(file.storage_path, 300)

    if (error || !data) return { success: false, error: error?.message ?? 'Could not generate URL' }

    return { success: true, data: { url: data.signedUrl, name: file.name } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
