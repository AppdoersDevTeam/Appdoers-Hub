'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { hashApiToken } from '@/lib/cursor-workflow'
import { createClient, createServiceClient } from '@/lib/supabase/server'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

export type CursorTokenSummary = {
  id: string
  name: string
  is_active: boolean
  last_used_at: string | null
  created_at: string
}

function makeToken() {
  return `apd_${randomBytes(24).toString('hex')}`
}

async function requireUser(): Promise<
  { user: { id: string } } | { error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  return { user }
}

export async function listMyCursorTokensAction(): Promise<
  ActionResult<CursorTokenSummary[]>
> {
  try {
    const auth = await requireUser()
    if (!('user' in auth)) return { success: false, error: auth.error }

    const service = await createServiceClient()
    const { data, error } = await service
      .from('cursor_api_tokens')
      .select('id, name, is_active, last_used_at, created_at')
      .eq('team_user_id', auth.user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []) as CursorTokenSummary[] }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function createCursorTokenAction(
  name: string
): Promise<ActionResult<{ token: string; name: string }>> {
  try {
    const auth = await requireUser()
    if (!('user' in auth)) return { success: false, error: auth.error }

    const tokenName = name.trim()
    if (!tokenName) return { success: false, error: 'Token name is required' }

    const token = makeToken()
    const service = await createServiceClient()
    const { error } = await service.from('cursor_api_tokens').insert({
      name: tokenName,
      token_hash: hashApiToken(token),
      team_user_id: auth.user.id,
      created_by: auth.user.id,
    })

    if (error) return { success: false, error: error.message }

    revalidatePath('/app/account')
    return { success: true, data: { token, name: tokenName } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function revokeCursorTokenAction(
  tokenId: string
): Promise<ActionResult<undefined>> {
  try {
    const auth = await requireUser()
    if (!('user' in auth)) return { success: false, error: auth.error }

    const service = await createServiceClient()
    const { error } = await service
      .from('cursor_api_tokens')
      .update({ is_active: false })
      .eq('id', tokenId)
      .eq('team_user_id', auth.user.id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/app/account')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
