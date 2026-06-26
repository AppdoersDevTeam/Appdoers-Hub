import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { hashApiToken } from '@/lib/cursor-workflow'

async function authenticateCursorRequest(req: Request) {
  const authHeader = req.headers.get('authorization')
  const headerToken = req.headers.get('x-appdoers-api-token')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  const token = (headerToken ?? bearerToken ?? '').trim()

  if (!token) return { error: 'Missing API token' as const }

  const service = await createServiceClient()
  const { data, error } = await service
    .from('cursor_api_tokens')
    .select('id, name, team_user_id')
    .eq('token_hash', hashApiToken(token))
    .eq('is_active', true)
    .single()

  if (error || !data) return { error: 'Invalid API token' as const }

  await service.from('cursor_api_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)
  return { service, tokenId: data.id, tokenName: data.name, teamUserId: data.team_user_id }
}

export async function GET(req: Request) {
  const auth = await authenticateCursorRequest(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { data: teamUser, error } = await auth.service
    .from('team_users')
    .select('id, full_name, email, role')
    .eq('id', auth.teamUserId)
    .single()

  if (error || !teamUser) {
    return NextResponse.json({ error: 'Team user not found for token' }, { status: 404 })
  }

  return NextResponse.json({
    team_user: {
      id: teamUser.id,
      full_name: teamUser.full_name,
      email: teamUser.email,
      role: teamUser.role,
    },
    token: {
      id: auth.tokenId,
      name: auth.tokenName,
    },
  })
}
