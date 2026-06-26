import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/team/sign-out-button'

export async function TopBar() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let teamUser = null
  if (user) {
    const { data } = await supabase
      .from('team_users')
      .select('full_name, role, avatar_url')
      .eq('id', user.id)
      .single()
    teamUser = data
  }

  const initials = teamUser?.full_name
    ? teamUser.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  const roleLabel: Record<string, string> = {
    director: 'Director',
    account_manager: 'Account Manager',
    developer: 'Developer',
    designer: 'Designer',
  }

  return (
    <header className="fixed right-0 top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6 left-60">
      {/* Breadcrumb placeholder — filled per page */}
      <div id="topbar-breadcrumb" />

      {/* User area */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900">{teamUser?.full_name ?? 'Team Member'}</p>
          <p className="text-xs text-slate-500">{roleLabel[teamUser?.role ?? ''] ?? 'Team'}</p>
        </div>
        {teamUser?.avatar_url ? (
          <img
            src={teamUser.avatar_url}
            alt={teamUser.full_name}
            className="h-8 w-8 rounded-full object-cover border border-slate-200"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
            {initials}
          </div>
        )}
        <SignOutButton />
      </div>
    </header>
  )
}
