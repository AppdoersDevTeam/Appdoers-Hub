import { createServiceClient } from '@/lib/supabase/server'

export type NotificationType =
  | 'mention'
  | 'assigned'
  | 'contract_signed'
  | 'overdue'
  | 'note'

export async function createNotifications(
  entries: {
    teamUserId: string
    type: NotificationType
    title: string
    body?: string | null
    entityType?: string | null
    entityId?: string | null
    href?: string | null
  }[]
) {
  const rows = entries.filter((entry) => entry.teamUserId)
  if (rows.length === 0) return

  const service = await createServiceClient()
  await service.from('notifications').insert(
    rows.map((entry) => ({
      team_user_id: entry.teamUserId,
      type: entry.type,
      title: entry.title,
      body: entry.body ?? null,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      href: entry.href ?? null,
    }))
  )
}

export async function listActiveTeamUsers(
  service?: Awaited<ReturnType<typeof createServiceClient>>
) {
  const db = service ?? (await createServiceClient())
  const { data } = await db
    .from('team_users')
    .select('id, full_name, role')
    .eq('is_active', true)
  return data ?? []
}

export function mentionedUserIds(
  text: string,
  members: { id: string; full_name: string }[],
  excludeId?: string
) {
  const ids: string[] = []
  for (const member of members) {
    if (member.id === excludeId) continue
    const needle = `@${member.full_name}`
    if (text.toLowerCase().includes(needle.toLowerCase())) {
      ids.push(member.id)
    }
  }
  return ids
}
