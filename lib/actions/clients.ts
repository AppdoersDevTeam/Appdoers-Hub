'use server'

import { revalidatePath } from 'next/cache'
import {
  createClient as createSupabaseClient,
  createServiceClient,
} from '@/lib/supabase/server'
import { logActivity } from './activity'
import type { SubscriptionPlan } from '@/lib/types/database'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

// ─── Clients ─────────────────────────────────────────────────────────────────

export interface CreateClientInput {
  company_name: string
  industry?: string
  website?: string
  location?: string
  subscription_plan: SubscriptionPlan
  monthly_fee: number
  setup_fee: number
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

export async function grantPortalAccessAction(
  contactId: string,
  clientId: string,
  email: string
): Promise<ActionResult<undefined>> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const res = await fetch(`${supabaseUrl}/auth/v1/admin/invite`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    const resData = await res.json()
    const userId: string | undefined = resData.id

    const serviceClient = await createServiceClient()
    await serviceClient
      .from('client_contacts')
      .update({
        has_portal_access: true,
        ...(userId ? { portal_user_id: userId } : {}),
      })
      .eq('id', contactId)

    await logActivity({
      entityType: 'client_contact',
      entityId: contactId,
      clientId,
      action: 'portal_access_granted',
      description: `Portal access granted to ${email}`,
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
    const supabase = await createSupabaseClient()
    await supabase
      .from('client_contacts')
      .update({ has_portal_access: false })
      .eq('id', contactId)

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
