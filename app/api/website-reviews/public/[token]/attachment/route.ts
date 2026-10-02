import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { DOCUMENT_BUCKET, isAllowedDocument } from '@/lib/documents'
import { clientIp, rateLimitHit } from '@/lib/intake/rate-limit'
import { findReviewByToken } from '@/lib/website-review/public'
import {
  ATTACHMENT_TYPES,
  CLIENT_EDITABLE_STATUSES,
  REVIEW_LIMITS,
  normalizeAttachments,
  reviewStoragePrefix,
  safeFileName,
  type ReviewStatus,
} from '@/lib/website-review/types'

type Body = {
  step?: string
  item_id?: string
  file_name?: string
  mime_type?: string
  file_size?: number
  storage_path?: string
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (rateLimitHit(`review-attach:${clientIp(req.headers)}`, 60, 60 * 60_000)) {
    return NextResponse.json({ error: 'Too many uploads. Please try again later.' }, { status: 429 })
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const db = await createServiceClient()
  const review = await findReviewByToken(db, token)
  if (!review) return NextResponse.json({ error: 'This review link is invalid.' }, { status: 404 })
  if (!CLIENT_EDITABLE_STATUSES.includes(review.status as ReviewStatus)) {
    return NextResponse.json({ error: 'This review has already been sent.' }, { status: 403 })
  }

  const { data: item } = await db
    .from('website_review_items')
    .select('id, client_attachments')
    .eq('id', String(body.item_id ?? ''))
    .eq('review_id', review.id)
    .maybeSingle()
  if (!item) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  const attachments = normalizeAttachments(item.client_attachments)
  const folder = `${reviewStoragePrefix(review.client_id, review.id)}attachments/${item.id}/`
  const fileName = safeFileName(String(body.file_name ?? 'file'))

  if (body.step === 'prepare') {
    const mimeType = String(body.mime_type ?? '')
    const fileSize = Number(body.file_size ?? 0)
    if (attachments.length >= REVIEW_LIMITS.attachmentsPerItem) {
      return NextResponse.json({ error: `You can add up to ${REVIEW_LIMITS.attachmentsPerItem} files here.` }, { status: 400 })
    }
    if (!ATTACHMENT_TYPES.has(mimeType) && !isAllowedDocument({ name: fileName, type: mimeType })) {
      return NextResponse.json({ error: 'Please upload a photo, PDF or Word document.' }, { status: 400 })
    }
    if (fileSize <= 0 || fileSize > REVIEW_LIMITS.attachmentMaxBytes) {
      return NextResponse.json({ error: 'Each file must be 10MB or smaller.' }, { status: 413 })
    }
    const storagePath = `${folder}${Date.now()}-${fileName}`
    const { data, error } = await db.storage.from(DOCUMENT_BUCKET).createSignedUploadUrl(storagePath)
    if (error || !data) return NextResponse.json({ error: 'Could not start the upload.' }, { status: 500 })
    return NextResponse.json({ path: storagePath, token: data.token, signedUrl: data.signedUrl })
  }

  if (body.step === 'complete') {
    const storagePath = String(body.storage_path ?? '')
    if (!storagePath.startsWith(folder)) return NextResponse.json({ error: 'Invalid upload path' }, { status: 400 })
    if (attachments.some((a) => a.path === storagePath)) return NextResponse.json({ ok: true, attachments })
    const next = [...attachments, { path: storagePath, name: fileName, size: Number(body.file_size ?? 0) || 0 }].slice(
      0,
      REVIEW_LIMITS.attachmentsPerItem
    )
    const { error } = await db
      .from('website_review_items')
      .update({ client_attachments: next, updated_at: new Date().toISOString() })
      .eq('id', item.id)
    if (error) return NextResponse.json({ error: 'Could not save the file.' }, { status: 500 })
    return NextResponse.json({ ok: true, attachments: next })
  }

  if (body.step === 'remove') {
    const storagePath = String(body.storage_path ?? '')
    if (!attachments.some((a) => a.path === storagePath)) return NextResponse.json({ error: 'File not found' }, { status: 404 })
    const next = attachments.filter((a) => a.path !== storagePath)
    const { error } = await db
      .from('website_review_items')
      .update({ client_attachments: next, updated_at: new Date().toISOString() })
      .eq('id', item.id)
    if (error) return NextResponse.json({ error: 'Could not remove the file.' }, { status: 500 })
    await db.storage.from(DOCUMENT_BUCKET).remove([storagePath])
    return NextResponse.json({ ok: true, attachments: next })
  }

  return NextResponse.json({ error: 'Unknown upload step' }, { status: 400 })
}
