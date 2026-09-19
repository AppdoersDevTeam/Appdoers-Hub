import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { DocumentRecordsList } from '@/components/team/documents/document-records-list'

export default async function ContractsPage() {
  const supabase = await createClient()

  const [{ data: contracts }, { data: clients }] = await Promise.all([
    supabase
      .from('contracts')
      .select(
        'id, title, status, created_at, sent_at, client_id, file_name, file_size, file_mime_type, is_client_visible, clients(company_name)'
      )
      .order('created_at', { ascending: false }),
    supabase.from('clients').select('id, company_name').eq('status', 'active').order('company_name'),
  ])

  const rows = (contracts ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    created_at: c.created_at,
    sent_at: c.sent_at,
    client_id: c.client_id as string,
    client_name: (c.clients as { company_name?: string } | null)?.company_name ?? '—',
    file_name: (c.file_name as string | null) ?? null,
    file_size: (c.file_size as number | null) ?? null,
    file_mime_type: (c.file_mime_type as string | null) ?? null,
    is_client_visible: Boolean(c.is_client_visible),
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contracts"
        subtitle={`${rows.length} contract${rows.length !== 1 ? 's' : ''} on file`}
      />
      <DocumentRecordsList kind="contract" records={rows} clients={clients ?? []} />
    </div>
  )
}
