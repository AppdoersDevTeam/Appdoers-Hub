import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { SubscriptionsTable } from '@/components/team/subscriptions/subscriptions-table'
import { getEffectivePermissions, can } from '@/lib/permissions'

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

  const { data: subscriptions } = await supabase
    .from('agency_subscriptions')
    .select('id, name, category, plan_name, billing_cycle, cost, renewal_date, status, url, notes')
    .order('status')
    .order('name')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        subtitle="Tools and services Appdoers pays for"
      />
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
      />
    </div>
  )
}
