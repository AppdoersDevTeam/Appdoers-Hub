import { PLAN_LABELS } from '@/lib/constants/plans'

export type InternalClientHint = {
  is_internal?: boolean | null
  company_name?: string | null
}

const INTERNAL_COMPANY_NAMES = new Set(['appdoers', 'appdoers limited'])

export function isInternalClientName(companyName: string | null | undefined): boolean {
  const name = (companyName ?? '').trim().toLowerCase()
  return INTERNAL_COMPANY_NAMES.has(name)
}

export function isInternalClient(client: InternalClientHint): boolean {
  if (client.is_internal) return true
  return isInternalClientName(client.company_name)
}

/** True when a plan title includes "website" (e.g. Basic Website, Shopify Website). */
export function planTitleLooksLikeWebsite(title: string | null | undefined): boolean {
  return /\bwebsite\b/i.test((title ?? '').trim())
}

/**
 * Resolve the display plan title used for website KPI matching.
 * Prefer catalog name; fall back to legacy enum labels (Basic Website / Full Website).
 */
export function resolveClientPlanTitle(client: {
  subscription_plan?: string | null
  catalog_plan_key?: string | null
  catalog_plan_name?: string | null
}): string | null {
  const catalogName = client.catalog_plan_name?.trim()
  if (catalogName) return catalogName

  const key = client.catalog_plan_key || client.subscription_plan
  if (!key || key === 'none') return null
  return PLAN_LABELS[key] ?? key
}

/** Short subtitle label: "Basic Website (12 months)" → "Basic", "Shopify Website" → "Shopify". */
export function websitePlanFamilyLabel(planTitle: string): string {
  return planTitle
    .replace(/\([^)]*\)/g, '')
    .replace(/\bwebsite\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || planTitle.trim()
}

export function countActiveClientWebsites(
  clients: Array<
    InternalClientHint & {
      status?: string | null
      subscription_plan?: string | null
      catalog_plan_key?: string | null
      catalog_plan_name?: string | null
    }
  >
): { total: number; families: Record<string, number> } {
  const families: Record<string, number> = {}
  let total = 0

  for (const client of clients) {
    if (isInternalClient(client)) continue
    if (client.status && client.status !== 'active') continue

    const title = resolveClientPlanTitle(client)
    if (!planTitleLooksLikeWebsite(title)) continue

    total += 1
    const family = websitePlanFamilyLabel(title!)
    families[family] = (families[family] ?? 0) + 1
  }

  return { total, families }
}

export function formatWebsitePlanSubtitle(families: Record<string, number>): string {
  const parts = Object.entries(families)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => `${count} ${label}`)

  if (parts.length === 0) return 'With a website plan'
  return parts.join(' · ')
}

/** @deprecated Prefer planTitleLooksLikeWebsite + resolveClientPlanTitle */
export function isWebsitePlan(plan: string | null | undefined): plan is 'basic' | 'full' {
  return plan === 'basic' || plan === 'full'
}
