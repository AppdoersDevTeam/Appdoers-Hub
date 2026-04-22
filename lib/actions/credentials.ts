'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface CredentialInput {
  platform: string
  username?: string
  password_encrypted?: string
  url?: string
  notes?: string
}

export async function createCredentialAction(
  clientId: string,
  input: CredentialInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('client_credentials')
      .insert({
        client_id: clientId,
        platform: input.platform,
        username: input.username || null,
        password_encrypted: input.password_encrypted || null,
        url: input.url || null,
        notes: input.notes || null,
        created_by: user?.id,
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

export async function updateCredentialAction(
  id: string,
  clientId: string,
  input: CredentialInput
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { error } = await supabase
      .from('client_credentials')
      .update({
        platform: input.platform,
        username: input.username || null,
        password_encrypted: input.password_encrypted || null,
        url: input.url || null,
        notes: input.notes || null,
      })
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    revalidatePath(`/app/clients/${clientId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function deleteCredentialAction(
  id: string,
  clientId: string
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { error } = await supabase.from('client_credentials').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    revalidatePath(`/app/clients/${clientId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
