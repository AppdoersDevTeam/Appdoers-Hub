import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

type AccessDenied = { ok: false; status: 401 | 403; message: string }
type TeamAccess = { ok: true; db: SupabaseClient; userId: string }
type PortalAccess = { ok: true; db: SupabaseClient; userId: string; clientId: string }

export async function requireTeamAccess(): Promise<TeamAccess | AccessDenied> {
  const auth = await createClient()
  const {
    data: { user },
  } = await auth.auth.getUser()

  if (!user) {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }

  const { data: teamUser } = await auth
    .from('team_users')
    .select('id')
    .eq('id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!teamUser) {
    return { ok: false, status: 403, message: 'Forbidden' }
  }

  const db = await createServiceClient()
  return { ok: true, db, userId: user.id }
}

export async function requirePortalAccess(): Promise<PortalAccess | AccessDenied> {
  const auth = await createClient()
  const {
    data: { user },
  } = await auth.auth.getUser()

  if (!user) {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }

  const { data: contact } = await auth
    .from('client_contacts')
    .select('client_id')
    .eq('portal_user_id', user.id)
    .eq('has_portal_access', true)
    .maybeSingle()

  if (!contact?.client_id) {
    return { ok: false, status: 403, message: 'Forbidden' }
  }

  const db = await createServiceClient()
  return { ok: true, db, userId: user.id, clientId: contact.client_id }
}
