import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { DocumentTracker, type TrackedDocument } from '@/components/team/documents/document-tracker'

export default async function ProposalsPage() {
  const supabase = await createClient()

  const [{ data: proposals }, { data: clients }] = await Promise.all([
    supabase
      .from('proposals')
      .select('id, title, status, created_at, sent_at, file_name, mime_type, file_size, storage_path, is_client_visible, client_id, clients(company_name)')
      .order('created_at', { ascending: false }),
    supabase.from('clients').select('id, company_name').eq('status', 'active').order('company_name'),
  ])

  const rows: TrackedDocument[] = (proposals ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    created_at: p.created_at,
    sent_at: p.sent_at,
    file_name: p.file_name,
    mime_type: p.mime_type,
    file_size: p.file_size,
    storage_path: p.storage_path,
    is_client_visible: p.is_client_visible ?? true,
    client_id: p.client_id,
    client_name: (p.clients as { company_name?: string } | null)?.company_name ?? '—',
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proposals"
        subtitle="Upload PDF or Word proposals to keep on each client record"
      />
      <DocumentTracker kind="proposal" documents={rows} clients={clients ?? []} />
    </div>
  )
}
