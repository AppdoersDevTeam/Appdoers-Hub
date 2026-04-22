import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { RecapsList } from '@/components/team/recaps/recaps-list'

export default async function RecapsPage() {
  const supabase = await createClient()

  const [{ data: recaps }, { data: clients }] = await Promise.all([
    supabase
      .from('monthly_recaps')
      .select('id, month, year, is_sent, sent_at, created_at, clients(company_name)')
      .order('year', { ascending: false })
      .order('month', { ascending: false }),
    supabase
      .from('clients')
      .select('id, company_name')
      .eq('status', 'active')
      .order('company_name'),
  ])

  const rows = (recaps ?? []).map((r) => ({
    id: r.id,
    month: r.month as number,
    year: r.year as number,
    is_sent: r.is_sent as boolean,
    sent_at: r.sent_at as string | null,
    created_at: r.created_at as string,
    client_name: (r.clients as { company_name?: string } | null)?.company_name ?? '—',
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Recaps"
        subtitle="Generate and send monthly progress reports to clients"
      />
      <RecapsList recaps={rows} clients={clients ?? []} />
    </div>
  )
}
