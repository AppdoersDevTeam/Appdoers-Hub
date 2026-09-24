'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTeamAccess } from '@/lib/supabase/route-access'

export type NotificationRow = {
  id: string
  type: string
  title: string
  body: string | null
  href: string | null
  read_at: string | null
  created_at: string
}

export async function listMyNotificationsAction(): Promise<NotificationRow[]> {
  const access = await requireTeamAccess()
  if (!access.ok) return []

  const { data } = await access.db
    .from('notifications')
    .select('id, type, title, body, href, read_at, created_at')
    .eq('team_user_id', access.userId)
    .order('created_at', { ascending: false })
    .limit(40)

  return (data ?? []) as NotificationRow[]
}

export async function markNotificationReadAction(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('team_user_id', user.id)
    .is('read_at', null)

  revalidatePath('/app/dashboard')
}

export async function markAllNotificationsReadAction() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('team_user_id', user.id)
    .is('read_at', null)

  revalidatePath('/app/dashboard')
}
