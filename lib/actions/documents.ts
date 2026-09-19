'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient, createServiceClient } from '@/lib/supabase/server'
import { logActivity } from './activity'
import { DOCUMENT_LABEL, DOCUMENT_TABLE, type DocumentKind } from '@/lib/documents/constants'
import { removeDocumentBytes } from '@/lib/documents/storage'

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

export async function deleteDocumentAction(
  kind: DocumentKind,
  id: string
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const table = DOCUMENT_TABLE[kind]
    const { data: row, error: fetchError } = await supabase
      .from(table)
      .select('id, title, client_id, file_storage_path')
      .eq('id', id)
      .single()

    if (fetchError || !row) return { success: false, error: 'Document not found' }

    const service = await createServiceClient()
    await removeDocumentBytes(service, row.file_storage_path as string | null)

    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) return { success: false, error: error.message }

    await logActivity({
      entityType: kind,
      entityId: id,
      clientId: row.client_id as string,
      action: 'deleted',
      description: `${DOCUMENT_LABEL[kind]} "${row.title as string}" deleted`,
    })

    revalidateDocumentPaths(kind, row.client_id as string)
    return { success: true, data: undefined }
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
    const supabase = await createSupabaseClient()
    const table = DOCUMENT_TABLE[kind]
    const updates: Record<string, unknown> = { status }

    if (status === 'sent') {
      updates.sent_at = new Date().toISOString()
      updates.is_client_visible = true
    }
    if (kind === 'contract' && status === 'signed') {
      updates.signed_at = new Date().toISOString()
    }
    if (kind === 'proposal' && status === 'approved') {
      updates.approved_at = new Date().toISOString()
    }

    const { data: row, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select('client_id, title')
      .single()

    if (error) return { success: false, error: error.message }

    await logActivity({
      entityType: kind,
      entityId: id,
      clientId: (row?.client_id as string) ?? null,
      action: 'updated',
      description: `${DOCUMENT_LABEL[kind]} "${(row?.title as string) ?? id}" marked ${status}`,
    })

    revalidateDocumentPaths(kind, (row?.client_id as string) ?? null)
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
    const table = DOCUMENT_TABLE[kind]
    const updates: Record<string, unknown> = { is_client_visible: isVisible }
    if (isVisible) {
      updates.status = 'sent'
      updates.sent_at = new Date().toISOString()
    }

    const { data: row, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select('client_id, title')
      .single()

    if (error) return { success: false, error: error.message }

    revalidateDocumentPaths(kind, (row?.client_id as string) ?? null)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
