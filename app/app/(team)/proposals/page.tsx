import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { DocumentTracker } from '@/components/team/documents/document-tracker'
import { leadDisplayName, oneRelation, type TrackedDocument } from '@/lib/documents'

export default async function ProposalsPage() {
  const supabase = await createClient()

  const [{ data: proposals }, { data: clients }, { data: leads }] = await Promise.all([
    supabase
      .from('proposals')
      .select('id, title, status, created_at, sent_at, file_name, mime_type, file_size, storage_path, is_client_visible, client_id, lead_id, clients(company_name), leads(contact_name, company_name)')
      .order('created_at', { ascending: false }),
    supabase.from('clients').select('id, company_name').eq('status', 'active').order('company_name'),
    supabase
      .from('leads')
      .select('id, contact_name, company_name')
      .neq('status', 'lost')
      .order('updated_at', { ascending: false }),
  ])

  const rows: TrackedDocument[] = (proposals ?? []).map((p) => {
    const clientName = oneRelation(p.clients as { company_name?: string } | { company_name?: string }[] | null)?.company_name ?? null
    const lead = oneRelation(p.leads as { contact_name?: string; company_name?: string | null } | { contact_name?: string; company_name?: string | null }[] | null)
    const ownerKind = p.client_id ? 'client' : 'lead'
    const ownerName = ownerKind === 'client'
      ? (clientName ?? '—')
      : lead?.contact_name
        ? leadDisplayName({ contact_name: lead.contact_name, company_name: lead.company_name ?? null })
        : '—'

    return {
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
      lead_id: p.lead_id,
      owner_kind: ownerKind,
      owner_name: ownerName,
    }
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proposals"
        subtitle="Upload PDF or Word proposals for a client or a lead"
      />
      <DocumentTracker
        kind="proposal"
        documents={rows}
        clients={clients ?? []}
        leads={leads ?? []}
      />
    </div>
  )
}
