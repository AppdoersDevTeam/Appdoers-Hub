'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface SupabaseAccountWithProjects {
  id: string
  subscription_id: string
  login_email: string
  project_slot_limit: number
  project_names: string[]
}

export interface SupabaseAccountInput {
  subscription_id: string
  login_email: string
  project_slot_limit: number
  project_names: string[]
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function normalizeProjectNames(names: string[], limit: number) {
  const cleaned: string[] = []
  const seen = new Set<string>()
  for (const raw of names) {
    const name = raw.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    cleaned.push(name)
  }
  return cleaned.slice(0, limit)
}

function uniqueMessage(error: { message?: string; code?: string } | null) {
  const message = error?.message ?? ''
  if (error?.code === '23505' || /duplicate key/i.test(message)) {
    if (/login_email|email_lower/i.test(message)) {
      return 'That login email is already tracked on this subscription.'
    }
    return 'That login is already in use.'
  }
  return message || 'Something went wrong.'
}

function validateInput(input: SupabaseAccountInput): string | null {
  const email = normalizeEmail(input.login_email)
  if (!email || !email.includes('@')) return 'A valid login email is required'
  if (!Number.isInteger(input.project_slot_limit) || input.project_slot_limit < 1) {
    return 'Slot limit must be at least 1'
  }
  if (normalizeProjectNames(input.project_names, input.project_slot_limit).length > input.project_slot_limit) {
    return `This login only has ${input.project_slot_limit} project slot${input.project_slot_limit === 1 ? '' : 's'}`
  }
  return null
}

export async function createSupabaseAccountAction(
  input: SupabaseAccountInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const validationError = validateInput(input)
    if (validationError) return { success: false, error: validationError }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('supabase_accounts')
      .insert({
        subscription_id: input.subscription_id,
        login_email: normalizeEmail(input.login_email),
        project_slot_limit: input.project_slot_limit,
        project_names: normalizeProjectNames(input.project_names, input.project_slot_limit),
      })
      .select('id')
      .single()

    if (error) return { success: false, error: uniqueMessage(error) }

    revalidatePath('/app/subscriptions')
    return { success: true, data: { id: data.id } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function updateSupabaseAccountAction(
  id: string,
  input: SupabaseAccountInput
): Promise<ActionResult<undefined>> {
  try {
    const validationError = validateInput(input)
    if (validationError) return { success: false, error: validationError }

    const supabase = await createClient()
    const { error } = await supabase
      .from('supabase_accounts')
      .update({
        login_email: normalizeEmail(input.login_email),
        project_slot_limit: input.project_slot_limit,
        project_names: normalizeProjectNames(input.project_names, input.project_slot_limit),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return { success: false, error: uniqueMessage(error) }

    revalidatePath('/app/subscriptions')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function deleteSupabaseAccountAction(
  id: string
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('supabase_accounts').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/app/subscriptions')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
