import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildClientWeeklyDigest } from '@/lib/client-weekly-digest'
import { postToSlackChannel } from '@/lib/slack'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${secret}`
}

async function runDigest() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, company_name, slack_channel_id')
    .not('slack_channel_id', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let posted = 0
  let skipped = 0
  const failures: { clientId: string; error: string }[] = []

  for (const client of clients ?? []) {
    if (!client.slack_channel_id) {
      skipped += 1
      continue
    }

    try {
      const digest = await buildClientWeeklyDigest(supabase, client)
      if (!digest) {
        skipped += 1
        continue
      }
      const result = await postToSlackChannel(client.slack_channel_id, digest.text, digest.blocks)
      if (!result.ok) {
        failures.push({ clientId: client.id, error: result.error })
        continue
      }
      posted += 1
    } catch (err) {
      failures.push({ clientId: client.id, error: String(err) })
    }
  }

  return NextResponse.json({
    ok: failures.length === 0,
    posted,
    skipped,
    failures,
  })
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return unauthorized()
  return runDigest()
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) return unauthorized()
  return runDigest()
}
