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

function joinedTeamUser(value: unknown): {
  id: string
  full_name: string | null
  is_active: boolean
} | null {
  if (!value) return null
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== 'object') return null
  const record = row as { id?: string; full_name?: string | null; is_active?: boolean }
  if (!record.id) return null
  return {
    id: record.id,
    full_name: record.full_name ?? null,
    is_active: record.is_active === true,
  }
}

export async function authenticateCursorRequest(req: Request): Promise<CursorAuth> {
  const authHeader = req.headers.get('authorization')
  const headerToken = req.headers.get('x-appdoers-api-token')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  const token = (headerToken ?? bearerToken ?? '').trim()

  if (!token) return { error: 'Missing API token', status: 401 }

  const service = await createServiceClient()
  const { data, error } = await service
    .from('cursor_api_tokens')
    .select('id, name, team_user_id, team_users!inner(id, full_name, is_active)')
    .eq('token_hash', hashApiToken(token))
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) return { error: 'Invalid API token', status: 401 }

  const teamUser = joinedTeamUser(data.team_users)
  if (!teamUser?.is_active) {
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
