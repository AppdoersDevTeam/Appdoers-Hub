import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { ServiceCatalogTable } from '@/components/team/settings/service-catalog-table'
import { SettingsEditor } from '@/components/team/settings/settings-editor'
import { TeamPermissions } from '@/components/team/settings/team-permissions'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  const supabase = await createClient()

  // Director-only
  const { data: { user } } = await supabase.auth.getUser()
  const { data: teamUser } = await supabase
    .from('team_users')
    .select('role')
    .eq('id', user?.id ?? '')
    .single()

  if (teamUser?.role !== 'director') {
    redirect('/app/dashboard')
  }

  const [{ data: services }, { data: settings }, { data: teamMembers }] = await Promise.all([
    supabase.from('service_catalog').select('*').order('sort_order'),
    supabase.from('settings').select('key, value'),
    supabase.from('team_users').select('id, full_name, email, role, permissions').order('role').order('full_name'),
  ])

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" subtitle="Director access only" />

      {/* Editable settings */}
      <SettingsEditor settings={(settings ?? []) as { key: string; value: Record<string, unknown> }[]} />

      {/* Team Permissions */}
      <TeamPermissions
        members={(teamMembers ?? []).map(m => ({
          id: m.id as string,
          full_name: m.full_name as string,
          email: m.email as string,
          role: m.role as string,
          permissions: (m.permissions ?? {}) as Record<string, string>,
        }))}
      />

      {/* Service Catalog */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[#F1F5F9]">Service Catalog</h2>
          <p className="text-sm text-[#475569]">Manage plans and add-ons used in proposals.</p>
        </div>
        <ServiceCatalogTable services={services ?? []} />
      </div>
    </div>
  )
}
