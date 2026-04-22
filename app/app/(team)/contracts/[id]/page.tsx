import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ContractEditor } from '@/components/team/contracts/contract-editor'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ContractDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: contract } = await supabase
    .from('contracts')
    .select('*, clients(id, company_name, contact_name, contact_email), proposals(id, title)')
    .eq('id', id)
    .single()

  if (!contract) notFound()

  return (
    <ContractEditor
      contract={contract}
      client={contract.clients as { id: string; company_name: string; contact_name: string | null; contact_email: string | null } | null}
      proposal={contract.proposals as { id: string; title: string } | null}
    />
  )
}
