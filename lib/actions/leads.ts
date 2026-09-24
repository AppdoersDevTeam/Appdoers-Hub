'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { logActivity } from './activity'
import {
  addChannelBookmark,
  buildLeadChannelCanvasMarkdown,
  createChannelCanvas,
  createPublicChannel,
  findPublicChannelByName,
  hubClientUrl,
  hubLeadUrl,
  joinPublicChannel,
  postToSlackChannel,
  sendSlackAlert,
  setChannelPurpose,
  slackOpenHub,
  slugifyLeadChannelName,
  withHttpUrl,
} from '@/lib/slack'
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS } from '@/lib/leads/constants'
import { outcomeAtForStatus } from '@/lib/leads/outcome-at'
import type { CompanySize, LeadSource, LeadStatus, LostReason } from '@/lib/types/database'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

function emptyToNull(value?: string | null): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export interface CreateLeadInput {
  contact_name: string
  company_name?: string
  email?: string
  phone?: string
  website?: string
  location?: string
  industry?: string
  company_size?: CompanySize | ''
  contact_role?: string
  service_interest?: string[]
  budget_notes?: string
  needed_by?: string
  timeline_notes?: string
  source: LeadSource
  referral_name?: string
  estimated_setup_fee?: number | null
  estimated_monthly?: number | null
  assigned_to?: string
  next_action?: string
  next_action_date?: string
}

function leadRowFromInput(input: CreateLeadInput | Partial<CreateLeadInput>, forUpdate: boolean) {
  const row: Record<string, unknown> = {}

  const setText = (key: string, value?: string | null) => {
    if (forUpdate && value === undefined) return
    row[key] = emptyToNull(value)
  }

  if (!forUpdate || input.contact_name !== undefined) {
    row.contact_name = input.contact_name?.trim()
  }

  setText('company_name', input.company_name)
  setText('email', input.email)
  setText('phone', input.phone)
  setText('website', input.website)
  setText('location', input.location)
  setText('industry', input.industry)
  setText('contact_role', input.contact_role)
  setText('budget_notes', input.budget_notes)
  setText('timeline_notes', input.timeline_notes)
  setText('next_action', input.next_action)
  setText('referral_name', input.referral_name)

  if (!forUpdate || input.company_size !== undefined) {
    row.company_size = emptyToNull(input.company_size)
  }
  if (!forUpdate || input.needed_by !== undefined) {
    row.needed_by = emptyToNull(input.needed_by)
  }
  if (!forUpdate || input.next_action_date !== undefined) {
    row.next_action_date = emptyToNull(input.next_action_date)
  }
  if (!forUpdate || input.assigned_to !== undefined) {
    row.assigned_to = emptyToNull(input.assigned_to)
  }
  if (!forUpdate || input.source !== undefined) {
    row.source = input.source
  }
  if (!forUpdate || input.service_interest !== undefined) {
    row.service_interest =
      input.service_interest && input.service_interest.length > 0
        ? input.service_interest
        : null
  }
  if (!forUpdate || input.estimated_setup_fee !== undefined) {
    row.estimated_setup_fee = input.estimated_setup_fee ?? null
  }
  if (!forUpdate || input.estimated_monthly !== undefined) {
    row.estimated_monthly = input.estimated_monthly ?? null
  }

  return row
}

