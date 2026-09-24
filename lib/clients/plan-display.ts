import { PLAN_LABELS } from '@/lib/constants/plans'

export type ClientPlanDisplayInput = {
  subscription_plan?: string | null
  plan_service_id?: string | null
  catalogName?: string | null
  catalogPlans?: Array<{ id: string; name: string; plan_key?: string | null; contract_months?: number | null }>
  contract_months?: number | null
  noneLabel?: string
}

/**
 * Prefer service catalog name via plan_service_id; fall back to legacy enum labels.
 * Keeps list, detail, and Slack plan labels on one source of truth.
 */
export function resolveClientPlanDisplayName(input: ClientPlanDisplayInput): string {
  const noneLabel = input.noneLabel ?? PLAN_LABELS.none ?? 'No Plan'

  if (input.catalogName?.trim()) return input.catalogName.trim()

  const planServiceId = input.plan_service_id
  if (planServiceId && input.catalogPlans?.length) {
    const byId = input.catalogPlans.find((p) => p.id === planServiceId)
    if (byId?.name) return byId.name
  }

  const subscriptionPlan = input.subscription_plan
  if (subscriptionPlan && subscriptionPlan !== 'none' && input.catalogPlans?.length) {
    const byKey = input.catalogPlans.find(
      (p) =>
        p.plan_key === subscriptionPlan &&
        (input.contract_months == null ||
          p.contract_months == null ||
          p.contract_months === input.contract_months)
    )
    if (byKey?.name) return byKey.name
  }

  if (!subscriptionPlan || subscriptionPlan === 'none') return noneLabel
  return PLAN_LABELS[subscriptionPlan] ?? subscriptionPlan
}
