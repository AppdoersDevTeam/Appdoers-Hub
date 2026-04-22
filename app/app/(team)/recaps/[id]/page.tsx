import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RecapEditor } from '@/components/team/recaps/recap-editor'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RecapDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: recap } = await supabase
    .from('monthly_recaps')
    .select('*, clients(id, company_name)')
    .eq('id', id)
    .single()

  if (!recap) notFound()

  return (
    <RecapEditor
      recap={recap}
      clientName={(recap.clients as { company_name?: string } | null)?.company_name ?? '—'}
      clientId={(recap.clients as { id?: string } | null)?.id ?? recap.client_id}
    />
  )
}
