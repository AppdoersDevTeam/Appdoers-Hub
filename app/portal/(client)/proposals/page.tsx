import { createClient } from '@/lib/supabase/server'
import { PortalDocumentList } from '@/components/portal/document-list'

export default async function PortalProposalsPage() {
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

  const { data: proposals } = await supabase
    .from('proposals')
    .select('id, title, status, created_at, sent_at, file_name')
    .eq('client_id', contact.client_id)
    .eq('is_client_visible', true)
    .not('storage_path', 'is', null)
    .in('status', ['sent', 'approved', 'declined', 'expired'])
    .order('created_at', { ascending: false })

  return (
    <PortalDocumentList
      kind="proposal"
      documents={(proposals ?? []).map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        created_at: p.created_at,
        sent_at: p.sent_at,
        file_name: p.file_name,
      }))}
    />
  )
}
