import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProposalBuilder } from '@/components/team/proposals/proposal-builder'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProposalBuilderPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: proposal }, { data: services }] = await Promise.all([
    supabase
      .from('proposals')
      .select('*, clients(id, company_name, contact_name, contact_email)')
      .eq('id', id)
      .single(),
    supabase
      .from('service_catalog')
      .select('id, name, type, plan_key, setup_fee, monthly_fee')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  if (!proposal) notFound()

  return (
    <ProposalBuilder
      proposal={proposal}
      client={proposal.clients as { id: string; company_name: string; contact_name: string | null; contact_email: string | null } | null}
      services={services ?? []}
    />
  )
}
