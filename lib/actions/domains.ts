'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface DomainInput {
  domain_name: string
  registrar?: string
  expiry_date?: string | null
  auto_renew?: boolean
  hosting_provider?: string
  vercel_project_name?: string
  ssl_status?: string
  tech_stack?: string[]
  dns_notes?: string
}

export async function createDomainAction(
  clientId: string,
  input: DomainInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createSupabaseClient()
    const { data, error } = await supabase
      .from('client_domains')
      .insert({
        client_id: clientId,
        domain_name: input.domain_name,
        registrar: input.registrar || null,
        expiry_date: input.expiry_date || null,
        auto_renew: input.auto_renew ?? false,
        hosting_provider: input.hosting_provider || null,
        vercel_project_name: input.vercel_project_name || null,
        ssl_status: input.ssl_status || 'unknown',
        tech_stack: input.tech_stack ?? [],
        dns_notes: input.dns_notes || null,
      })
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }
    revalidatePath(`/app/clients/${clientId}`)
    return { success: true, data: { id: data.id } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function updateDomainAction(
  id: string,
  clientId: string,
  input: DomainInput
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { error } = await supabase
      .from('client_domains')
      .update({
        domain_name: input.domain_name,
        registrar: input.registrar || null,
        expiry_date: input.expiry_date || null,
        auto_renew: input.auto_renew ?? false,
        hosting_provider: input.hosting_provider || null,
        vercel_project_name: input.vercel_project_name || null,
        ssl_status: input.ssl_status || 'unknown',
        tech_stack: input.tech_stack ?? [],
        dns_notes: input.dns_notes || null,
      })
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    revalidatePath(`/app/clients/${clientId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function deleteDomainAction(
  id: string,
  clientId: string
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { error } = await supabase.from('client_domains').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    revalidatePath(`/app/clients/${clientId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
