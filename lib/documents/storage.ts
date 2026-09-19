import type { SupabaseClient } from '@supabase/supabase-js'
import {
  DOCUMENT_BUCKET,
  DOCUMENT_FOLDER,
  type DocumentKind,
} from './constants'

export function buildDocumentStoragePath(
  kind: DocumentKind,
  clientId: string,
  fileName: string
): string {
  const timestamp = Date.now()
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `clients/${clientId}/${DOCUMENT_FOLDER[kind]}/${timestamp}-${safeName}`
}

export async function uploadDocumentBytes(
  supabase: SupabaseClient,
  storagePath: string,
  buffer: Buffer,
  contentType: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.storage.from(DOCUMENT_BUCKET).upload(storagePath, buffer, {
    contentType: contentType || 'application/octet-stream',
    upsert: false,
  })
  return { error: error?.message ?? null }
}

export async function removeDocumentBytes(
  supabase: SupabaseClient,
  storagePath: string | null | undefined
): Promise<void> {
  if (!storagePath) return
  await supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath])
}

export async function createDocumentSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  downloadName?: string
): Promise<{ url: string } | { error: string }> {
  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(storagePath, 120, downloadName ? { download: downloadName } : undefined)

  if (error || !data?.signedUrl) {
    return { error: error?.message ?? 'Could not generate download URL' }
  }

  return { url: data.signedUrl }
}
