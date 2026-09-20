import { describe, expect, it } from 'vitest'
import {
  addDaysYmd,
  bucketKeyForDate,
  getPeriodRange,
  mondayOnOrBefore,
  nzYmd,
} from '@/lib/dashboard/periods'
import { closedAtForStatus } from '@/lib/tasks/closed-at'
import { outcomeAtForStatus } from '@/lib/leads/outcome-at'

describe('NZ dashboard periods', () => {
  it('uses this NZ calendar week Monday–Sunday', () => {
    const range = getPeriodRange('week', new Date('2026-09-20T05:00:00.000Z'))
    expect(range.start).toBe('2026-09-14')
    expect(range.end).toBe('2026-09-20')
    expect(range.bucketSize).toBe('day')
  })

  it('uses this NZ calendar month', () => {
    const range = getPeriodRange('month', new Date('2026-09-20T05:00:00.000Z'))
    expect(range.start).toBe('2026-09-01')
    expect(range.end).toBe('2026-09-30')
    expect(range.label).toContain('September')
  })

  it('uses this NZ calendar quarter', () => {
    const range = getPeriodRange('quarter', new Date('2026-09-20T05:00:00.000Z'))
    expect(range.start).toBe('2026-07-01')
    expect(range.end).toBe('2026-09-30')
    expect(range.bucketSize).toBe('week')
    expect(bucketKeyForDate('2026-09-16', range)).toBe('2026-09-14')
  })

  it('reports NZ calendar dates independently of UTC', () => {
    expect(nzYmd(new Date('2026-09-19T12:00:00.000Z'))).toBe('2026-09-20')
    expect(mondayOnOrBefore('2026-09-20')).toBe('2026-09-14')
    expect(addDaysYmd('2026-09-14', 6)).toBe('2026-09-20')
  })
})

describe('closed_at / outcome_at helpers', () => {
  it('sets closed_at when a task first closes and keeps it on later closed updates', () => {
    const first = closedAtForStatus('closed', 'open', null)
    expect(first).toBeTruthy()
    expect(closedAtForStatus('closed', 'closed', first)).toBe(first)
    expect(closedAtForStatus('open', 'closed', first)).toBeNull()
  })

  it('sets outcome_at when a lead is won or lost and clears it if returned to pipeline', () => {
    const first = outcomeAtForStatus('won', 'proposal_sent', null)
    expect(first).toBeTruthy()
    const switched = outcomeAtForStatus('lost', 'won', first)
    expect(switched).toBeTruthy()
    expect(outcomeAtForStatus('won', 'won', first)).toBe(first)
    expect(outcomeAtForStatus('contacted', 'won', first)).toBeNull()
  })
})
