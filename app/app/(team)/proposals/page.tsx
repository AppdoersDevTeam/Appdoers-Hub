import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { ProposalsList } from '@/components/team/proposals/proposals-list'

export default async function ProposalsPage() {
  const supabase = await createClient()

  const [{ data: proposals }, { data: clients }, { data: templates }] =
    await Promise.all([
      supabase
        .from('proposals')
        .select('id, title, version, status, created_at, sent_at, total_setup, total_monthly, clients(company_name)')
        .order('created_at', { ascending: false }),
      supabase.from('clients').select('id, company_name').eq('status', 'active').order('company_name'),
      supabase.from('proposal_templates').select('id, name, plan_key').eq('is_active', true).order('name'),
    ])

  const rows = (proposals ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    version: p.version,
    status: p.status,
    created_at: p.created_at,
    sent_at: p.sent_at,
    total_setup: p.total_setup,
    total_monthly: p.total_monthly,
    client_name: (p.clients as { company_name?: string } | null)?.company_name ?? '—',
  }))

  return (
    <div className="space-y-6">
      <PageHeader title="Proposals" subtitle={`${rows.length} proposal${rows.length !== 1 ? 's' : ''}`} />
      <ProposalsList proposals={rows} clients={clients ?? []} templates={templates ?? []} />
    </div>
  )
}
