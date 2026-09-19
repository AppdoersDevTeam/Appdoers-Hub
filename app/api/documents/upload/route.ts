import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireTeamAccess } from '@/lib/supabase/route-access'
import { logActivity } from '@/lib/actions/activity'
import {
  DOCUMENT_BUCKET,
  DOCUMENT_MAX_SIZE,
  buildDocumentStoragePath,
  isAllowedDocument,
  parseDocumentKind,
  statusesForKind,
  tableForKind,
  validateDocumentOwner,
} from '@/lib/documents'

interface UploadBody {
  step?: string
  kind?: string
  client_id?: string
  lead_id?: string
  title?: string
  status?: string
  is_client_visible?: boolean
  file_name?: string
  mime_type?: string
  file_size?: number
  storage_path?: string
}

export async function POST(req: NextRequest) {
  try {
    const access = await requireTeamAccess()
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status })
    }

    let body: UploadBody
    try {
      body = (await req.json()) as UploadBody
    } catch {
      return NextResponse.json({ error: 'Invalid upload request' }, { status: 400 })
    }
    const kind = parseDocumentKind(body.kind)
    const clientId = String(body.client_id ?? '').trim()
    const leadId = String(body.lead_id ?? '').trim()
    const title = String(body.title ?? '').trim()
    const status = String(body.status ?? 'sent')
    const fileName = String(body.file_name ?? '').trim()
    const mimeType = String(body.mime_type ?? '')
    const fileSize = Number(body.file_size ?? 0)
    const isClientVisible = body.is_client_visible === true

    if (!kind) {
      return NextResponse.json({ error: 'kind must be proposal or contract' }, { status: 400 })
    }
    const ownerError = validateDocumentOwner(kind, clientId, leadId)
    if (ownerError) {
      return NextResponse.json({ error: ownerError }, { status: 400 })
    }
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!fileName) {
      return NextResponse.json({ error: 'A PDF or Word document is required' }, { status: 400 })
    }
    if (fileSize > DOCUMENT_MAX_SIZE) {
      return NextResponse.json({ error: 'File exceeds 50MB limit' }, { status: 413 })
    }
    if (!isAllowedDocument({ name: fileName, type: mimeType })) {
      return NextResponse.json({ error: 'Only PDF and Word documents (.pdf, .doc, .docx) are allowed' }, { status: 400 })
    }
    if (!statusesForKind(kind).includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (body.step === 'prepare') {
      const storagePath = buildDocumentStoragePath(kind, clientId, leadId, fileName)
      const { data, error } = await access.db.storage
        .from(DOCUMENT_BUCKET)
        .createSignedUploadUrl(storagePath)

      if (error || !data) {
        return NextResponse.json({ error: error?.message ?? 'Could not start upload' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        path: data.path,
        token: data.token,
        signedUrl: data.signedUrl,
        bucket: DOCUMENT_BUCKET,
      })
    }

    if (body.step !== 'complete') {
      return NextResponse.json({ error: 'Invalid upload step' }, { status: 400 })
    }

    const storagePath = String(body.storage_path ?? '').trim()
    const expectedPrefix = clientId
      ? `clients/${clientId}/${kind === 'proposal' ? 'proposals' : 'contracts'}/`
      : `leads/${leadId}/proposals/`
    if (!storagePath.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 })
    }

    const { error: existsError } = await access.db.storage
      .from(DOCUMENT_BUCKET)
      .createSignedUrl(storagePath, 10)
    if (existsError) {
      return NextResponse.json({ error: 'File was not uploaded. Please try again.' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const table = tableForKind(kind)
    const row: Record<string, unknown> = {
      client_id: clientId || null,
      title,
      status,
      file_name: fileName,
      storage_path: storagePath,
      mime_type: mimeType || null,
      file_size: fileSize || null,
      is_client_visible: Boolean(clientId) && isClientVisible,
      created_by: access.userId,
      sent_at: status === 'draft' ? null : now,
    }

    if (kind === 'proposal') {
      row.lead_id = leadId || null
      row.version = 1
      row.sections = []
      row.total_setup = 0
      row.total_monthly = 0
    } else {
      row.content = {}
      row.signed_at = status === 'signed' ? now : null
    }

    const { data: record, error: dbError } = await access.db
      .from(table)
      .insert(row)
      .select()
      .single()

    if (dbError || !record) {
      await access.db.storage.from(DOCUMENT_BUCKET).remove([storagePath])
      return NextResponse.json({ error: dbError?.message ?? 'Failed to save record' }, { status: 500 })
    }

    await logActivity({
      entityType: kind,
      entityId: record.id,
      clientId: clientId || null,
      action: 'created',
      description: `${kind === 'proposal' ? 'Proposal' : 'Contract'} "${title}" uploaded`,
    })

    const listPath = kind === 'proposal' ? '/app/proposals' : '/app/contracts'
    const portalPath = kind === 'proposal' ? '/portal/proposals' : '/portal/contracts'
    revalidatePath(listPath)
    revalidatePath(portalPath)
    if (clientId) revalidatePath(`/app/clients/${clientId}`)
    if (leadId) revalidatePath(`/app/leads/${leadId}`)

    return NextResponse.json({ success: true, document: record })
  } catch (err) {
    console.error('Document upload error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
