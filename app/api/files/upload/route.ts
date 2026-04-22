import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'client-files'
const MAX_SIZE = 50 * 1024 * 1024 // 50MB

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const clientId = formData.get('client_id') as string | null
    const projectId = formData.get('project_id') as string | null
    const folder = formData.get('folder') as string | null
    const isClientVisible = formData.get('is_client_visible') === 'true'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!clientId) return NextResponse.json({ error: 'client_id required' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File exceeds 50MB limit' }, { status: 413 })

    // Build storage path: clients/{clientId}/{folder?}/{timestamp}-{filename}
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const folderSegment = folder ? `${folder}/` : ''
    const storagePath = `clients/${clientId}/${folderSegment}${timestamp}-${safeName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (storageError) {
      return NextResponse.json({ error: storageError.message }, { status: 500 })
    }

    // Insert DB record
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert({
        client_id: clientId,
        project_id: projectId || null,
        name: file.name,
        storage_path: storagePath,
        size: file.size,
        mime_type: file.type || null,
        folder: folder || null,
        is_client_visible: isClientVisible,
        uploaded_by: user.id,
      })
      .select('id, name, size, mime_type, folder, is_client_visible, created_at')
      .single()

    if (dbError) {
      // Clean up storage if DB insert fails
      await supabase.storage.from(BUCKET).remove([storagePath])
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, file: fileRecord })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
