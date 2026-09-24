import { describe, expect, it } from 'vitest'
import { resolveClientPlanDisplayName } from './plan-display'

describe('resolveClientPlanDisplayName', () => {
  it('prefers catalog name over enum', () => {
    expect(
      resolveClientPlanDisplayName({
        subscription_plan: 'none',
        plan_service_id: 'abc',
        catalogName: 'Shopify Website',
      })
    ).toBe('Shopify Website')
  })

  it('falls back to enum labels', () => {
    expect(
      resolveClientPlanDisplayName({
        subscription_plan: 'full',
      })
    ).toBe('Full Website')
  })

  it('returns No Plan when none', () => {
    expect(
      resolveClientPlanDisplayName({
        subscription_plan: 'none',
      })
    ).toBe('No Plan')
  })
})
