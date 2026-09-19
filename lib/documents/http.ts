import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requirePortalAccess, requireTeamAccess } from '@/lib/supabase/route-access'
import {
  DOCUMENT_LABEL,
  DOCUMENT_TABLE,
  type DocumentKind,
} from '@/lib/documents/constants'
import {
  buildDocumentStoragePath,
  createDocumentSignedUrl,
  removeDocumentBytes,
  uploadDocumentBytes,
} from '@/lib/documents/storage'
import { titleFromFileName, validateUploadedDocument } from '@/lib/documents/validate'

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export async function handleDocumentUpload(req: NextRequest, kind: DocumentKind) {
  const access = await requireTeamAccess()
  if (!access.ok) {
    return jsonError(access.message, access.status)
  }

  const formData = await req.formData()
  const file = formData.get('file')
  const clientId = String(formData.get('client_id') ?? '').trim()
  const titleInput = String(formData.get('title') ?? '').trim()
  const shareWithClient = formData.get('is_client_visible') === 'true'

  if (!(file instanceof File)) return jsonError('A PDF or Word document is required', 400)
  if (!clientId) return jsonError('Select a client', 400)

  const validationError = validateUploadedDocument(file)
  if (validationError) return jsonError(validationError, 400)

  const { data: client, error: clientError } = await access.db
    .from('clients')
    .select('id, company_name')
    .eq('id', clientId)
    .maybeSingle()

  if (clientError || !client) return jsonError('Client not found', 400)

  const title = titleInput || titleFromFileName(file.name)
  const storagePath = buildDocumentStoragePath(kind, clientId, file.name)
  const buffer = Buffer.from(await file.arrayBuffer())

  const uploaded = await uploadDocumentBytes(
    access.db,
    storagePath,
    buffer,
    file.type || 'application/octet-stream'
  )
  if (uploaded.error) return jsonError(uploaded.error, 500)

  const now = new Date().toISOString()
  const insert =
    kind === 'proposal'
      ? {
          client_id: clientId,
          title,
          version: 1,
          status: shareWithClient ? 'sent' : 'draft',
          sections: [],
          total_setup: 0,
          total_monthly: 0,
          sent_at: shareWithClient ? now : null,
          created_by: access.userId,
          file_storage_path: storagePath,
          file_name: file.name,
          file_size: file.size,
          file_mime_type: file.type || null,
          is_client_visible: shareWithClient,
        }
      : {
          client_id: clientId,
          title,
          status: shareWithClient ? 'sent' : 'draft',
          content: [],
          sent_at: shareWithClient ? now : null,
          created_by: access.userId,
          file_storage_path: storagePath,
          file_name: file.name,
          file_size: file.size,
          file_mime_type: file.type || null,
          is_client_visible: shareWithClient,
        }

  const { data: record, error: insertError } = await access.db
    .from(DOCUMENT_TABLE[kind])
    .insert(insert)
    .select(
      'id, title, status, created_at, sent_at, client_id, file_name, file_size, file_mime_type, is_client_visible'
    )
    .single()

  if (insertError || !record) {
    await removeDocumentBytes(access.db, storagePath)
    return jsonError(insertError?.message ?? 'Failed to save document', 500)
  }

  await access.db.from('activity_log').insert({
    entity_type: kind,
    entity_id: record.id,
    client_id: clientId,
    action: 'created',
    description: `${DOCUMENT_LABEL[kind]} "${title}" uploaded for ${client.company_name}`,
    performed_by: access.userId,
  })

  const listPath = kind === 'proposal' ? '/app/proposals' : '/app/contracts'
  revalidatePath(listPath)
  revalidatePath(`/app/clients/${clientId}`)
  if (shareWithClient) {
    revalidatePath(kind === 'proposal' ? '/portal/proposals' : '/portal/contracts')
  }

  return NextResponse.json({
    success: true,
    document: {
      ...record,
      client_name: client.company_name,
    },
  })
}

export async function handleDocumentDownload(id: string, kind: DocumentKind) {
  const team = await requireTeamAccess()
  let db = team.ok ? team.db : null
  let clientIdFilter: string | null = null

  if (!team.ok) {
    const portal = await requirePortalAccess()
    if (!portal.ok) {
      return jsonError(portal.message, portal.status)
    }
    db = portal.db
    clientIdFilter = portal.clientId
  }

  if (!db) return jsonError('Unauthorized', 401)

  let query = db
    .from(DOCUMENT_TABLE[kind])
    .select('file_storage_path, file_name, is_client_visible, client_id')
    .eq('id', id)

  if (clientIdFilter) {
    query = query.eq('client_id', clientIdFilter).eq('is_client_visible', true)
  }

  const { data: row, error } = await query.maybeSingle()
  if (error || !row?.file_storage_path) {
    return jsonError('Document file not found', 404)
  }

  const signed = await createDocumentSignedUrl(
    db,
    row.file_storage_path as string,
    (row.file_name as string | null) ?? undefined
  )
  if ('error' in signed) return jsonError(signed.error, 500)

  return NextResponse.redirect(signed.url)
}
