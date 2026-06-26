import { notFound, redirect } from 'next/navigation'
import { ProposalBuilder } from '@/components/team/proposals/proposal-builder'
import { fetchClientDisplayInfo } from '@/lib/clients/fetch-client-display'
import { requireTeamAccess } from '@/lib/supabase/route-access'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProposalBuilderPage({ params }: Props) {
  const { id } = await params
  const access = await requireTeamAccess()
  if (!access.ok) {
    if (access.status === 401) redirect('/app/login')
    notFound()
  }

  const [{ data: proposal, error: proposalError }, { data: services }] = await Promise.all([
    access.db.from('proposals').select('*').eq('id', id).maybeSingle(),
    access.db
      .from('service_catalog')
      .select('id, name, description, type, plan_key, setup_fee, monthly_fee')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  if (proposalError) {
    console.error('Proposal detail fetch error:', proposalError.message)
    notFound()
  }

  if (!proposal) notFound()

  const [{ data: clientRow }, clientInfo] = await Promise.all([
    access.db
      .from('clients')
      .select('id, company_name')
      .eq('id', proposal.client_id)
      .maybeSingle(),
    fetchClientDisplayInfo(access.db, proposal.client_id as string),
  ])

  const client = clientRow
    ? {
        ...clientRow,
        contact_name: clientInfo.contactName,
        contact_email: clientInfo.contactEmail,
      }
    : null

  return (
    <ProposalBuilder
      proposal={proposal}
      client={client}
      services={services ?? []}
    />
  )
}
