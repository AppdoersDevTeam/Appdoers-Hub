import type { LeadStatus } from '@/lib/types/database'

export function isLeadOutcomeStatus(status: string | null | undefined): boolean {
  return status === 'won' || status === 'lost'
}

export function outcomeAtForStatus(
  nextStatus: LeadStatus,
  previousStatus?: string | null,
  previousOutcomeAt?: string | null
): string | null {
  if (!isLeadOutcomeStatus(nextStatus)) return null
  if (previousStatus === nextStatus && previousOutcomeAt) return previousOutcomeAt
  return new Date().toISOString()
}
