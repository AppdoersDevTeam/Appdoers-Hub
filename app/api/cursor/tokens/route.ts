import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { hashApiToken } from '@/lib/cursor-workflow'

function makeToken() {
  return `apd_${randomBytes(24).toString('hex')}`
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = await createServiceClient()
  const { data, error } = await service
    .from('cursor_api_tokens')
    .select('id, name, team_user_id, is_active, last_used_at, created_at')
    .eq('team_user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tokens: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as { name?: string }
  const name = (body.name ?? '').trim()
  if (!name) {
    return NextResponse.json({ error: 'Token name is required' }, { status: 400 })
  }

  const token = makeToken()
  const tokenHash = hashApiToken(token)
  const service = await createServiceClient()

  const { error } = await service.from('cursor_api_tokens').insert({
    name,
    token_hash: tokenHash,
    team_user_id: user.id,
    created_by: user.id,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    token,
    message: 'Store this token securely. It is only shown once.',
  })
}
