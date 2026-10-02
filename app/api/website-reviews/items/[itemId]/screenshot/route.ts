import { NextRequest, NextResponse } from 'next/server'
import { requireTeamAccess } from '@/lib/supabase/route-access'
import { DOCUMENT_BUCKET } from '@/lib/documents'
import { REVIEW_LIMITS, SCREENSHOT_TYPES, reviewStoragePrefix } from '@/lib/website-review/types'

type Body = { step?: string; view?: string; mime_type?: string; file_size?: number; storage_path?: string }

export async function POST(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const access = await requireTeamAccess()
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status })
  const { itemId } = await params

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const view = body.view === 'mobile' ? 'mobile' : 'desktop'
  const column = view === 'mobile' ? 'screenshot_mobile_path' : 'screenshot_path'

  const { data: item } = await access.db
    .from('website_review_items')
    .select('id, review_id, screenshot_path, screenshot_mobile_path, previous_screenshot_path, previous_item_id, website_reviews(client_id)')
    .eq('id', itemId)
    .maybeSingle()
  if (!item) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  const parent = item.website_reviews as { client_id: string } | { client_id: string }[] | null
  const clientId = Array.isArray(parent) ? parent[0]?.client_id : parent?.client_id
  if (!clientId) return NextResponse.json({ error: 'Review not found' }, { status: 404 })
  const folder = `${reviewStoragePrefix(clientId, item.review_id)}screenshots/`

  if (body.step === 'prepare') {
    const mimeType = String(body.mime_type ?? '')
    const fileSize = Number(body.file_size ?? 0)
    if (!SCREENSHOT_TYPES.has(mimeType)) {
      return NextResponse.json({ error: 'Screenshots must be PNG or JPG.' }, { status: 400 })
    }
    if (fileSize <= 0 || fileSize > REVIEW_LIMITS.screenshotMaxBytes) {
      return NextResponse.json({ error: 'Screenshots must be 15MB or smaller.' }, { status: 413 })
    }
    const ext = mimeType === 'image/png' ? 'png' : 'jpg'
    const storagePath = `${folder}${item.id}-${view}-${Date.now()}.${ext}`
    const { data, error } = await access.db.storage.from(DOCUMENT_BUCKET).createSignedUploadUrl(storagePath)
    if (error || !data) return NextResponse.json({ error: error?.message ?? 'Could not start upload' }, { status: 500 })
    return NextResponse.json({ path: storagePath, token: data.token, signedUrl: data.signedUrl })
  }

  if (body.step === 'complete') {
    const storagePath = String(body.storage_path ?? '')
    if (!storagePath.startsWith(`${folder}${item.id}-${view}-`)) {
      return NextResponse.json({ error: 'Invalid upload path' }, { status: 400 })
    }
    const oldPath = item[column] as string | null
    const update: Record<string, unknown> = { [column]: storagePath, updated_at: new Date().toISOString() }
    if (view === 'desktop' && item.previous_item_id) update.updated_since_last_round = true

    const { error } = await access.db.from('website_review_items').update(update).eq('id', item.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Delete the replaced file only if it was uploaded for this review and nothing else points at it.
    if (oldPath && oldPath.startsWith(folder) && oldPath !== storagePath) {
      const checks = await Promise.all(
        ['screenshot_path', 'screenshot_mobile_path', 'previous_screenshot_path'].map((col) =>
          access.db.from('website_review_items').select('id', { count: 'exact', head: true }).eq(col, oldPath)
        )
      )
      if (checks.every((c) => !c.count)) await access.db.storage.from(DOCUMENT_BUCKET).remove([oldPath])
    }

    const { data: signed } = await access.db.storage.from(DOCUMENT_BUCKET).createSignedUrl(storagePath, 3600)
    return NextResponse.json({ ok: true, storage_path: storagePath, url: signed?.signedUrl ?? null })
  }

  return NextResponse.json({ error: 'Unknown upload step' }, { status: 400 })
}
