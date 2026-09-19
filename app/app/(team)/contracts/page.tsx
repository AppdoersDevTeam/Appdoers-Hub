import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { DocumentTracker } from '@/components/team/documents/document-tracker'
import { oneRelation, type TrackedDocument } from '@/lib/documents'

export default async function ContractsPage() {
  const supabase = await createClient()

  const [{ data: contracts }, { data: clients }] = await Promise.all([
    supabase
      .from('contracts')
      .select('id, title, status, created_at, sent_at, signed_at, file_name, mime_type, file_size, storage_path, is_client_visible, client_id, clients(company_name)')
      .order('created_at', { ascending: false }),
    supabase.from('clients').select('id, company_name').eq('status', 'active').order('company_name'),
  ])

  const rows: TrackedDocument[] = (contracts ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    created_at: c.created_at,
    sent_at: c.sent_at,
    signed_at: c.signed_at,
    file_name: c.file_name,
    mime_type: c.mime_type,
    file_size: c.file_size,
    storage_path: c.storage_path,
    is_client_visible: c.is_client_visible ?? true,
    client_id: c.client_id,
    owner_kind: 'client' as const,
    owner_name: oneRelation(c.clients as { company_name?: string } | { company_name?: string }[] | null)?.company_name ?? '—',
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contracts"
        subtitle="Upload PDF or Word contracts to keep on each client record"
      />
      <DocumentTracker kind="contract" documents={rows} clients={clients ?? []} />
    </div>
  )
}
