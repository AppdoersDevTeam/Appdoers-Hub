'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { logActivity } from './activity'
import { sendSlackMessage } from '@/lib/slack'
import type { LeadSource, LeadStatus, LostReason } from '@/lib/types/database'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

// ─── Create Lead ──────────────────────────────────────────────────────────────

export interface CreateLeadInput {
  contact_name: string
  company_name?: string
  email?: string
  phone?: string
  source: LeadSource
  referral_name?: string
  estimated_setup_fee?: number
  estimated_monthly?: number
  assigned_to?: string
  next_action?: string
  next_action_date?: string
}

export async function createLeadAction(
  input: CreateLeadInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createSupabaseClient()

    const estimated_value =
      (input.estimated_setup_fee ?? 0) +
      (input.estimated_monthly ?? 0) * 12

    const { data, error } = await supabase
      .from('leads')
      .insert({
        ...input,
        status: 'new' as LeadStatus,
        estimated_value: estimated_value || null,
      })
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }

    await logActivity({
      entityType: 'lead',
      entityId: data.id,
      action: 'created',
      description: `Lead "${input.contact_name}${input.company_name ? ` (${input.company_name})` : ''}" created`,
    })

    revalidatePath('/app/leads')
    return { success: true, data: { id: data.id } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Update Lead ──────────────────────────────────────────────────────────────

export async function updateLeadAction(
  id: string,
  input: Partial<CreateLeadInput>
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()

    const updates: Record<string, unknown> = { ...input }
    if (
      input.estimated_setup_fee !== undefined ||
      input.estimated_monthly !== undefined
    ) {
      const { data: current } = await supabase
        .from('leads')
        .select('estimated_setup_fee, estimated_monthly')
        .eq('id', id)
        .single()

      const setup =
        input.estimated_setup_fee ?? current?.estimated_setup_fee ?? 0
      const monthly =
        input.estimated_monthly ?? current?.estimated_monthly ?? 0
      updates.estimated_value = setup + monthly * 12
    }

    const { error } = await supabase.from('leads').update(updates).eq('id', id)
    if (error) return { success: false, error: error.message }

    revalidatePath(`/app/leads/${id}`)
    revalidatePath('/app/leads')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Update Status ────────────────────────────────────────────────────────────

export async function updateLeadStatusAction(
  id: string,
  status: LeadStatus
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()

    const { data: lead } = await supabase
      .from('leads')
      .select('contact_name, company_name')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    const name = lead
      ? `${lead.contact_name}${lead.company_name ? ` (${lead.company_name})` : ''}`
      : id

    await logActivity({
      entityType: 'lead',
      entityId: id,
      action: 'status_changed',
      description: `Lead "${name}" status → ${status.replace('_', ' ')}`,
    })

    revalidatePath(`/app/leads/${id}`)
    revalidatePath('/app/leads')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Mark Lost ────────────────────────────────────────────────────────────────

export async function markLeadLostAction(
  id: string,
  reason: LostReason,
  notes?: string
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()

    const { data: lead } = await supabase
      .from('leads')
      .select('contact_name, company_name, estimated_value')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('leads')
      .update({ status: 'lost', lost_reason: reason, lost_notes: notes ?? null })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    const name = lead
      ? `${lead.contact_name}${lead.company_name ? ` (${lead.company_name})` : ''}`
      : id

    await logActivity({
      entityType: 'lead',
      entityId: id,
      action: 'lead_lost',
      description: `Lead "${name}" marked lost — reason: ${reason}`,
    })

    await sendSlackMessage(`❌ Lead Lost: ${name}`, [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*❌ Lead Lost*\n*Lead:* ${name}\n*Reason:* ${reason.replace('_', ' ')}\n${notes ? `*Notes:* ${notes}` : ''}`,
        },
      },
    ])

    revalidatePath(`/app/leads/${id}`)
    revalidatePath('/app/leads')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Mark Won ─────────────────────────────────────────────────────────────────

export async function markLeadWonAction(id: string): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()

    const { data: lead } = await supabase
      .from('leads')
      .select('contact_name, company_name, estimated_value')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('leads')
      .update({ status: 'won' })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    const name = lead
      ? `${lead.contact_name}${lead.company_name ? ` (${lead.company_name})` : ''}`
      : id

    await logActivity({
      entityType: 'lead',
      entityId: id,
      action: 'lead_won',
      description: `Lead "${name}" marked won! 🎉`,
    })

    await sendSlackMessage(`🎉 Lead Won: ${name}`, [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🎉 Lead Won!*\n*Lead:* ${name}\n${lead?.estimated_value ? `*Est. Value:* $${lead.estimated_value.toLocaleString()}` : ''}`,
        },
      },
    ])

    revalidatePath(`/app/leads/${id}`)
    revalidatePath('/app/leads')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Convert to Client ────────────────────────────────────────────────────────

export async function convertLeadToClientAction(id: string): Promise<void> {
  const supabase = await createSupabaseClient()

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (leadError || !lead) throw new Error('Lead not found')

  // Create client
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      company_name: lead.company_name || lead.contact_name,
      subscription_plan: 'none',
      monthly_fee: lead.estimated_monthly ?? 0,
      setup_fee: lead.estimated_setup_fee ?? 0,
      payment_terms: 7,
      status: 'active',
    })
    .select('id')
    .single()

  if (clientError || !client) throw new Error('Failed to create client')

  // Create primary contact from lead
  if (lead.contact_name) {
    await supabase.from('client_contacts').insert({
      client_id: client.id,
      full_name: lead.contact_name,
      email: lead.email,
      phone: lead.phone,
      is_primary: true,
      has_portal_access: false,
    })
  }

  // Link lead to client
  await supabase
    .from('leads')
    .update({ status: 'won', converted_client_id: client.id })
    .eq('id', id)

  await logActivity({
    entityType: 'lead',
    entityId: id,
    clientId: client.id,
    action: 'converted',
    description: `Lead converted to client — ${lead.company_name || lead.contact_name}`,
  })

  revalidatePath('/app/leads')
  revalidatePath('/app/clients')
  redirect(`/app/clients/${client.id}`)
}

// ─── Lead Notes ───────────────────────────────────────────────────────────────

export async function addLeadNoteAction(
  leadId: string,
  content: string,
  type: 'general' | 'call' | 'meeting' | 'email'
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from('lead_notes').insert({
      lead_id: leadId,
      content,
      type,
      author_id: user?.id,
    })

    if (error) return { success: false, error: error.message }

    revalidatePath(`/app/leads/${leadId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
