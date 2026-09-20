'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  isOneOffCycle,
  isSubscriptionBillingCycle,
  type SubscriptionBillingCycle,
} from '@/lib/subscriptions/billing'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface SubscriptionInput {
  name: string
  category: string
  plan_name?: string
  billing_cycle: SubscriptionBillingCycle
  cost: number
  renewal_date?: string | null
  status: 'active' | 'paused' | 'cancelled'
  url?: string
  notes?: string
  client_id?: string | null
}

function validateSubscriptionInput(input: SubscriptionInput): string | null {
  if (!isSubscriptionBillingCycle(input.billing_cycle)) {
    return 'Select a valid billing cycle'
  }
  if (isOneOffCycle(input.billing_cycle) && !input.renewal_date) {
    return 'Expiry date is required for one-off payments'
  }
  return null
}

export async function createSubscriptionAction(
  input: SubscriptionInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const validationError = validateSubscriptionInput(input)
    if (validationError) return { success: false, error: validationError }
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
        client_id: input.client_id || null,
      })
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }
    revalidatePath('/app/subscriptions')
    revalidatePath('/app/dashboard')
    revalidatePath('/app/analytics')
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
    const validationError = validateSubscriptionInput(input)
    if (validationError) return { success: false, error: validationError }
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
        client_id: input.client_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    revalidatePath('/app/subscriptions')
    revalidatePath('/app/dashboard')
    revalidatePath('/app/analytics')
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
    revalidatePath('/app/analytics')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
