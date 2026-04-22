'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface SubscriptionInput {
  name: string
  category: string
  plan_name?: string
  billing_cycle: 'monthly' | 'yearly'
  cost: number
  renewal_date?: string | null
  status: 'active' | 'paused' | 'cancelled'
  url?: string
  notes?: string
}

export async function createSubscriptionAction(
  input: SubscriptionInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('agency_subscriptions')
      .insert({
        name: input.name,
        category: input.category,
        plan_name: input.plan_name || null,
        billing_cycle: input.billing_cycle,
        cost: input.cost,
        renewal_date: input.renewal_date || null,
        status: input.status,
        url: input.url || null,
        notes: input.notes || null,
      })
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }
    revalidatePath('/app/subscriptions')
    revalidatePath('/app/dashboard')
    return { success: true, data: { id: data.id } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function updateSubscriptionAction(
  id: string,
  input: SubscriptionInput
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('agency_subscriptions')
      .update({
        name: input.name,
        category: input.category,
        plan_name: input.plan_name || null,
        billing_cycle: input.billing_cycle,
        cost: input.cost,
        renewal_date: input.renewal_date || null,
        status: input.status,
        url: input.url || null,
        notes: input.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    revalidatePath('/app/subscriptions')
    revalidatePath('/app/dashboard')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function deleteSubscriptionAction(
  id: string
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('agency_subscriptions')
      .delete()
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    revalidatePath('/app/subscriptions')
    revalidatePath('/app/dashboard')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
