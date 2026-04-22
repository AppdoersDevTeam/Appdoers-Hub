import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/team/sidebar'
import { TopBar } from '@/components/team/topbar'
import { getEffectivePermissions, getHiddenHrefs } from '@/lib/permissions'

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let hiddenHrefs: string[] = []

  if (user) {
    const { data: teamUser } = await supabase
      .from('team_users')
      .select('role, permissions')
      .eq('id', user.id)
      .single()

    if (teamUser) {
      const effective = getEffectivePermissions(
        teamUser.role,
        (teamUser.permissions ?? {}) as Record<string, string>
      )
      hiddenHrefs = getHiddenHrefs(effective)
    }
  }

  return (
    <div className="theme-team min-h-screen bg-[#0A0F1E]">
      <Sidebar hiddenHrefs={hiddenHrefs} />
      <TopBar />
      <main className="ml-60 pt-14">
        <div className="animate-fade-in p-6">{children}</div>
      </main>
    </div>
  )
}
