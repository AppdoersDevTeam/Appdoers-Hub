import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { DocumentRecordsList } from '@/components/team/documents/document-records-list'

export default async function ProposalsPage() {
  const supabase = await createClient()

  const [{ data: proposals }, { data: clients }] = await Promise.all([
    supabase
      .from('proposals')
      .select(
        'id, title, status, created_at, sent_at, client_id, file_name, file_size, file_mime_type, is_client_visible, clients(company_name)'
      )
      .order('created_at', { ascending: false }),
    supabase.from('clients').select('id, company_name').eq('status', 'active').order('company_name'),
  ])

  const rows = (proposals ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    created_at: p.created_at,
    sent_at: p.sent_at,
    client_id: p.client_id as string,
    client_name: (p.clients as { company_name?: string } | null)?.company_name ?? '—',
    file_name: (p.file_name as string | null) ?? null,
    file_size: (p.file_size as number | null) ?? null,
    file_mime_type: (p.file_mime_type as string | null) ?? null,
    is_client_visible: Boolean(p.is_client_visible),
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proposals"
        subtitle={`${rows.length} proposal${rows.length !== 1 ? 's' : ''} on file`}
      />
      <DocumentRecordsList kind="proposal" records={rows} clients={clients ?? []} />
    </div>
  )
}
