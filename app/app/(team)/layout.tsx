import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/team/sidebar'
import { TopBar } from '@/components/team/topbar'
import { HubCommandPalette } from '@/components/team/hub-command-palette'
import { getEffectivePermissions, getHiddenHrefs } from '@/lib/permissions'
import { redirect } from 'next/navigation'

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/app/login')
  }

  const { data: teamUser } = await supabase
    .from('team_users')
    .select('role, permissions')
    .eq('id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!teamUser) {
    redirect('/app/login')
  }

  const effective = getEffectivePermissions(
    teamUser.role,
    (teamUser.permissions ?? {}) as Record<string, string>
  )
  const hiddenHrefs = getHiddenHrefs(effective)

  return (
    <div className="theme-team min-h-screen bg-[#F8FAFC]">
      <Sidebar hiddenHrefs={hiddenHrefs} />
      <TopBar />
      <HubCommandPalette />
      <main className="ml-60 pt-14">
        <div className="animate-fade-in p-6">{children}</div>
      </main>
    </div>
  )
}
