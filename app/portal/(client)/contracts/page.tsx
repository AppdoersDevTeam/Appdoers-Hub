import { createClient } from '@/lib/supabase/server'
import { PortalDocumentList } from '@/components/portal/document-list'

export default async function PortalContractsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: contact } = await supabase
    .from('client_contacts')
    .select('client_id')
    .eq('portal_user_id', user?.id ?? '')
    .single()

  if (!contact) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">No account found.</p>
      </div>
    )
  }

  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, title, status, created_at, sent_at, signed_at, file_name')
    .eq('client_id', contact.client_id)
    .eq('is_client_visible', true)
    .not('storage_path', 'is', null)
    .in('status', ['sent', 'signed'])
    .order('created_at', { ascending: false })

  return (
    <PortalDocumentList
      kind="contract"
      documents={(contracts ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        created_at: c.created_at,
        sent_at: c.sent_at,
        signed_at: c.signed_at,
        file_name: c.file_name,
      }))}
    />
  )
}
