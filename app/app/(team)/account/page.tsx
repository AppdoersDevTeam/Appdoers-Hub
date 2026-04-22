import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { ProfileEditor } from '@/components/team/account/profile-editor'

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Account"
        subtitle="Manage your profile and password"
      />
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
