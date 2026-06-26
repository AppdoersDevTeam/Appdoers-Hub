import { redirect } from 'next/navigation'
import os from 'node:os'
import path from 'node:path'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { ProfileEditor } from '@/components/team/account/profile-editor'
import { CursorSetupPanel } from '@/components/team/account/cursor-setup-panel'
import { listMyCursorTokensAction } from '@/lib/actions/cursor-tokens'

export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: teamUser } = await supabase
    .from('team_users')
    .select('id, email, full_name, role, phone, title, avatar_url')
    .eq('id', user.id)
    .single()

  if (!teamUser) redirect('/login')

  const tokensResult = await listMyCursorTokensAction()
  const tokens = tokensResult.success ? tokensResult.data : []

  const hubUrl =
    process.env.APPDOERS_HUB_URL?.replace(/\/+$/, '') ??
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') ??
    'https://appdoers-hub-two.vercel.app'

  const hubEnvPath = path.join(
    process.env.USERPROFILE || process.env.HOME || os.homedir(),
    '.appdoers',
    'hub.env'
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Account"
        subtitle="Profile, password, and Cursor connection"
      />
      <CursorSetupPanel tokens={tokens} hubUrl={hubUrl} hubEnvPath={hubEnvPath} />
      <ProfileEditor
        user={{
          id: teamUser.id as string,
          email: teamUser.email as string,
          full_name: teamUser.full_name as string,
          role: teamUser.role as string,
          phone: (teamUser.phone as string | null) ?? null,
          title: (teamUser.title as string | null) ?? null,
          avatar_url: (teamUser.avatar_url as string | null) ?? null,
        }}
      />
    </div>
  )
}
