import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReviewStatus } from './types'

export type FeedbackRoundItem = {
  id: string
  clientId: string
  clientName: string
  roundNumber: number
  group: 'overdue' | 'awaiting_us' | 'awaiting_client'
  /** Days since sent (awaiting client) or since received (awaiting us). */
  days: number
  dueDate: string | null
  ownerName: string | null
}

const OPEN_STATUSES: ReviewStatus[] = ['sent', 'in_progress', 'reopened', 'submitted']
const GROUP_ORDER = { overdue: 0, awaiting_us: 1, awaiting_client: 2 } as const

function daysSince(iso: string | null, now: number) {
  if (!iso) return 0
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86_400_000))
}

export async function getFeedbackRoundItems(supabase: SupabaseClient): Promise<FeedbackRoundItem[]> {
  const { data } = await supabase
    .from('website_reviews')
    .select('id, client_id, round_number, status, sent_at, submitted_at, due_date, clients(company_name), owner:team_users!website_reviews_owner_id_fkey(full_name)')
    .in('status', OPEN_STATUSES)
    .order('updated_at', { ascending: false })
    .limit(50)

  const now = Date.now()
  const today = new Date().toISOString().slice(0, 10)

  return (data ?? [])
    .map((row) => {
      const client = Array.isArray(row.clients) ? row.clients[0] : row.clients
      const owner = Array.isArray(row.owner) ? row.owner[0] : row.owner
      const awaitingUs = row.status === 'submitted'
      const overdue = awaitingUs && Boolean(row.due_date && row.due_date < today)
      return {
        id: row.id as string,
        clientId: row.client_id as string,
        clientName: (client?.company_name as string | undefined) ?? 'Client',
        roundNumber: row.round_number as number,
        group: overdue ? 'overdue' : awaitingUs ? 'awaiting_us' : 'awaiting_client',
        days: daysSince(awaitingUs ? row.submitted_at : row.sent_at, now),
        dueDate: (row.due_date as string | null) ?? null,
        ownerName: (owner?.full_name as string | undefined) ?? null,
      } satisfies FeedbackRoundItem
    })
    .sort((a, b) => GROUP_ORDER[a.group] - GROUP_ORDER[b.group] || b.days - a.days)
}
