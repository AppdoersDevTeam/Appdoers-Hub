import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { ContractsList } from '@/components/team/contracts/contracts-list'

export default async function ContractsPage() {
  const supabase = await createClient()

  const [{ data: contracts }, { data: clients }] = await Promise.all([
    supabase
      .from('contracts')
      .select('id, title, status, created_at, sent_at, signed_at, clients(company_name), proposals(title)')
      .order('created_at', { ascending: false }),
    supabase.from('clients').select('id, company_name').eq('status', 'active').order('company_name'),
  ])

  const rows = (contracts ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    created_at: c.created_at,
    sent_at: c.sent_at,
    signed_at: c.signed_at,
    client_name: (c.clients as { company_name?: string } | null)?.company_name ?? '—',
    proposal_title: (c.proposals as { title?: string } | null)?.title ?? null,
  }))

  return (
    <div className="space-y-6">
      <PageHeader title="Contracts" subtitle={`${rows.length} contract${rows.length !== 1 ? 's' : ''}`} />
      <ContractsList contracts={rows} />
    </div>
  )
}
