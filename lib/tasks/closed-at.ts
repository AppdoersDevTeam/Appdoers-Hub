import type { TaskStatus } from '@/lib/types/database'

export function closedAtForStatus(
  nextStatus: TaskStatus,
  previousStatus?: string | null,
  previousClosedAt?: string | null
): string | null {
  if (nextStatus !== 'closed') return null
  if (previousStatus === 'closed' && previousClosedAt) return previousClosedAt
  return new Date().toISOString()
}
