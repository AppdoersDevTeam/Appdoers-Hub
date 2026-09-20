import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { SubscriptionsTable } from '@/components/team/subscriptions/subscriptions-table'
import { getEffectivePermissions, can } from '@/lib/permissions'
import type { HubClientOption, SupabaseAccountWithProjects } from '@/lib/actions/supabase-accounts'

export default async function SubscriptionsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/app/login')

  const { data: teamUser } = await supabase
    .from('team_users')
    .select('role, permissions')
    .eq('id', user.id)
    .single()

  const effective = getEffectivePermissions(
    teamUser?.role ?? 'member',
    (teamUser?.permissions ?? {}) as Record<string, string>
  )

  if (!can(effective, 'subscriptions', 'view')) {
    redirect('/app/dashboard')
  }

  const canViewAnalytics = can(effective, 'analytics', 'view')

  const [
    { data: subscriptions },
    { data: supabaseAccounts },
    { data: accountProjects },
    { data: clients },
  ] = await Promise.all([
    supabase
      .from('agency_subscriptions')
      .select('id, name, category, plan_name, billing_cycle, cost, renewal_date, status, url, notes, client_id, clients(company_name)')
      .order('status')
      .order('name'),
    supabase
      .from('supabase_accounts')
      .select('id, subscription_id, login_email, project_slot_limit')
      .order('login_email'),
    supabase
      .from('supabase_account_projects')
      .select('account_id, project_name, client_id, clients(company_name)'),
    supabase
      .from('clients')
      .select('id, company_name')
      .order('company_name'),
  ])

  const hubClients: HubClientOption[] = (clients ?? []).map(client => ({
    id: client.id as string,
    company_name: client.company_name as string,
  }))

  const clientNameById = new Map(hubClients.map(client => [client.id, client.company_name]))

  const accountsWithProjects: SupabaseAccountWithProjects[] = (supabaseAccounts ?? []).map(account => ({
    id: account.id as string,
    subscription_id: account.subscription_id as string,
    login_email: account.login_email as string,
    project_slot_limit: Number(account.project_slot_limit),
    projects: (accountProjects ?? [])
      .filter(link => link.account_id === account.id)
      .map(link => {
        const nested = link.clients as { company_name?: string } | { company_name?: string }[] | null
        const client = Array.isArray(nested) ? nested[0] : nested
        const client_id = (link.client_id as string | null) ?? null
        return {
          name: link.project_name as string,
          client_id,
          client_name: client?.company_name ?? (client_id ? clientNameById.get(client_id) ?? null : null),
        }
      }),
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Subscriptions"
          subtitle="Tools and services Appdoers pays for"
        />
        {canViewAnalytics && (
          <Link
            href="/app/analytics"
            className="text-sm text-blue-600 hover:text-blue-700 shrink-0"
          >
            View full analytics →
          </Link>
        )}
      </div>
      <SubscriptionsTable
        subscriptions={(subscriptions ?? []).map(s => {
          const nested = s.clients as { company_name?: string } | { company_name?: string }[] | null
          const client = Array.isArray(nested) ? nested[0] : nested
          const client_id = (s.client_id as string | null) ?? null
          return {
            id: s.id as string,
            name: s.name as string,
            category: s.category as string,
            plan_name: s.plan_name as string | null,
            billing_cycle: s.billing_cycle as string,
            cost: Number(s.cost),
            renewal_date: s.renewal_date as string | null,
            status: s.status as string,
            url: s.url as string | null,
            notes: s.notes as string | null,
            client_id,
            client_name: client?.company_name ?? (client_id ? clientNameById.get(client_id) ?? null : null),
          }
        })}
        canEdit={can(effective, 'subscriptions', 'edit')}
        supabaseAccounts={accountsWithProjects}
        clients={hubClients}
      />
    </div>
  )
}
