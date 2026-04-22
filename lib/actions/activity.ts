'use server'

import { createClient } from '@/lib/supabase/server'

interface LogActivityParams {
  entityType: string
  entityId: string
  clientId?: string | null
  action: string
  description: string
}

export async function logActivity(params: LogActivityParams) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase.from('activity_log').insert({
      entity_type: params.entityType,
      entity_id: params.entityId,
      client_id: params.clientId ?? null,
      action: params.action,
      description: params.description,
      performed_by: user?.id ?? null,
    })
  } catch (err) {
    console.error('[Activity] Log error:', err)
  }
}
