import { describe, expect, it } from 'vitest'
import {
  computePartnershipProfit,
  type PartnershipClientInput,
  type PartnershipSubInput,
} from '@/lib/analytics/partnership'

const NOW = new Date('2026-10-06T00:00:00Z')

function client(overrides: Partial<PartnershipClientInput> = {}): PartnershipClientInput {
  return {
    id: 'c1',
    company_name: 'Client One',
    monthly_fee: 200,
    billing_cycle: 'monthly',
    setup_fee: 0,
    subscription_start_date: '2025-01-01',
    is_partnership: true,
    ...overrides,
  }
}

function sub(overrides: Partial<PartnershipSubInput> = {}): PartnershipSubInput {
  return {
    id: 's1',
    name: 'Vercel',
    cost: 50,
    billing_cycle: 'monthly',
    is_partnership: true,
    ...overrides,
  }
}

describe('computePartnershipProfit', () => {
  it('computes clients - expenses = profit and splits it 50/50', () => {
    const result = computePartnershipProfit({
      clients: [client()],
      addons: [{ client_id: 'c1', monthly_fee: 20 }],
      subscriptions: [sub()],
      now: NOW,
    })
    expect(result.monthlyRevenue).toBe(220)
    expect(result.monthlyExpenses).toBe(50)
    expect(result.monthlyProfit).toBe(170)
    expect(result.monthlyShare).toBe(85)
    expect(result.yearlyProfit).toBe(170 * 12)
    expect(result.yearlyShare).toBe(85 * 12)
  })

  it('moves Fabiano-only clients and subscriptions to excluded', () => {
    const result = computePartnershipProfit({
      clients: [client(), client({ id: 'c2', company_name: 'Fab Co', is_partnership: false })],
      addons: [],
      subscriptions: [sub(), sub({ id: 's2', name: 'Fab Tool', cost: 30, is_partnership: false })],
      now: NOW,
    })
    expect(result.monthlyRevenue).toBe(200)
    expect(result.monthlyExpenses).toBe(50)
    expect(result.excluded.clients.map((c) => c.name)).toEqual(['Fab Co'])
    expect(result.excluded.subscriptions.map((s) => s.name)).toEqual(['Fab Tool'])
    expect(result.excluded.monthlyRevenue).toBe(200)
    expect(result.excluded.monthlyExpenses).toBe(30)
  })

  it('adds setup fees only for shared clients that started this calendar year', () => {
    const result = computePartnershipProfit({
      clients: [
        client({ id: 'a', setup_fee: 1000, subscription_start_date: '2026-03-01' }),
        client({ id: 'b', setup_fee: 500, subscription_start_date: '2025-12-31' }),
        client({ id: 'c', setup_fee: 700, subscription_start_date: '2026-05-01', is_partnership: false }),
        client({ id: 'd', setup_fee: 300, subscription_start_date: null }),
      ],
      addons: [],
      subscriptions: [],
      now: NOW,
    })
    expect(result.setupFeesThisYear).toBe(1000)
    expect(result.yearlyProfit).toBe(600 * 12 + 1000)
    expect(result.yearlyShare).toBe((600 * 12 + 1000) / 2)
  })

  it('keeps a setup-fee-only client in the list even with no recurring fee', () => {
    const result = computePartnershipProfit({
      clients: [client({ monthly_fee: 0, setup_fee: 900, subscription_start_date: '2026-08-01' })],
      addons: [],
      subscriptions: [],
      now: NOW,
    })
    expect(result.clients).toHaveLength(1)
    expect(result.monthlyRevenue).toBe(0)
    expect(result.setupFeesThisYear).toBe(900)
  })

  it('normalizes yearly fees and subscriptions to monthly', () => {
    const result = computePartnershipProfit({
      clients: [client({ monthly_fee: 2400, billing_cycle: 'yearly' })],
      addons: [],
      subscriptions: [sub({ cost: 120, billing_cycle: 'yearly' })],
      now: NOW,
    })
    expect(result.monthlyRevenue).toBe(200)
    expect(result.monthlyExpenses).toBe(10)
    expect(result.yearlyExpenses).toBe(120)
  })

  it('reports a loss as a negative profit and share', () => {
    const result = computePartnershipProfit({
      clients: [client({ monthly_fee: 40 })],
      addons: [],
      subscriptions: [sub({ cost: 100 })],
      now: NOW,
    })
    expect(result.monthlyProfit).toBe(-60)
    expect(result.monthlyShare).toBe(-30)
  })
})
