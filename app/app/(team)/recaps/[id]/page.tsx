import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RecapEditor } from '@/components/team/recaps/recap-editor'
import { fetchClientDisplayInfo } from '@/lib/clients/fetch-client-display'

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

  const client = await fetchClientDisplayInfo(supabase, recap.client_id)

  return (
    <RecapEditor
      recap={recap}
      clientName={client.companyName}
      clientId={recap.client_id}
      contactName={client.contactName}
    />
  )
}
