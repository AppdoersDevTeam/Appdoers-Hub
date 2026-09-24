import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { hashApiToken } from '@/lib/cursor-workflow'
import { requireTeamAccess } from '@/lib/supabase/route-access'

function makeToken() {
  return `apd_${randomBytes(24).toString('hex')}`
}

export async function GET() {
  const access = await requireTeamAccess()
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status })
  }

  const { data, error } = await access.db
    .from('cursor_api_tokens')
    .select('id, name, team_user_id, is_active, last_used_at, created_at')
    .eq('team_user_id', access.userId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tokens: data ?? [] })
}

export async function POST(req: Request) {
  const access = await requireTeamAccess()
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status })
  }

  const body = (await req.json().catch(() => ({}))) as { name?: string }
  const name = (body.name ?? '').trim()
  if (!name) {
    return NextResponse.json({ error: 'Token name is required' }, { status: 400 })
  }

  const token = makeToken()
  const tokenHash = hashApiToken(token)

  const { error } = await access.db.from('cursor_api_tokens').insert({
    name,
    token_hash: tokenHash,
    team_user_id: access.userId,
    created_by: access.userId,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    token,
    message: 'Store this token securely. It is only shown once.',
  })
}
