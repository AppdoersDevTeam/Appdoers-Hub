'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface HubClientOption {
  id: string
  company_name: string
}

export interface SupabaseLinkedProject {
  name: string
  client_id: string | null
  client_name: string | null
}

export interface SupabaseAccountWithProjects {
  id: string
  subscription_id: string
  login_email: string
  project_slot_limit: number
  projects: SupabaseLinkedProject[]
}

export interface SupabaseAccountInput {
  subscription_id: string
  login_email: string
  project_slot_limit: number
  projects: { name: string; client_id: string }[]
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function normalizeProjects(projects: { name: string; client_id: string }[], limit: number) {
  const cleaned: { name: string; client_id: string }[] = []
  const seen = new Set<string>()
  for (const raw of projects) {
    const name = raw.name.trim()
    const client_id = raw.client_id.trim()
    if (!name && !client_id) continue
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    cleaned.push({ name, client_id })
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
  const projects = normalizeProjects(input.projects, input.project_slot_limit)
  if (projects.length > input.project_slot_limit) {
    return `This login only has ${input.project_slot_limit} project slot${input.project_slot_limit === 1 ? '' : 's'}`
  }
  if (projects.some(project => !project.client_id)) {
    return 'Choose a Hub client for each named project'
  }
  return null
}

function revalidateClientSurfaces() {
  revalidatePath('/app/subscriptions')
  revalidatePath('/app/clients', 'layout')
}

async function replaceProjects(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountId: string,
  projects: { name: string; client_id: string }[]
) {
  const { error: deleteError } = await supabase
    .from('supabase_account_projects')
    .delete()
    .eq('account_id', accountId)

  if (deleteError) return deleteError
  if (projects.length === 0) return null

  const { error: insertError } = await supabase
    .from('supabase_account_projects')
    .insert(projects.map(project => ({
      account_id: accountId,
      project_name: project.name,
      client_id: project.client_id || null,
    })))

  return insertError
}

export async function createSupabaseAccountAction(
  input: SupabaseAccountInput
): Promise<ActionResult<{ id: string; projects: SupabaseLinkedProject[] }>> {
  try {
    const validationError = validateInput(input)
    if (validationError) return { success: false, error: validationError }

    const projects = normalizeProjects(input.projects, input.project_slot_limit)
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('supabase_accounts')
      .insert({
        subscription_id: input.subscription_id,
        login_email: normalizeEmail(input.login_email),
        project_slot_limit: input.project_slot_limit,
      })
      .select('id')
      .single()

    if (error) return { success: false, error: uniqueMessage(error) }

    const linkError = await replaceProjects(supabase, data.id, projects)
    if (linkError) {
      await supabase.from('supabase_accounts').delete().eq('id', data.id)
      return { success: false, error: uniqueMessage(linkError) }
    }

    revalidateClientSurfaces()
    return { success: true, data: { id: data.id, projects: [] } }
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

    const projects = normalizeProjects(input.projects, input.project_slot_limit)
    const supabase = await createClient()
    const { error } = await supabase
      .from('supabase_accounts')
      .update({
        login_email: normalizeEmail(input.login_email),
        project_slot_limit: input.project_slot_limit,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return { success: false, error: uniqueMessage(error) }

    const linkError = await replaceProjects(supabase, id, projects)
    if (linkError) return { success: false, error: uniqueMessage(linkError) }

    revalidateClientSurfaces()
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
    revalidateClientSurfaces()
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
