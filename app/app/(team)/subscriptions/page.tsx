import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { SubscriptionsTable } from '@/components/team/subscriptions/subscriptions-table'
import { getEffectivePermissions, can } from '@/lib/permissions'
import type { HubProjectOption, SupabaseAccountWithProjects } from '@/lib/actions/supabase-accounts'

function relatedClientName(clients: unknown): string {
  if (!clients) return '—'
  const row = Array.isArray(clients) ? clients[0] : clients
  if (row && typeof row === 'object' && 'company_name' in row) {
    return (row as { company_name?: string | null }).company_name ?? '—'
  }
  return '—'
}

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
    { data: projects },
  ] = await Promise.all([
    supabase
      .from('agency_subscriptions')
      .select('id, name, category, plan_name, billing_cycle, cost, renewal_date, status, url, notes')
      .order('status')
      .order('name'),
    supabase
      .from('supabase_accounts')
      .select('id, subscription_id, login_email, project_slot_limit')
      .order('login_email'),
    supabase
      .from('supabase_account_projects')
      .select('account_id, project_id'),
    supabase
      .from('projects')
      .select('id, name, client_id, clients(company_name)')
      .order('name'),
  ])

  const pickerProjects: HubProjectOption[] = (projects ?? []).map(project => ({
    id: project.id as string,
    name: project.name as string,
    client_id: project.client_id as string,
    client_name: relatedClientName(project.clients),
  }))

  const projectsById = new Map(pickerProjects.map(project => [project.id, project]))

  const accountsWithProjects: SupabaseAccountWithProjects[] = (supabaseAccounts ?? []).map(account => ({
    id: account.id as string,
    subscription_id: account.subscription_id as string,
    login_email: account.login_email as string,
    project_slot_limit: Number(account.project_slot_limit),
    projects: (accountProjects ?? [])
      .filter(link => link.account_id === account.id)
      .map(link => projectsById.get(link.project_id as string))
      .filter((project): project is HubProjectOption => Boolean(project)),
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
        subscriptions={(subscriptions ?? []).map(s => ({
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
        }))}
        canEdit={can(effective, 'subscriptions', 'edit')}
        supabaseAccounts={accountsWithProjects}
        pickerProjects={pickerProjects}
      />
    </div>
  )
}
