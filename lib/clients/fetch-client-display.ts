import type { SupabaseClient } from '@supabase/supabase-js'

export interface ClientDisplayInfo {
  companyName: string
  contactName: string | null
  contactEmail: string | null
}

export async function fetchClientDisplayInfo(
  db: SupabaseClient,
  clientId: string
): Promise<ClientDisplayInfo> {
  const [{ data: client }, { data: contacts }] = await Promise.all([
    db.from('clients').select('company_name').eq('id', clientId).maybeSingle(),
    db
      .from('client_contacts')
      .select('full_name, email, is_primary')
      .eq('client_id', clientId)
      .order('is_primary', { ascending: false }),
  ])

  const primary = (contacts ?? []).find((c) => c.is_primary) ?? contacts?.[0]

  return {
    companyName: client?.company_name ?? 'Client',
    contactName: (primary?.full_name as string | undefined) ?? null,
    contactEmail: (primary?.email as string | undefined) ?? null,
  }
}
