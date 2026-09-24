'use server'

import { revalidatePath } from 'next/cache'
import {
  createClient as createSupabaseClient,
  createServiceClient,
} from '@/lib/supabase/server'
import { logActivity } from './activity'
import { resolveClientPlanDisplayName } from '@/lib/clients/plan-display'
import { buildClientWeeklyDigest } from '@/lib/client-weekly-digest'
import {
  addChannelBookmark,
  buildClientChannelCanvasMarkdown,
  createChannelCanvas,
  createPublicChannel,
  findPublicChannelByName,
  hubClientUrl,
  joinPublicChannel,
  postToSlackChannel,
  setChannelPurpose,
  slugifyClientChannelName,
  withHttpUrl,
} from '@/lib/slack'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

// ─── Clients ─────────────────────────────────────────────────────────────────

export interface CreateClientInput {
  company_name: string
  industry?: string | null
  website?: string | null
  location?: string | null
  subscription_plan: string
  contract_months?: number | null
  plan_service_id?: string | null
  billing_cycle?: 'weekly' | 'monthly' | 'yearly'
  monthly_fee: number
  setup_fee: number
  setup_upfront?: number
  payment_terms: number
  status: 'active' | 'inactive' | 'churned'
}

export async function createClientAction(
  input: CreateClientInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createSupabaseClient()
    const { data, error } = await supabase
      .from('clients')
      .insert(input)
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }

    await logActivity({
      entityType: 'client',
      entityId: data.id,
      clientId: data.id,
      action: 'created',
      description: `Client "${input.company_name}" created`,
    })

    revalidatePath('/app/clients')
    return { success: true, data: { id: data.id } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function updateClientAction(
  id: string,
  input: Partial<CreateClientInput>
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { error } = await supabase.from('clients').update(input).eq('id', id)
    if (error) return { success: false, error: error.message }

    revalidatePath(`/app/clients/${id}`)
    revalidatePath('/app/clients')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export interface CreateContactInput {
  client_id: string
  full_name: string
  email: string
  phone?: string
  role?: string
  is_primary: boolean
}

export async function createContactAction(
  input: CreateContactInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createSupabaseClient()

    if (input.is_primary) {
      await supabase
        .from('client_contacts')
        .update({ is_primary: false })
        .eq('client_id', input.client_id)
        .eq('is_primary', true)
    }

    const { data, error } = await supabase
      .from('client_contacts')
      .insert({ ...input, has_portal_access: false })
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }

    await logActivity({
      entityType: 'client_contact',
      entityId: data.id,
      clientId: input.client_id,
      action: 'contact_created',
      description: `Contact "${input.full_name}" added`,
    })

    revalidatePath(`/app/clients/${input.client_id}`)
    return { success: true, data: { id: data.id } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function updateContactAction(
  contactId: string,
  clientId: string,
  input: Partial<CreateContactInput>
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()

    if (input.is_primary) {
      await supabase
        .from('client_contacts')
        .update({ is_primary: false })
        .eq('client_id', clientId)
        .eq('is_primary', true)
    }

    const { error } = await supabase
      .from('client_contacts')
      .update(input)
      .eq('id', contactId)

    if (error) return { success: false, error: error.message }

    revalidatePath(`/app/clients/${clientId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function deleteContactAction(
  contactId: string,
  clientId: string
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()

    const { data: contact } = await supabase
      .from('client_contacts')
      .select('is_primary')
      .eq('id', contactId)
      .single()

    const { data: others } = await supabase
      .from('client_contacts')
      .select('id')
      .eq('client_id', clientId)
      .neq('id', contactId)

    if (contact?.is_primary && others && others.length > 0) {
      return {
        success: false,
        error: 'Reassign the primary contact before deleting.',
      }
    }

    const { error } = await supabase
      .from('client_contacts')
      .delete()
      .eq('id', contactId)

    if (error) return { success: false, error: error.message }

    revalidatePath(`/app/clients/${clientId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Portal Access ────────────────────────────────────────────────────────────

async function requireActiveTeamUser() {
  const supabase = await createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }

  const { data: teamUser } = await supabase
    .from('team_users')
    .select('id')
    .eq('id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!teamUser) return { error: 'Unauthorized' as const }
  return { error: null }
}

async function findAuthUserIdByEmail(
  email: string
): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null

  const res = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    }
  )
  if (!res.ok) return null

  const payload = (await res.json()) as { users?: { id?: string; email?: string }[]; id?: string }
  if (typeof payload.id === 'string') return payload.id
  const match = (payload.users ?? []).find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  )
  if (match?.id) return match.id

  const service = await createServiceClient()
  const { data } = await service.auth.admin.listUsers({ page: 1, perPage: 200 })
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null
}

export async function grantPortalAccessAction(
  contactId: string,
  clientId: string,
  email: string
): Promise<ActionResult<undefined>> {
  try {
    const authError = (await requireActiveTeamUser()).error
    if (authError) return { success: false, error: authError }

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) return { success: false, error: 'Email is required' }

    const serviceClient = await createServiceClient()
    const { data: invited, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
      normalizedEmail
    )

    let userId = invited?.user?.id ?? null
    if (!userId) {
      userId = await findAuthUserIdByEmail(normalizedEmail)
    }

    if (!userId) {
      return {
        success: false,
        error: inviteError?.message || 'Could not invite or find a portal user for that email',
      }
    }

    await serviceClient.auth.admin.updateUserById(userId, { ban_duration: 'none' }).catch(() => undefined)

    const { error: updateError } = await serviceClient
      .from('client_contacts')
      .update({
        has_portal_access: true,
        portal_user_id: userId,
      })
      .eq('id', contactId)

    if (updateError) return { success: false, error: updateError.message }

    await logActivity({
      entityType: 'client_contact',
      entityId: contactId,
      clientId,
      action: 'portal_access_granted',
      description: `Portal access granted to ${normalizedEmail}`,
    })

    revalidatePath(`/app/clients/${clientId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function revokePortalAccessAction(
  contactId: string,
  clientId: string,
  email: string
): Promise<ActionResult<undefined>> {
  try {
    const authError = (await requireActiveTeamUser()).error
    if (authError) return { success: false, error: authError }

    const serviceClient = await createServiceClient()
    const { data: contact, error: loadError } = await serviceClient
      .from('client_contacts')
      .select('portal_user_id')
      .eq('id', contactId)
      .maybeSingle()

    if (loadError) return { success: false, error: loadError.message }

    const { error: updateError } = await serviceClient
      .from('client_contacts')
      .update({ has_portal_access: false, portal_user_id: null })
      .eq('id', contactId)

    if (updateError) return { success: false, error: updateError.message }

    if (contact?.portal_user_id) {
      await serviceClient.auth.admin
        .updateUserById(contact.portal_user_id, { ban_duration: '876000h' })
        .catch(() => undefined)
    }

    await logActivity({
      entityType: 'client_contact',
      entityId: contactId,
      clientId,
      action: 'portal_access_revoked',
      description: `Portal access revoked from ${email}`,
    })

    revalidatePath(`/app/clients/${clientId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Slack channel ────────────────────────────────────────────────────────────

export async function createClientSlackChannelAction(
  clientId: string,
  planLabel?: string
): Promise<ActionResult<{ channelName: string; warning?: string }>> {
  try {
    const supabase = await createSupabaseClient()
    const { data: client, error } = await supabase
      .from('clients')
      .select(
        'id, company_name, website, status, subscription_plan, plan_service_id, slack_channel_id, slack_channel_name, slack_canvas_id, service_catalog:plan_service_id(name)'
      )
      .eq('id', clientId)
      .single()

    if (error || !client) return { success: false, error: 'Client not found.' }

    if (client.slack_channel_id && client.slack_channel_name) {
      return { success: true, data: { channelName: client.slack_channel_name } }
    }

    const name = slugifyClientChannelName(client.company_name, client.id)
    let channel = await createPublicChannel(name)
    if (!channel.ok && channel.code === 'name_taken') {
      channel = await findPublicChannelByName(name)
    }
    if (!channel.ok) return { success: false, error: channel.error }

    await joinPublicChannel(channel.id)

    const catalogName = Array.isArray(client.service_catalog)
      ? client.service_catalog[0]?.name
      : (client.service_catalog as { name?: string } | null)?.name
    const resolvedPlan =
      planLabel?.trim() ||
      resolveClientPlanDisplayName({
        subscription_plan: client.subscription_plan,
        plan_service_id: client.plan_service_id as string | null,
        catalogName: catalogName ?? null,
      })
    const hubUrl = hubClientUrl(client.id)
    const warnings: string[] = []

    const purpose = await setChannelPurpose(
      channel.id,
      `${client.company_name} · ${resolvedPlan} · internal only`
    )
    if (!purpose.ok) warnings.push(purpose.error)

    let canvasId = client.slack_canvas_id as string | null
    if (!canvasId) {
      const canvas = await createChannelCanvas(
        channel.id,
        buildClientChannelCanvasMarkdown({
          companyName: client.company_name,
          planLabel: resolvedPlan,
          status: client.status,
          website: client.website,
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

    if (client.website) {
      const siteBookmark = await addChannelBookmark(
        channel.id,
        'Website',
        withHttpUrl(client.website)
      )
      if (!siteBookmark.ok && siteBookmark.code !== 'already_exists') {
        warnings.push(siteBookmark.error)
      }
    }

    const welcome = await postToSlackChannel(
      channel.id,
      `This is the internal channel for ${client.company_name}. Use it for back-and-forth about this client.\n\n• Todos and a short brief live in the channel canvas (top right)\n• Project work stays in Hub Tasks\n• Do not invite the client`
    )
    if (!welcome.ok) warnings.push(welcome.error)

    const { error: updateError } = await supabase
      .from('clients')
      .update({
        slack_channel_id: channel.id,
        slack_channel_name: channel.name,
        slack_canvas_id: canvasId,
      })
      .eq('id', clientId)

    if (updateError) return { success: false, error: updateError.message }

    await logActivity({
      entityType: 'client',
      entityId: clientId,
      clientId,
      action: 'slack_channel_created',
      description: `Slack channel #${channel.name} created`,
    })

    revalidatePath(`/app/clients/${clientId}`)
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

export async function sendClientWeeklyDigestAction(
  clientId: string
): Promise<ActionResult<{ posted: true }>> {
  try {
    const supabase = await createSupabaseClient()
    const { data: client, error } = await supabase
      .from('clients')
      .select('id, company_name, slack_channel_id')
      .eq('id', clientId)
      .single()

    if (error || !client) return { success: false, error: 'Client not found.' }
    if (!client.slack_channel_id) {
      return { success: false, error: 'Create a Slack channel for this client first.' }
    }

    const digest = await buildClientWeeklyDigest(supabase, client)
    if (!digest) {
      return { success: false, error: 'No time logged or closed tasks this week.' }
    }

    const posted = await postToSlackChannel(client.slack_channel_id, digest.text, digest.blocks)
    if (!posted.ok) return { success: false, error: posted.error }

    revalidatePath(`/app/clients/${clientId}`)
    return { success: true, data: { posted: true } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function deleteClientAction(id: string): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { data: client, error: loadError } = await supabase
      .from('clients')
      .select('id, company_name')
      .eq('id', id)
      .single()

    if (loadError || !client) return { success: false, error: 'Client not found' }

    const { data: contacts } = await supabase
      .from('client_contacts')
      .select('id')
      .eq('client_id', id)
    const contactIds = (contacts ?? []).map((row) => row.id)

    if (contactIds.length > 0) {
      await supabase
        .from('activity_log')
        .update({ performed_by_client_contact_id: null })
        .in('performed_by_client_contact_id', contactIds)
      await supabase
        .from('files')
        .update({ uploaded_by_client_contact_id: null })
        .in('uploaded_by_client_contact_id', contactIds)
    }

    await supabase.from('activity_log').update({ client_id: null }).eq('client_id', id)
    await supabase.from('leads').update({ converted_client_id: null }).eq('converted_client_id', id)
    await supabase.from('notes').delete().eq('entity_type', 'client').eq('entity_id', id)
    await supabase
      .from('proposals')
      .update({ client_id: null })
      .eq('client_id', id)
      .not('lead_id', 'is', null)

    await logActivity({
      entityType: 'client',
      entityId: id,
      action: 'deleted',
      description: `Client "${client.company_name}" deleted`,
    })

    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) return { success: false, error: error.message }

    revalidatePath('/app/clients')
    revalidatePath('/app/leads')
    revalidatePath('/app/projects')
    revalidatePath('/app/proposals')
    revalidatePath('/app/dashboard')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
