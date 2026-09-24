import type { SupabaseClient } from '@supabase/supabase-js'

export function missingInternalClientColumn(error: { message?: string } | null | undefined): boolean {
  return /is_internal/i.test(error?.message ?? '')
}

export async function selectWithInternalClientFallback<T>(
  withFlag: () => PromiseLike<{ data: T | null; error: { message?: string } | null }>,
  withoutFlag: () => PromiseLike<{ data: T | null; error: { message?: string } | null }>
): Promise<{ data: T | null; error: { message?: string } | null }> {
  const first = await withFlag()
  if (!first.error || !missingInternalClientColumn(first.error)) return first
  return withoutFlag()
}

export async function selectActiveClientsForStats(supabase: SupabaseClient) {
  return selectWithInternalClientFallback(
    () =>
      supabase
        .from('clients')
        .select(
          'id, company_name, monthly_fee, billing_cycle, subscription_plan, plan_service_id, is_internal, status, service_catalog:plan_service_id(plan_key, name)'
        )
        .eq('status', 'active'),
    () =>
      supabase
        .from('clients')
        .select(
          'id, company_name, monthly_fee, billing_cycle, subscription_plan, plan_service_id, status, service_catalog:plan_service_id(plan_key, name)'
        )
        .eq('status', 'active')
  )
}
