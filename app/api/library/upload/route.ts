import { NextRequest, NextResponse } from 'next/server'
import { requireTeamAccess } from '@/lib/supabase/route-access'
import { logActivity } from '@/lib/actions/activity'
import { revalidatePath } from 'next/cache'
import {
  DOCUMENT_BUCKET,
  DOCUMENT_MAX_SIZE,
  isAllowedDocument,
} from '@/lib/documents'
import {
  buildLibraryStoragePath,
  LIBRARY_STORAGE_PREFIX,
  parseLibraryKind,
  titleFromFileName,
} from '@/lib/library/constants'

interface UploadBody {
  step?: string
  item_id?: string
  kind?: string
  title?: string
  summary?: string
  body?: string
  file_name?: string
  mime_type?: string
  file_size?: number
  storage_path?: string
}

function emptyToNull(value?: string | null): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
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

    const kind = parseLibraryKind(body.kind)
    const itemId = String(body.item_id ?? '').trim()
    const fileName = String(body.file_name ?? '').trim()
    const mimeType = String(body.mime_type ?? '')
    const fileSize = Number(body.file_size ?? 0)
    const title = String(body.title ?? '').trim() || titleFromFileName(fileName)

    if (!kind) {
      return NextResponse.json({ error: 'Type must be document, template, or workflow' }, { status: 400 })
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

    if (body.step === 'prepare') {
      const storagePath = buildLibraryStoragePath(fileName)
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
    if (!storagePath.startsWith(LIBRARY_STORAGE_PREFIX)) {
      return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 })
    }

    const { error: existsError } = await access.db.storage
      .from(DOCUMENT_BUCKET)
      .createSignedUrl(storagePath, 10)
    if (existsError) {
      return NextResponse.json({ error: 'File was not uploaded. Please try again.' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const fileFields = {
      file_name: fileName,
      storage_path: storagePath,
      mime_type: mimeType || null,
      file_size: fileSize || null,
    }

    if (itemId) {
      const { data: existing, error: loadError } = await access.db
        .from('hub_library_items')
        .select('id, title, kind, storage_path')
        .eq('id', itemId)
        .maybeSingle()

      if (loadError) {
        await access.db.storage.from(DOCUMENT_BUCKET).remove([storagePath])
        return NextResponse.json({ error: loadError.message }, { status: 500 })
      }
      if (!existing) {
        await access.db.storage.from(DOCUMENT_BUCKET).remove([storagePath])
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }

      const { data: record, error: dbError } = await access.db
        .from('hub_library_items')
        .update({
          ...fileFields,
          kind,
          title,
          summary: emptyToNull(body.summary),
          updated_by: access.userId,
          updated_at: now,
        })
        .eq('id', itemId)
        .select('id, file_name, mime_type, file_size')
        .single()

      if (dbError || !record) {
        await access.db.storage.from(DOCUMENT_BUCKET).remove([storagePath])
        return NextResponse.json({ error: dbError?.message ?? 'Failed to update item' }, { status: 500 })
      }

      if (existing.storage_path && existing.storage_path !== storagePath) {
        await access.db.storage.from(DOCUMENT_BUCKET).remove([existing.storage_path])
      }

      await logActivity({
        entityType: 'library',
        entityId: record.id,
        action: 'updated',
        description: `File attached to ${kind} "${title}"`,
      })

      revalidatePath('/app/library')
      revalidatePath(`/app/library/${record.id}`)
      return NextResponse.json({ success: true, item: record })
    }

    const { data: record, error: dbError } = await access.db
      .from('hub_library_items')
      .insert({
        kind,
        title,
        summary: emptyToNull(body.summary),
        body: String(body.body ?? '').trim(),
        ...fileFields,
        created_by: access.userId,
        updated_by: access.userId,
      })
      .select('id, file_name, mime_type, file_size')
      .single()

    if (dbError || !record) {
      await access.db.storage.from(DOCUMENT_BUCKET).remove([storagePath])
      return NextResponse.json({ error: dbError?.message ?? 'Failed to save item' }, { status: 500 })
    }

    await logActivity({
      entityType: 'library',
      entityId: record.id,
      action: 'created',
      description: `${kind} "${title}" uploaded to Library`,
    })

    revalidatePath('/app/library')
    return NextResponse.json({ success: true, item: record })
  } catch (err) {
    console.error('Library upload error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
