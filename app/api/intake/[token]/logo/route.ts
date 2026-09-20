import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { hashIntakeToken } from '@/lib/intake/token'
import { mergeIntakeAnswers } from '@/lib/intake/types'
import { clientIp, rateLimitHit } from '@/lib/intake/rate-limit'

const BUCKET = 'client-files'
const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'logo.png'
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const tokenHash = hashIntakeToken(token.trim())
  const ip = clientIp(req.headers)
  if (rateLimitHit(`intake-logo:${tokenHash}:${ip}`, 20, 60 * 60_000)) {
    return NextResponse.json({ error: 'Too many uploads' }, { status: 429 })
  }

  const service = createAdminClient()
  if (!service) {
    return NextResponse.json({ error: 'Upload is unavailable' }, { status: 500 })
  }

  const { data: intake } = await service
    .from('client_intakes')
    .select('id, status, client_id, answers')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (!intake) return NextResponse.json({ error: 'This intake link is invalid.' }, { status: 404 })
  if (intake.status === 'locked') {
    return NextResponse.json({ error: 'This intake is closed.' }, { status: 403 })
  }

  let body: {
    step?: string
    file_name?: string
    mime_type?: string
    file_size?: number
    storage_path?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const fileName = safeFileName(String(body.file_name ?? 'logo.png'))
  const mimeType = String(body.mime_type ?? '')
  const fileSize = Number(body.file_size ?? 0)

  if (body.step === 'prepare') {
    if (!ALLOWED_TYPES.has(mimeType)) {
      return NextResponse.json({ error: 'Please upload a PNG, JPG, WEBP, or SVG logo.' }, { status: 400 })
    }
    if (fileSize > MAX_SIZE) {
      return NextResponse.json({ error: 'Logo must be 5MB or smaller.' }, { status: 413 })
    }
    const storagePath = `intake/${intake.client_id}/${intake.id}/${Date.now()}-${fileName}`
    const { data, error } = await service.storage.from(BUCKET).createSignedUploadUrl(storagePath)
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Could not start upload' }, { status: 500 })
    }
    return NextResponse.json({
      path: storagePath,
      token: data.token,
      signedUrl: data.signedUrl,
    })
  }

  if (body.step === 'complete') {
    const storagePath = String(body.storage_path ?? '')
    if (!storagePath.startsWith(`intake/${intake.client_id}/${intake.id}/`)) {
      return NextResponse.json({ error: 'Invalid upload path' }, { status: 400 })
    }
    const answers = mergeIntakeAnswers(intake.answers)
    answers.brand.logo_mode = 'upload'
    answers.brand.logo_path = storagePath
    answers.brand.logo_name = fileName
    await service
      .from('client_intakes')
      .update({ answers, updated_at: new Date().toISOString() })
      .eq('id', intake.id)
    return NextResponse.json({ ok: true, storage_path: storagePath, file_name: fileName })
  }

  return NextResponse.json({ error: 'Unknown upload step' }, { status: 400 })
}
