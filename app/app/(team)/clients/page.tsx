import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { ClientsTable } from '@/components/team/clients/clients-table'
import { isInternalClient } from '@/lib/clients/internal'
import { resolveClientPlanDisplayName } from '@/lib/clients/plan-display'
import { selectWithInternalClientFallback } from '@/lib/clients/stats-query'
import type { CatalogServiceOption } from '@/lib/clients/catalog-options'

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export default async function ClientsPage() {
  const supabase = await createClient()

  const [{ data: clients }, { data: catalogRows }] = await Promise.all([
    selectWithInternalClientFallback(
      () =>
        supabase
          .from('clients')
          .select(
            `
      id,
      company_name,
      subscription_plan,
      plan_service_id,
      monthly_fee,
      billing_cycle,
      status,
      is_internal,
      updated_at,
      client_contacts(full_name, is_primary),
      service_catalog:plan_service_id ( id, name, plan_key )
    `
          )
          .order('company_name'),
      () =>
        supabase
          .from('clients')
          .select(
            `
      id,
      company_name,
      subscription_plan,
      plan_service_id,
      monthly_fee,
      billing_cycle,
      status,
      updated_at,
      client_contacts(full_name, is_primary),
      service_catalog:plan_service_id ( id, name, plan_key )
    `
          )
          .order('company_name')
    ),
    supabase
      .from('service_catalog')
      .select('id, name, type, plan_key, setup_fee, monthly_fee, min_upfront, contract_months')
      .eq('type', 'plan')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  const catalogPlans: CatalogServiceOption[] = (catalogRows ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    type: 'plan' as const,
    plan_key: (p.plan_key as string | null) ?? null,
    setup_fee: Number(p.setup_fee),
    monthly_fee: Number(p.monthly_fee),
    min_upfront: p.min_upfront != null ? Number(p.min_upfront) : null,
    contract_months: p.contract_months != null ? Number(p.contract_months) : null,
  }))

  const rows = (clients ?? []).map((c) => {
    const primaryContact = (
      c.client_contacts as { full_name: string; is_primary: boolean }[]
    ).find((x) => x.is_primary)
    const catalog = one(
      c.service_catalog as
        | { id: string; name: string; plan_key: string | null }
        | { id: string; name: string; plan_key: string | null }[]
        | null
    )
    const planName = resolveClientPlanDisplayName({
      subscription_plan: c.subscription_plan as string,
      plan_service_id: (c.plan_service_id as string | null) ?? null,
      catalogName: catalog?.name ?? null,
    })

    return {
      id: c.id as string,
      company_name: c.company_name as string,
      primary_contact: primaryContact?.full_name ?? '—',
      subscription_plan: c.subscription_plan as string,
      plan_service_id: (c.plan_service_id as string | null) ?? null,
      plan_name: planName,
      monthly_fee: Number(c.monthly_fee),
      billing_cycle: c.billing_cycle as string | undefined,
      status: c.status as string,
      updated_at: c.updated_at as string,
    }
  })

  const externalCount = (clients ?? []).filter(
    (c) =>
      !isInternalClient({
        is_internal: (c as { is_internal?: boolean | null }).is_internal ?? null,
        company_name: c.company_name as string,
      })
  ).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        subtitle={`${externalCount} client${externalCount !== 1 ? 's' : ''}`}
      />
      <ClientsTable clients={rows} catalogPlans={catalogPlans} />
    </div>
  )
}
