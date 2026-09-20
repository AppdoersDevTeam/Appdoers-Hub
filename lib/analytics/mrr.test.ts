import { describe, expect, it } from 'vitest'
import { clientRunRateMrr, recurringFeeToMonthly } from '@/lib/clients/billing'
import { aggregateClientMrr } from '@/lib/analytics/mrr'
import {
  subscriptionCostToMonthly,
  subscriptionCostToYearly,
} from '@/lib/subscriptions/billing'

describe('recurringFeeToMonthly', () => {
  it('keeps monthly fees as-is', () => {
    expect(recurringFeeToMonthly(199, 'monthly')).toBe(199)
  })

  it('converts weekly fees using 52 weeks / 12 months', () => {
    expect(recurringFeeToMonthly(50, 'weekly')).toBeCloseTo((50 * 52) / 12)
  })

  it('converts yearly fees to monthly', () => {
    expect(recurringFeeToMonthly(1200, 'yearly')).toBe(100)
  })
})

describe('clientRunRateMrr', () => {
  it('adds add-on monthly fees on top of the plan run-rate', () => {
    expect(clientRunRateMrr(199, 'monthly', 12)).toBe(211)
  })

  it('counts add-ons when the plan fee is zero', () => {
    expect(clientRunRateMrr(0, 'monthly', 24)).toBe(24)
  })

  it('normalizes yearly plan fees before adding add-ons', () => {
    expect(clientRunRateMrr(1200, 'yearly', 10)).toBe(110)
  })
})

describe('aggregateClientMrr', () => {
  it('sums plan plus add-ons and counts paying clients by MRR > 0', () => {
    const result = aggregateClientMrr(
      [
        { id: 'a', monthly_fee: 199, billing_cycle: 'monthly' },
        { id: 'b', monthly_fee: 0, billing_cycle: 'monthly' },
        { id: 'c', monthly_fee: 1200, billing_cycle: 'yearly' },
      ],
      [
        { client_id: 'b', monthly_fee: 12 },
        { client_id: 'a', monthly_fee: 8 },
      ]
    )

    expect(result.mrr).toBeCloseTo(199 + 8 + 12 + 100)
    expect(result.payingClientCount).toBe(3)
  })

  it('does not count $0-plan clients with no add-ons as paying', () => {
    const result = aggregateClientMrr(
      [{ id: 'a', monthly_fee: 0, billing_cycle: 'monthly' }],
      []
    )
    expect(result.mrr).toBe(0)
    expect(result.payingClientCount).toBe(0)
  })
})

describe('subscription cost conversion', () => {
  it('treats one-off tools as $0 monthly and yearly', () => {
    expect(subscriptionCostToMonthly(499, 'one_off')).toBe(0)
    expect(subscriptionCostToYearly(499, 'one_off')).toBe(0)
  })

  it('spreads multi-year costs evenly', () => {
    expect(subscriptionCostToMonthly(360, 'months_36')).toBe(10)
    expect(subscriptionCostToYearly(360, 'months_36')).toBe(120)
  })

  it('converts quarterly costs to a monthly equivalent', () => {
    expect(subscriptionCostToMonthly(90, 'quarterly')).toBe(30)
  })
})
