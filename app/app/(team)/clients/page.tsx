import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { ClientsTable } from '@/components/team/clients/clients-table'

export default async function ClientsPage() {
  const supabase = await createClient()

  const { data: clients } = await supabase
    .from('clients')
    .select(
      `
      id,
      company_name,
      subscription_plan,
      monthly_fee,
      status,
      updated_at,
      client_contacts(full_name, is_primary),
      projects(id, status)
    `
    )
    .order('company_name')

  const rows = (clients ?? []).map((c) => {
    const primaryContact = (
      c.client_contacts as { full_name: string; is_primary: boolean }[]
    ).find((x) => x.is_primary)
    const activeProjects = (
      c.projects as { id: string; status: string }[]
    ).filter((p) => p.status === 'active').length

    return {
      id: c.id,
      company_name: c.company_name,
      primary_contact: primaryContact?.full_name ?? '—',
      subscription_plan: c.subscription_plan,
      monthly_fee: c.monthly_fee,
      active_projects: activeProjects,
      status: c.status,
      updated_at: c.updated_at,
    }
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Clients" subtitle={`${rows.length} client${rows.length !== 1 ? 's' : ''}`} />
      <ClientsTable clients={rows} />
    </div>
  )
}
