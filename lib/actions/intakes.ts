'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logActivity } from './activity'
import { INTAKE_STATUS_LABELS, type IntakeStatus } from '@/lib/intake/types'
import { hashIntakeToken, intakePublicUrl, makeIntakeToken } from '@/lib/intake/token'

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string }

export type IntakeSummary = {
  id: string
  status: IntakeStatus
  share_token: string
  url: string
  submitted_at: string | null
  last_submitted_at: string | null
  locked_at: string | null
  created_at: string
}

function toSummary(row: {
  id: string
  status: string
  share_token: string
  submitted_at: string | null
  last_submitted_at: string | null
  locked_at: string | null
  created_at: string
}): IntakeSummary {
  return {
    id: row.id,
    status: row.status as IntakeStatus,
    share_token: row.share_token,
    url: intakePublicUrl(row.share_token),
    submitted_at: row.submitted_at,
    last_submitted_at: row.last_submitted_at,
    locked_at: row.locked_at,
    created_at: row.created_at,
  }
}

export async function createOrReuseClientIntakeAction(
  clientId: string
): Promise<ActionResult<IntakeSummary & { created: boolean }>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const service = await createServiceClient()
    const { data: client } = await service.from('clients').select('id, company_name').eq('id', clientId).single()
    if (!client) return { success: false, error: 'Client not found' }

    const { data: active } = await service
      .from('client_intakes')
      .select('id, status, share_token, submitted_at, last_submitted_at, locked_at, created_at')
      .eq('client_id', clientId)
      .neq('status', 'locked')
      .order('created_at', { ascending: false })
      .maybeSingle()

    if (active) return { success: true, data: { ...toSummary(active), created: false } }

    const token = makeIntakeToken()
    const { data: created, error } = await service
      .from('client_intakes')
      .insert({
        client_id: clientId,
        token_hash: hashIntakeToken(token),
        share_token: token,
        status: 'sent',
        answers: {},
        created_by: user.id,
      })
      .select('id, status, share_token, submitted_at, last_submitted_at, locked_at, created_at')
      .single()

    if (error || !created) return { success: false, error: error?.message ?? 'Could not create intake' }

    await logActivity({
      entityType: 'client',
      entityId: clientId,
      clientId,
      action: 'intake_created',
      description: `Kickoff intake link created for ${client.company_name}`,
    })
    revalidatePath(`/app/clients/${clientId}`)
    return { success: true, data: { ...toSummary(created), created: true } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function lockClientIntakeAction(
  intakeId: string,
  clientId: string
): Promise<ActionResult<IntakeSummary>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const service = await createServiceClient()
    const { data, error } = await service
      .from('client_intakes')
      .update({
        status: 'locked',
        locked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', intakeId)
      .eq('client_id', clientId)
      .select('id, status, share_token, submitted_at, last_submitted_at, locked_at, created_at')
      .single()

    if (error || !data) return { success: false, error: error?.message ?? 'Could not lock intake' }

    await logActivity({
      entityType: 'client',
      entityId: clientId,
      clientId,
      action: 'intake_locked',
      description: 'Kickoff intake locked',
    })
    revalidatePath(`/app/clients/${clientId}`)
    return { success: true, data: toSummary(data) }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export function intakeStatusLabel(status: IntakeStatus) {
  return INTAKE_STATUS_LABELS[status]
}
