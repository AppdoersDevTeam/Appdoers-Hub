import { describe, expect, it } from 'vitest'
import {
  countActiveClientWebsites,
  formatWebsitePlanSubtitle,
  isInternalClient,
  isInternalClientName,
  isWebsitePlan,
} from './internal'

describe('isInternalClientName', () => {
  it('matches Appdoers and Appdoers Limited regardless of case or spacing', () => {
    expect(isInternalClientName('Appdoers')).toBe(true)
    expect(isInternalClientName('  APPDOERS LIMITED  ')).toBe(true)
    expect(isInternalClientName('Ashburton Baptist Church')).toBe(false)
    expect(isInternalClientName('Appdoers Website')).toBe(false)
  })
})

describe('isInternalClient', () => {
  it('treats the is_internal flag as authoritative', () => {
    expect(isInternalClient({ is_internal: true, company_name: 'Church' })).toBe(true)
    expect(isInternalClient({ is_internal: false, company_name: 'Church' })).toBe(false)
  })

  it('falls back to company name when the flag is missing', () => {
    expect(isInternalClient({ company_name: 'Appdoers' })).toBe(true)
    expect(isInternalClient({ is_internal: false, company_name: 'Appdoers' })).toBe(true)
  })
})

describe('isWebsitePlan', () => {
  it('only counts Basic and Full plans', () => {
    expect(isWebsitePlan('basic')).toBe(true)
    expect(isWebsitePlan('full')).toBe(true)
    expect(isWebsitePlan('none')).toBe(false)
    expect(isWebsitePlan(null)).toBe(false)
  })
})

describe('countActiveClientWebsites', () => {
  it('counts active Basic/Full clients and excludes Appdoers', () => {
    const result = countActiveClientWebsites([
      { company_name: 'Church A', status: 'active', subscription_plan: 'basic' },
      { company_name: 'Church B', status: 'active', subscription_plan: 'full' },
      { company_name: 'Church C', status: 'active', subscription_plan: 'none' },
      { company_name: 'Church D', status: 'inactive', subscription_plan: 'full' },
      { company_name: 'Appdoers', status: 'active', subscription_plan: 'full', is_internal: true },
    ])

    expect(result).toEqual({ total: 2, basic: 1, full: 1 })
  })

  it('treats missing status as active when the query already filtered to active rows', () => {
    const result = countActiveClientWebsites([
      { company_name: 'Client', subscription_plan: 'basic' },
    ])
    expect(result.total).toBe(1)
  })

  it('uses catalog plan_key when subscription_plan is none', () => {
    const result = countActiveClientWebsites([
      {
        company_name: 'Catalog Basic',
        status: 'active',
        subscription_plan: 'none',
        catalog_plan_key: 'basic',
      },
      {
        company_name: 'Shopify Client',
        status: 'active',
        subscription_plan: 'none',
        catalog_plan_key: 'shopify',
      },
    ])
    expect(result).toEqual({ total: 1, basic: 1, full: 0 })
  })
})

describe('formatWebsitePlanSubtitle', () => {
  it('shows the plan split, or a fallback when empty', () => {
    expect(formatWebsitePlanSubtitle(2, 1)).toBe('2 Basic · 1 Full')
    expect(formatWebsitePlanSubtitle(0, 0)).toBe('With a website plan')
  })
})
