import { createServiceClient } from '@/lib/supabase/server'
import { hashApiToken } from '@/lib/cursor-workflow'

type CursorAuthSuccess = {
  service: Awaited<ReturnType<typeof createServiceClient>>
  teamUserId: string
  teamMemberName: string | null
  tokenId: string
  tokenName: string
}

type CursorAuthFailure = { error: string; status: 401 | 403 }

export type CursorAuth = CursorAuthSuccess | CursorAuthFailure

export async function authenticateCursorRequest(req: Request): Promise<CursorAuth> {
  const authHeader = req.headers.get('authorization')
  const headerToken = req.headers.get('x-appdoers-api-token')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  const token = (headerToken ?? bearerToken ?? '').trim()

  if (!token) return { error: 'Missing API token', status: 401 }

  const service = await createServiceClient()
  // Two-step lookup: cursor_api_tokens has two FKs to team_users (team_user_id +
  // created_by), so an embedded team_users!inner select is ambiguous in PostgREST
  // and fails every request as "Invalid API token".
  const { data, error } = await service
    .from('cursor_api_tokens')
    .select('id, name, team_user_id')
    .eq('token_hash', hashApiToken(token))
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data?.team_user_id) {
    return { error: 'Invalid API token', status: 401 }
  }

  const { data: teamUser, error: teamError } = await service
    .from('team_users')
    .select('id, full_name, is_active')
    .eq('id', data.team_user_id)
    .maybeSingle()

  if (teamError || !teamUser) {
    return { error: 'Invalid API token', status: 401 }
  }

  if (teamUser.is_active !== true) {
    return { error: 'Team member is inactive', status: 403 }
  }

  await service
    .from('cursor_api_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)

  return {
    service,
    teamUserId: teamUser.id,
    teamMemberName: teamUser.full_name?.trim() || null,
    tokenId: data.id,
    tokenName: data.name,
  }
}

export function cursorAuthFailed(auth: CursorAuth): auth is CursorAuthFailure {
  return 'error' in auth
}
