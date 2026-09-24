'use server'

import { createClient as createSupabaseClient, createServiceClient } from '@/lib/supabase/server'
import { logActivity } from './activity'
import { revalidateDocumentPaths } from '@/lib/documents/revalidate'
import {
  DOCUMENT_BUCKET,
  documentStatusTimestamps,
  statusesForKind,
  tableForKind,
  validateDocumentOwner,
  type DocumentKind,
} from '@/lib/documents'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function getDocumentDownloadUrlAction(
  kind: DocumentKind,
  id: string
): Promise<ActionResult<{ url: string; name: string }>> {
  try {
    const supabase = await createSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const table = tableForKind(kind)
    const { data: doc } = await supabase
      .from(table)
      .select('storage_path, file_name, title, client_id, is_client_visible')
      .eq('id', id)
      .maybeSingle()

    if (!doc?.storage_path) return { success: false, error: 'No file uploaded for this record' }

    const { data: teamUser } = await supabase
      .from('team_users')
      .select('id')
      .eq('id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!teamUser) {
      const { data: contact } = await supabase
        .from('client_contacts')
        .select('client_id')
        .eq('portal_user_id', user.id)
        .eq('has_portal_access', true)
        .maybeSingle()

      if (!contact || !doc.client_id || contact.client_id !== doc.client_id || !doc.is_client_visible) {
        return { success: false, error: 'File not found or not accessible' }
      }
    }

    const service = await createServiceClient()
    const { data, error } = await service.storage
      .from(DOCUMENT_BUCKET)
      .createSignedUrl(doc.storage_path, 300)

    if (error || !data) {
      return { success: false, error: error?.message ?? 'Could not generate download URL' }
    }

    return {
      success: true,
      data: { url: data.signedUrl, name: doc.file_name || `${doc.title}.pdf` },
    }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function updateDocumentStatusAction(
  kind: DocumentKind,
  id: string,
  status: string
): Promise<ActionResult<undefined>> {
  try {
    if (!statusesForKind(kind).includes(status)) {
      return { success: false, error: 'Invalid status' }
    }

    const supabase = await createSupabaseClient()
    const table = tableForKind(kind)
    const updates = documentStatusTimestamps(kind, status)

    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) return { success: false, error: error.message }
    revalidateDocumentPaths(kind, data?.client_id, data?.lead_id ?? null)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function toggleDocumentVisibilityAction(
  kind: DocumentKind,
  id: string,
  isVisible: boolean
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const table = tableForKind(kind)
    const { data, error } = await supabase
      .from(table)
      .update({ is_client_visible: isVisible })
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) return { success: false, error: error.message }
    revalidateDocumentPaths(kind, data?.client_id, data?.lead_id ?? null)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function updateDocumentAction(
  kind: DocumentKind,
  id: string,
  input: {
    title: string
    status: string
    is_client_visible: boolean
    client_id: string
    lead_id: string
  }
): Promise<ActionResult<undefined>> {
  try {
    const title = input.title.trim()
    const clientId = input.client_id.trim()
    const leadId = input.lead_id.trim()
    const ownerError = validateDocumentOwner(kind, clientId, leadId)
    if (ownerError) return { success: false, error: ownerError }
    if (!title) return { success: false, error: 'Title is required' }
    if (!statusesForKind(kind).includes(input.status)) {
      return { success: false, error: 'Invalid status' }
    }

    const supabase = await createSupabaseClient()
    const table = tableForKind(kind)
    const { data: existing, error: loadError } = await supabase
      .from(table)
      .select()
      .eq('id', id)
      .maybeSingle()

    if (loadError) return { success: false, error: loadError.message }
    if (!existing) return { success: false, error: 'Record not found' }

    const updates: Record<string, unknown> = {
      title,
      client_id: clientId || null,
      is_client_visible: Boolean(clientId) && input.is_client_visible,
    }
    if (kind === 'proposal') updates.lead_id = leadId || null
    if (input.status !== existing.status) {
      Object.assign(updates, documentStatusTimestamps(kind, input.status))
    }

    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) return { success: false, error: error.message }

    await logActivity({
      entityType: kind,
      entityId: id,
      clientId: clientId || null,
      action: 'updated',
      description: `${kind === 'proposal' ? 'Proposal' : 'Contract'} "${title}" updated`,
    })

    revalidateDocumentPaths(kind, existing.client_id, existing.lead_id ?? null)
    revalidateDocumentPaths(kind, data?.client_id, data?.lead_id ?? null)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function deleteDocumentAction(
  kind: DocumentKind,
  id: string
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const service = await createServiceClient()
    const table = tableForKind(kind)

    const { data: doc } = await supabase
      .from(table)
      .select()
      .eq('id', id)
      .maybeSingle()

    if (!doc) return { success: false, error: 'Record not found' }

    if (doc.storage_path) {
      await service.storage.from(DOCUMENT_BUCKET).remove([doc.storage_path])
    }

    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) return { success: false, error: error.message }

    await logActivity({
      entityType: kind,
      entityId: id,
      clientId: doc.client_id,
      action: 'deleted',
      description: `${kind === 'proposal' ? 'Proposal' : 'Contract'} "${doc.title}" deleted`,
    })

    revalidateDocumentPaths(kind, doc.client_id, doc.lead_id ?? null)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
