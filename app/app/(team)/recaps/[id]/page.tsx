import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RecapEditor } from '@/components/team/recaps/recap-editor'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RecapDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: recap, error } = await supabase
    .from('monthly_recaps')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !recap) notFound()

  const { data: client } = await supabase
    .from('clients')
    .select('id, company_name, contact_name')
    .eq('id', recap.client_id)
    .single()

  return (
    <RecapEditor
      recap={recap}
      clientName={client?.company_name ?? '—'}
      clientId={client?.id ?? recap.client_id}
      contactName={client?.contact_name}
    />
  )
}
