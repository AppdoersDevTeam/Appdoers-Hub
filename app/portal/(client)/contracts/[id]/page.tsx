import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PortalContractSign } from '@/components/portal/contract-sign'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PortalContractPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Verify this contract belongs to the user's client
  const { data: contact } = await supabase
    .from('client_contacts')
    .select('client_id, first_name, last_name, email')
    .eq('portal_user_id', user?.id ?? '')
    .single()

  if (!contact) notFound()

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, title, status, content, signed_at, signed_by_name, signed_by_email, client_id')
    .eq('id', id)
    .eq('client_id', contact.client_id)
    .in('status', ['sent', 'signed'])
    .single()

  if (!contract) notFound()

  return (
    <PortalContractSign
      contract={contract}
      contact={contact}
    />
  )
}
