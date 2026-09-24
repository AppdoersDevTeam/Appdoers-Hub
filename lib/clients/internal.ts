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

export function isWebsitePlan(plan: string | null | undefined): plan is 'basic' | 'full' {
  return plan === 'basic' || plan === 'full'
}

/** Prefer catalog plan_key when present; otherwise legacy subscription_plan enum. */
export function resolveWebsitePlanKey(client: {
  subscription_plan?: string | null
  catalog_plan_key?: string | null
}): 'basic' | 'full' | null {
  if (isWebsitePlan(client.catalog_plan_key)) return client.catalog_plan_key
  if (isWebsitePlan(client.subscription_plan)) return client.subscription_plan
  return null
}

export function countActiveClientWebsites(
  clients: Array<
    InternalClientHint & {
      status?: string | null
      subscription_plan?: string | null
      catalog_plan_key?: string | null
    }
  >
): { total: number; basic: number; full: number } {
  let basic = 0
  let full = 0
  for (const client of clients) {
    if (isInternalClient(client)) continue
    if (client.status && client.status !== 'active') continue
    const key = resolveWebsitePlanKey(client)
    if (!key) continue
    if (key === 'basic') basic += 1
    else full += 1
  }
  return { total: basic + full, basic, full }
}

export function formatWebsitePlanSubtitle(basic: number, full: number): string {
  if (basic === 0 && full === 0) return 'With a website plan'
  return `${basic} Basic · ${full} Full`
}
