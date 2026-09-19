'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient, createServiceClient } from '@/lib/supabase/server'
import { logActivity } from './activity'
import {
  DOCUMENT_BUCKET,
  statusesForKind,
  tableForKind,
  type DocumentKind,
} from '@/lib/documents'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

function revalidateDocumentPaths(kind: DocumentKind, clientId?: string | null) {
  const listPath = kind === 'proposal' ? '/app/proposals' : '/app/contracts'
  const portalPath = kind === 'proposal' ? '/portal/proposals' : '/portal/contracts'
  revalidatePath(listPath)
  revalidatePath(portalPath)
  if (clientId) revalidatePath(`/app/clients/${clientId}`)
}

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

      if (!contact || contact.client_id !== doc.client_id || !doc.is_client_visible) {
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
    const now = new Date().toISOString()
    const updates: Record<string, string | null> = { status }

    if (status === 'draft') {
      updates.sent_at = null
      if (kind === 'contract') updates.signed_at = null
    } else if (status === 'signed' && kind === 'contract') {
      updates.sent_at = now
      updates.signed_at = now
    } else {
      updates.sent_at = now
      if (kind === 'contract') updates.signed_at = null
    }

    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select('client_id')
      .maybeSingle()

    if (error) return { success: false, error: error.message }
    revalidateDocumentPaths(kind, data?.client_id)
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
      .select('client_id')
      .maybeSingle()

    if (error) return { success: false, error: error.message }
    revalidateDocumentPaths(kind, data?.client_id)
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
      .select('storage_path, client_id, title')
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

    revalidateDocumentPaths(kind, doc.client_id)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
