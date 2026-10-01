import { describe, expect, it } from 'vitest'
import { planEndDate } from './plan-dates'

describe('planEndDate', () => {
  it('adds the contract term to the start date', () => {
    expect(planEndDate('2026-03-15', 12)).toBe('2027-03-15')
    expect(planEndDate('2026-01-01', 48)).toBe('2030-01-01')
  })

  it('clamps to the last day of shorter months', () => {
    expect(planEndDate('2026-01-31', 1)).toBe('2026-02-28')
  })

  it('returns null without a start date or term', () => {
    expect(planEndDate(null, 12)).toBeNull()
    expect(planEndDate('2026-01-01', null)).toBeNull()
    expect(planEndDate('bad', 12)).toBeNull()
  })
})
