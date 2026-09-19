import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireTeamAccess } from '@/lib/supabase/route-access'
import { logActivity } from '@/lib/actions/activity'
import {
  DOCUMENT_BUCKET,
  DOCUMENT_MAX_SIZE,
  folderForKind,
  isAllowedDocument,
  statusesForKind,
  tableForKind,
  type DocumentKind,
} from '@/lib/documents'

function parseKind(value: FormDataEntryValue | null): DocumentKind | null {
  if (value === 'proposal' || value === 'contract') return value
  return null
}

export async function POST(req: NextRequest) {
  try {
    const access = await requireTeamAccess()
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status })
    }

    const formData = await req.formData()
    const file = formData.get('file')
    const kind = parseKind(formData.get('kind'))
    const clientId = String(formData.get('client_id') ?? '').trim()
    const leadId = String(formData.get('lead_id') ?? '').trim()
    const title = String(formData.get('title') ?? '').trim()
    const status = String(formData.get('status') ?? 'sent')
    const isClientVisible = formData.get('is_client_visible') === 'true'

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A PDF or Word document is required' }, { status: 400 })
    }
    if (!kind) {
      return NextResponse.json({ error: 'kind must be proposal or contract' }, { status: 400 })
    }
    if (kind === 'contract' && !clientId) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
    }
    if (kind === 'proposal' && !clientId && !leadId) {
      return NextResponse.json({ error: 'Select a client or a lead' }, { status: 400 })
    }
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (file.size > DOCUMENT_MAX_SIZE) {
      return NextResponse.json({ error: 'File exceeds 50MB limit' }, { status: 413 })
    }
    if (!isAllowedDocument(file)) {
      return NextResponse.json({ error: 'Only PDF and Word documents (.pdf, .doc, .docx) are allowed' }, { status: 400 })
    }
    if (!statusesForKind(kind).includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const ownerPrefix = clientId ? `clients/${clientId}` : `leads/${leadId}`
    const storagePath = `${ownerPrefix}/${folderForKind(kind)}/${timestamp}-${safeName}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const now = new Date().toISOString()

    const { error: storageError } = await access.db.storage
      .from(DOCUMENT_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (storageError) {
      return NextResponse.json({ error: storageError.message }, { status: 500 })
    }

    const table = tableForKind(kind)
    const row: Record<string, unknown> = {
      client_id: clientId || null,
      title,
      status,
      file_name: file.name,
      storage_path: storagePath,
      mime_type: file.type || null,
      file_size: file.size,
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
