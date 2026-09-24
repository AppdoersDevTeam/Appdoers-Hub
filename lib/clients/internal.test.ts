import { describe, expect, it } from 'vitest'
import {
  countActiveClientWebsites,
  formatWebsitePlanSubtitle,
  isInternalClient,
  isInternalClientName,
  planTitleLooksLikeWebsite,
  resolveClientPlanTitle,
  websitePlanFamilyLabel,
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

describe('planTitleLooksLikeWebsite', () => {
  it('matches any title containing the word website', () => {
    expect(planTitleLooksLikeWebsite('Basic Website')).toBe(true)
    expect(planTitleLooksLikeWebsite('Shopify Website')).toBe(true)
    expect(planTitleLooksLikeWebsite('Full Website (48 months)')).toBe(true)
    expect(planTitleLooksLikeWebsite('Email Hosting')).toBe(false)
    expect(planTitleLooksLikeWebsite(null)).toBe(false)
  })
})

describe('resolveClientPlanTitle', () => {
  it('prefers catalog name, then legacy enum labels', () => {
    expect(
      resolveClientPlanTitle({
        catalog_plan_name: 'Shopify Website',
        subscription_plan: 'none',
      })
    ).toBe('Shopify Website')
    expect(resolveClientPlanTitle({ subscription_plan: 'basic' })).toBe('Basic Website')
    expect(resolveClientPlanTitle({ subscription_plan: 'none' })).toBe(null)
  })
})

describe('websitePlanFamilyLabel', () => {
  it('strips Website and term suffixes for subtitle chips', () => {
    expect(websitePlanFamilyLabel('Basic Website (12 months)')).toBe('Basic')
    expect(websitePlanFamilyLabel('Shopify Website')).toBe('Shopify')
    expect(websitePlanFamilyLabel('Full Website')).toBe('Full')
  })
})

describe('countActiveClientWebsites', () => {
  it('counts any website-titled plan and excludes Appdoers', () => {
    const result = countActiveClientWebsites([
      { company_name: 'Church A', status: 'active', subscription_plan: 'basic' },
      { company_name: 'Church B', status: 'active', subscription_plan: 'full' },
      {
        company_name: 'Shop Client',
        status: 'active',
        subscription_plan: 'none',
        catalog_plan_name: 'Shopify Website',
      },
      { company_name: 'Church C', status: 'active', subscription_plan: 'none' },
      { company_name: 'Church D', status: 'inactive', subscription_plan: 'full' },
      {
        company_name: 'Appdoers',
        status: 'active',
        catalog_plan_name: 'Shopify Website',
        is_internal: true,
      },
    ])

    expect(result.total).toBe(3)
    expect(result.families).toEqual({ Basic: 1, Full: 1, Shopify: 1 })
  })

  it('treats missing status as active when the query already filtered to active rows', () => {
    const result = countActiveClientWebsites([
      { company_name: 'Client', subscription_plan: 'basic' },
    ])
    expect(result.total).toBe(1)
  })

  it('uses catalog plan name when subscription_plan is none', () => {
    const result = countActiveClientWebsites([
      {
        company_name: 'Catalog Basic',
        status: 'active',
        subscription_plan: 'none',
        catalog_plan_name: 'Basic Website (12 months)',
        catalog_plan_key: 'basic',
      },
      {
        company_name: 'Shopify Client',
        status: 'active',
        subscription_plan: 'none',
        catalog_plan_name: 'Shopify Website',
        catalog_plan_key: 'shopify',
      },
    ])
    expect(result.total).toBe(2)
    expect(result.families.Shopify).toBe(1)
    expect(result.families.Basic).toBe(1)
  })
})

describe('formatWebsitePlanSubtitle', () => {
  it('shows family counts, or a fallback when empty', () => {
    expect(formatWebsitePlanSubtitle({ Basic: 2, Full: 1, Shopify: 1 })).toBe(
      '2 Basic · 1 Full · 1 Shopify'
    )
    expect(formatWebsitePlanSubtitle({})).toBe('With a website plan')
  })
})
