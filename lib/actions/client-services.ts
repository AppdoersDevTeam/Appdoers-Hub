'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface ClientServiceInput {
  service_catalog_id: string
  quantity?: number
  monthly_fee: number
  setup_fee: number
  notes?: string
}

export async function syncClientServicesAction(
  clientId: string,
  services: ClientServiceInput[]
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()

    const { error: deleteError } = await supabase
      .from('client_services')
      .delete()
      .eq('client_id', clientId)

    if (deleteError) return { success: false, error: deleteError.message }

    if (services.length === 0) {
      revalidatePath(`/app/clients/${clientId}`)
      return { success: true, data: undefined }
    }

    const rows = services.map((s) => ({
      client_id: clientId,
      service_catalog_id: s.service_catalog_id,
      quantity: s.quantity ?? 1,
      monthly_fee: s.monthly_fee,
      setup_fee: s.setup_fee,
      notes: s.notes ?? null,
    }))

    const { error: insertError } = await supabase.from('client_services').insert(rows)
    if (insertError) return { success: false, error: insertError.message }

    revalidatePath(`/app/clients/${clientId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
