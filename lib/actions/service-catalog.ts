'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface ServiceInput {
  name: string
  description?: string
  type: 'plan' | 'addon'
  plan_key?: string
  setup_fee: number
  monthly_fee: number
  sort_order?: number
}

export async function createServiceAction(input: ServiceInput): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createSupabaseClient()
    const { data, error } = await supabase
      .from('service_catalog')
      .insert({ ...input, is_active: true })
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }
    revalidatePath('/app/settings')
    return { success: true, data: { id: data.id } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function updateServiceAction(
  id: string,
  input: Partial<ServiceInput>
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { error } = await supabase.from('service_catalog').update(input).eq('id', id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/app/settings')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function toggleServiceActiveAction(
  id: string,
  isActive: boolean
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { error } = await supabase
      .from('service_catalog')
      .update({ is_active: isActive })
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    revalidatePath('/app/settings')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