// ─── Create Lead ──────────────────────────────────────────────────────────────

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
        ...leadRowFromInput(input, false),
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

    const updates = leadRowFromInput(input, true)
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
        input.estimated_setup_fee !== undefined
          ? input.estimated_setup_fee ?? 0
          : current?.estimated_setup_fee ?? 0
      const monthly =
        input.estimated_monthly !== undefined
          ? input.estimated_monthly ?? 0
          : current?.estimated_monthly ?? 0
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
      .select('contact_name, company_name, status, outcome_at')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('leads')
      .update({
        status,
        outcome_at: outcomeAtForStatus(status, lead?.status, lead?.outcome_at),
      })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    const name = lead
      ? `${lead.contact_name}${lead.company_name ? ` (${lead.company_name})` : ''}`
      : id

    await logActivity({
      entityType: 'lead',
      entityId: id,
      action: 'status_changed',
      description: `Lead "${name}" status → ${LEAD_STATUS_LABELS[status]}`,
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
      .select('contact_name, company_name, estimated_value, status, outcome_at')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('leads')
      .update({
        status: 'lost',
        lost_reason: reason,
        lost_notes: notes ?? null,
        outcome_at: outcomeAtForStatus('lost', lead?.status, lead?.outcome_at),
      })
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

    await sendSlackAlert('leads', {
      text: `Lead lost: ${name}`,
      title: 'Lead lost',
      fields: [
        { label: 'Lead', value: name },
        { label: 'Reason', value: reason.replace('_', ' ') },
      ],
      body: notes ?? null,
      bodyLabel: notes ? 'Notes' : undefined,
      action: slackOpenHub(hubLeadUrl(id)),
    })

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
      .select('contact_name, company_name, estimated_value, status, outcome_at')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('leads')
      .update({
        status: 'won',
        outcome_at: outcomeAtForStatus('won', lead?.status, lead?.outcome_at),
      })
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

    await sendSlackAlert('leads', {
      text: `Lead won: ${name}`,
      title: 'Lead won',
      fields: [
        { label: 'Lead', value: name },
        ...(lead?.estimated_value
          ? [{ label: 'Est. value', value: `$${lead.estimated_value.toLocaleString()}` }]
          : []),
      ],
      action: slackOpenHub(hubLeadUrl(id)),
    })

    revalidatePath(`/app/leads/${id}`)
    revalidatePath('/app/leads')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Slack channel ────────────────────────────────────────────────────────────

export async function createLeadSlackChannelAction(
  leadId: string
): Promise<ActionResult<{ channelName: string; warning?: string }>> {
  try {
    const supabase = await createSupabaseClient()
    const { data: lead, error } = await supabase
      .from('leads')
      .select(
        'id, contact_name, company_name, website, status, source, slack_channel_id, slack_channel_name, slack_canvas_id'
      )
      .eq('id', leadId)
      .single()

    if (error || !lead) return { success: false, error: 'Lead not found.' }

    if (lead.slack_channel_id && lead.slack_channel_name) {
      return { success: true, data: { channelName: lead.slack_channel_name } }
    }

    const displayName = lead.company_name || lead.contact_name
    const name = slugifyLeadChannelName(displayName, lead.id)
    let channel = await createPublicChannel(name)
    if (!channel.ok && channel.code === 'name_taken') {
      channel = await findPublicChannelByName(name)
    }
    if (!channel.ok) return { success: false, error: channel.error }

    await joinPublicChannel(channel.id)

    const statusLabel = LEAD_STATUS_LABELS[lead.status as LeadStatus] ?? lead.status
    const sourceLabel = LEAD_SOURCE_LABELS[lead.source as LeadSource] ?? lead.source
    const hubUrl = hubLeadUrl(lead.id)
    const warnings: string[] = []

    const purpose = await setChannelPurpose(
      channel.id,
      `${displayName} · lead · internal only`
    )
    if (!purpose.ok) warnings.push(purpose.error)

    let canvasId = lead.slack_canvas_id as string | null
    if (!canvasId) {
      const canvas = await createChannelCanvas(
        channel.id,
        buildLeadChannelCanvasMarkdown({
          displayName,
          contactName: lead.contact_name,
          statusLabel,
          sourceLabel,
          website: lead.website,
          hubUrl,
        })
      )
      if (canvas.ok) {
        canvasId = canvas.canvasId
      } else if (canvas.code !== 'channel_canvas_already_exists') {
        warnings.push(canvas.error)
      }
    }

    const hubBookmark = await addChannelBookmark(channel.id, 'Open in Hub', hubUrl)
    if (!hubBookmark.ok && hubBookmark.code !== 'already_exists') {
      warnings.push(hubBookmark.error)
    }

    if (lead.website) {
      const siteBookmark = await addChannelBookmark(
        channel.id,
        'Website',
        withHttpUrl(lead.website)
      )
      if (!siteBookmark.ok && siteBookmark.code !== 'already_exists') {
        warnings.push(siteBookmark.error)
      }
    }

    const welcome = await postToSlackChannel(
      channel.id,
      `This is the internal channel for lead ${displayName}. Use it for back-and-forth about this opportunity.\n\n• Todos and a short brief live in the channel canvas (top right)\n• Pipeline status stays in Hub\n• Do not invite the prospect`
    )
    if (!welcome.ok) warnings.push(welcome.error)

    const { error: updateError } = await supabase
      .from('leads')
      .update({
        slack_channel_id: channel.id,
        slack_channel_name: channel.name,
        slack_canvas_id: canvasId,
      })
      .eq('id', leadId)

    if (updateError) return { success: false, error: updateError.message }

    await logActivity({
      entityType: 'lead',
      entityId: leadId,
      action: 'slack_channel_created',
      description: `Slack channel #${channel.name} created`,
    })

    revalidatePath(`/app/leads/${leadId}`)
    return {
      success: true,
      data: {
        channelName: channel.name,
        ...(warnings[0] ? { warning: warnings[0] } : {}),
      },
    }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Convert to Client ────────────────────────────────────────────────────────

export async function convertLeadToClientAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createSupabaseClient()

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (leadError || !lead) return { success: false, error: 'Lead not found' }

  if (lead.converted_client_id) {
    return { success: true, data: { id: lead.converted_client_id } }
  }

  const companyName = lead.company_name || lead.contact_name

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      company_name: companyName,
      industry: lead.industry,
      website: lead.website,
      location: lead.location,
      subscription_plan: 'none',
      billing_cycle: 'monthly',
      monthly_fee: lead.estimated_monthly ?? 0,
      setup_fee: lead.estimated_setup_fee ?? 0,
      payment_terms: 7,
      status: 'active',
      ...(lead.slack_channel_id
        ? {
            slack_channel_id: lead.slack_channel_id,
            slack_channel_name: lead.slack_channel_name,
            slack_canvas_id: lead.slack_canvas_id,
          }
        : {}),
    })
    .select('id')
    .single()

  if (clientError || !client) {
    return { success: false, error: clientError?.message || 'Failed to create client' }
  }

  if (lead.contact_name) {
    await supabase.from('client_contacts').insert({
      client_id: client.id,
      full_name: lead.contact_name,
      email: lead.email || '',
      phone: lead.phone,
      role: lead.contact_role,
      is_primary: true,
      has_portal_access: false,
    })
  }

  const { error: wonError } = await supabase
    .from('leads')
    .update({
      status: 'won',
      converted_client_id: client.id,
      outcome_at: outcomeAtForStatus('won', lead.status, lead.outcome_at),
    })
    .eq('id', id)

  if (wonError) {
    return {
      success: false,
      error: `Client was created, but the lead could not be marked won: ${wonError.message}`,
    }
  }

  await supabase.from('proposals').update({ client_id: client.id }).eq('lead_id', id)

  const name = `${lead.contact_name}${lead.company_name ? ` (${lead.company_name})` : ''}`

  await logActivity({
    entityType: 'lead',
    entityId: id,
    clientId: client.id,
    action: 'converted',
    description: `Lead converted to client — ${companyName}`,
  })

  after(() => {
    void sendSlackAlert('leads', {
      text: `Lead converted to client: ${name}`,
      title: 'Lead converted to client',
      fields: [
        { label: 'Lead', value: name },
        { label: 'Client', value: companyName },
        ...(lead.estimated_value
          ? [{ label: 'Est. value', value: `$${Number(lead.estimated_value).toLocaleString()}` }]
          : []),
      ],
      action: slackOpenHub(hubClientUrl(client.id) || hubLeadUrl(id)),
    })
  })

  revalidatePath('/app/leads')
  revalidatePath(`/app/leads/${id}`)
  revalidatePath('/app/clients')
  revalidatePath(`/app/clients/${client.id}`)
  revalidatePath('/app/dashboard')
  revalidatePath('/app/proposals')
  return { success: true, data: { id: client.id } }
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

export async function deleteLeadAction(id: string): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { data: lead, error: loadError } = await supabase
      .from('leads')
      .select('id, contact_name, company_name')
      .eq('id', id)
      .single()

    if (loadError || !lead) return { success: false, error: 'Lead not found' }

    const { error: unlinkError } = await supabase
      .from('proposals')
      .update({ lead_id: null })
      .eq('lead_id', id)
      .not('client_id', 'is', null)
    if (unlinkError) return { success: false, error: unlinkError.message }

    const { error: proposalDeleteError } = await supabase
      .from('proposals')
      .delete()
      .eq('lead_id', id)
      .is('client_id', null)
    if (proposalDeleteError) return { success: false, error: proposalDeleteError.message }

    await supabase.from('lead_notes').delete().eq('lead_id', id)
    await supabase.from('notes').delete().eq('entity_type', 'lead').eq('entity_id', id)

    const name = `${lead.contact_name}${lead.company_name ? ` (${lead.company_name})` : ''}`
    await logActivity({
      entityType: 'lead',
      entityId: id,
      action: 'deleted',
      description: `Lead "${name}" deleted`,
    })

    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) return { success: false, error: error.message }

    revalidatePath('/app/leads')
    revalidatePath('/app/clients')
    revalidatePath('/app/proposals')
    revalidatePath('/app/dashboard')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
