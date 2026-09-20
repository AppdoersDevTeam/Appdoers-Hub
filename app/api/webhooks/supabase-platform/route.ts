import { NextResponse } from 'next/server'
import { sendToChannel } from '@/lib/slack'
import {
  extractWebhookSecret,
  formatSlackAlert,
  parsePlatformEvent,
  secretsMatch,
} from '@/lib/supabase-platform-alerts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function isAuthorized(req: Request): boolean {
  const expected = process.env.SUPABASE_PLATFORM_WEBHOOK_SECRET?.trim() ?? ''
  if (!expected) return false
  return secretsMatch(extractWebhookSecret(req), expected)
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) return unauthorized()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const event = parsePlatformEvent(body)
  if (!event) {
    return NextResponse.json({ error: 'Unrecognized event payload' }, { status: 400 })
  }

  const message = formatSlackAlert(event)
  const result = await sendToChannel('alerts', message.text, message.blocks, { fallback: false })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  return NextResponse.json({ ok: true, type: event.type, test: event.isTest })
}
