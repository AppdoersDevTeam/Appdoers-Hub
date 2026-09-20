import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { hashIntakeToken } from '@/lib/intake/token'
import { mergeIntakeAnswers, validateIntakeAnswers, type IntakeStatus } from '@/lib/intake/types'
import { applyIntakeToClient } from '@/lib/intake/apply'
import { notifyIntakeSubmitted } from '@/lib/intake/notify'
import { clientIp, rateLimitHit } from '@/lib/intake/rate-limit'

const ANSWERS_MAX_BYTES = 200_000

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const tokenHash = hashIntakeToken(token.trim())
  if (rateLimitHit(`intake-get:${clientIp(req.headers)}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const service = await createServiceClient()

  const { data: intake } = await service
    .from('client_intakes')
    .select('status, answers, clients(company_name, location, website)')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (!intake) return NextResponse.json({ error: 'This intake link is invalid.' }, { status: 404 })

  const client = Array.isArray(intake.clients) ? intake.clients[0] : intake.clients
  const answers = mergeIntakeAnswers(intake.answers)
  if (!answers.people.company_name) answers.people.company_name = client?.company_name ?? ''
  if (!answers.people.location) answers.people.location = client?.location ?? ''
  if (!answers.domain.current_site && client?.website) {
    answers.domain.current_site = client.website
    answers.domain.has_current_site = 'yes'
  }

  return NextResponse.json({
    status: intake.status as IntakeStatus,
    locked: intake.status === 'locked',
    company_name: client?.company_name ?? answers.people.company_name,
    answers,
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const tokenHash = hashIntakeToken(token.trim())
  if (rateLimitHit(`intake-post:${tokenHash}:${clientIp(req.headers)}`, 8, 10 * 60_000)) {
    return NextResponse.json({ error: 'Please wait before submitting again.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const rawAnswers = body && typeof body === 'object' ? (body as { answers?: unknown }).answers : null
  if (JSON.stringify(rawAnswers ?? {}).length > ANSWERS_MAX_BYTES) {
    return NextResponse.json({ error: 'Form is too large to save.' }, { status: 413 })
  }

  const answers = mergeIntakeAnswers(rawAnswers)
  const validationError = validateIntakeAnswers(answers)
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  const service = await createServiceClient()

  const { data: intake } = await service
    .from('client_intakes')
    .select('id, status, client_id, submitted_at, clients(company_name, slack_channel_id)')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (!intake) return NextResponse.json({ error: 'This intake link is invalid.' }, { status: 404 })
  if (intake.status === 'locked') return NextResponse.json({ error: 'This intake is closed.' }, { status: 403 })

  const isUpdate = intake.status === 'submitted' || intake.status === 'updated'
  const now = new Date().toISOString()
  const nextStatus = isUpdate ? 'updated' : 'submitted'

  const { error } = await service
    .from('client_intakes')
    .update({
      answers,
      status: nextStatus,
      submitted_at: intake.submitted_at ?? now,
      last_submitted_at: now,
      updated_at: now,
    })
    .eq('id', intake.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    await applyIntakeToClient(intake.client_id, answers)
  } catch (err) {
    console.error('[Intake] apply failed:', err)
    return NextResponse.json({ error: 'Saved the form but could not update the client record.' }, { status: 500 })
  }

  const client = Array.isArray(intake.clients) ? intake.clients[0] : intake.clients
  try {
    await notifyIntakeSubmitted({
      clientId: intake.client_id,
      companyName: answers.people.company_name || client?.company_name || 'Client',
      slackChannelId: client?.slack_channel_id ?? null,
      answers,
      isUpdate,
    })
  } catch (err) {
    console.error('[Intake] Slack notify failed:', err)
  }

  return NextResponse.json({ ok: true, status: nextStatus, isUpdate })
}
