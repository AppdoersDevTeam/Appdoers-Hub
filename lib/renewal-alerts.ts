import type { SupabaseClient } from '@supabase/supabase-js'
import {
  formatSubscriptionCost,
  isOneOffCycle,
  subscriptionBillingCycleLabel,
} from '@/lib/subscriptions/billing'
import {
  hubClientDomainsUrl,
  hubSubscriptionsUrl,
  sendSlackAlert,
  slackOpenHub,
  type SlackAlertInput,
} from '@/lib/slack'
import { APP_TIMEZONE, formatDate } from '@/lib/utils/format'

export const RENEWAL_MILESTONES = {
  month: 30,
  week: 7,
  day: 0,
} as const

export type RenewalMilestone = keyof typeof RENEWAL_MILESTONES
export type RenewalItemType = 'subscription' | 'domain'

export type RenewalCandidate = {
  itemType: RenewalItemType
  itemId: string
  dueDate: string
  daysUntil: number
  milestone: RenewalMilestone
  alert: SlackAlertInput
}

type NestedClient = { company_name?: string } | { company_name?: string }[] | null

function dateOnly(value: string): string {
  return value.slice(0, 10)
}

export function nzTodayYmd(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function addCalendarDays(ymd: string, days: number): string {
  const [year, month, day] = dateOnly(ymd).split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + days))
  const yyyy = String(next.getUTCFullYear())
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(next.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function calendarDaysUntil(targetYmd: string, todayYmd: string): number {
  const [ty, tm, td] = dateOnly(todayYmd).split('-').map(Number)
  const [ey, em, ed] = dateOnly(targetYmd).split('-').map(Number)
  return Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(ty, tm - 1, td)) / 86_400_000)
}

export function milestoneForDaysUntil(
  days: number,
  options?: { skipMonth?: boolean }
): RenewalMilestone | null {
  if (days === RENEWAL_MILESTONES.day) return 'day'
  if (days === RENEWAL_MILESTONES.week) return 'week'
  if (days === RENEWAL_MILESTONES.month && !options?.skipMonth) return 'month'
  return null
}

function clientName(nested: NestedClient, fallback = 'Company-wide'): string {
  const client = Array.isArray(nested) ? nested[0] : nested
  return client?.company_name?.trim() || fallback
}

function dueVerb(kind: 'renews' | 'expires', milestone: RenewalMilestone): string {
  if (milestone === 'day') return `${kind} today`
  if (milestone === 'week') return `${kind} in 1 week`
  return `${kind} in 1 month`
}

function milestoneLabel(milestone: RenewalMilestone): string {
  if (milestone === 'day') return 'Due today'
  if (milestone === 'week') return '1 week before'
  return '1 month before'
}

function buildSubscriptionAlert(input: {
  name: string
  planName: string | null
  billingCycle: string
  cost: number
  dueDate: string
  clientName: string
  milestone: RenewalMilestone
}): SlackAlertInput {
  const expires = isOneOffCycle(input.billingCycle)
  const verb = dueVerb(expires ? 'expires' : 'renews', input.milestone)
  const title = `${input.name} ${verb}`
  return {
    text: title,
    title,
    fields: [
      { label: 'Subscription', value: input.name },
      { label: 'Assigned to', value: input.clientName },
      { label: expires ? 'Expiry' : 'Renewal', value: formatDate(input.dueDate) },
      { label: 'Reminder', value: milestoneLabel(input.milestone) },
      { label: expires ? 'Amount' : 'Cost', value: formatSubscriptionCost(input.cost, input.billingCycle) },
      { label: 'Cycle', value: subscriptionBillingCycleLabel(input.billingCycle) },
      ...(input.planName ? [{ label: 'Plan', value: input.planName }] : []),
    ],
    action: slackOpenHub(hubSubscriptionsUrl()),
  }
}

function buildDomainAlert(input: {
  domainName: string
  dueDate: string
  autoRenew: boolean
  registrar: string | null
  clientName: string
  clientId: string
  milestone: RenewalMilestone
}): SlackAlertInput {
  const kind = input.autoRenew ? 'renews' : 'expires'
  const verb = dueVerb(kind, input.milestone)
  const title = `${input.domainName} ${verb}`
  return {
    text: title,
    title,
    fields: [
      { label: 'Domain', value: input.domainName },
      { label: 'Client', value: input.clientName },
      { label: input.autoRenew ? 'Renewal' : 'Expiry', value: formatDate(input.dueDate) },
      { label: 'Reminder', value: milestoneLabel(input.milestone) },
      { label: 'Auto-renew', value: input.autoRenew ? 'Enabled' : 'Off — will lapse unless renewed' },
      ...(input.registrar ? [{ label: 'Registrar', value: input.registrar }] : []),
    ],
    action: slackOpenHub(hubClientDomainsUrl(input.clientId)),
  }
}

export async function collectRenewalCandidates(
  supabase: SupabaseClient,
  today = nzTodayYmd()
): Promise<RenewalCandidate[]> {
  const horizon = addCalendarDays(today, RENEWAL_MILESTONES.month)

  const [subscriptionsRes, domainsRes] = await Promise.all([
    supabase
      .from('agency_subscriptions')
      .select('id, name, plan_name, billing_cycle, cost, renewal_date, client_id, clients!client_id(company_name)')
      .eq('status', 'active')
      .not('renewal_date', 'is', null)
      .gte('renewal_date', today)
      .lte('renewal_date', horizon),
    supabase
      .from('client_domains')
      .select('id, domain_name, expiry_date, auto_renew, registrar, client_id, clients!client_id(company_name)')
      .not('expiry_date', 'is', null)
      .gte('expiry_date', today)
      .lte('expiry_date', horizon),
  ])

  if (subscriptionsRes.error) throw new Error(subscriptionsRes.error.message)
  if (domainsRes.error) throw new Error(domainsRes.error.message)

  const candidates: RenewalCandidate[] = []

  for (const sub of subscriptionsRes.data ?? []) {
    const dueDate = dateOnly(String(sub.renewal_date ?? ''))
    if (!dueDate) continue
    const daysUntil = calendarDaysUntil(dueDate, today)
    const milestone = milestoneForDaysUntil(daysUntil)
    if (!milestone) continue
    candidates.push({
      itemType: 'subscription',
      itemId: sub.id as string,
      dueDate,
      daysUntil,
      milestone,
      alert: buildSubscriptionAlert({
        name: String(sub.name),
        planName: (sub.plan_name as string | null) ?? null,
        billingCycle: String(sub.billing_cycle),
        cost: Number(sub.cost) || 0,
        dueDate,
        clientName: clientName(sub.clients as NestedClient),
        milestone,
      }),
    })
  }

  for (const domain of domainsRes.data ?? []) {
    const dueDate = dateOnly(String(domain.expiry_date ?? ''))
    if (!dueDate) continue
    const daysUntil = calendarDaysUntil(dueDate, today)
    const milestone = milestoneForDaysUntil(daysUntil)
    if (!milestone) continue
    candidates.push({
      itemType: 'domain',
      itemId: domain.id as string,
      dueDate,
      daysUntil,
      milestone,
      alert: buildDomainAlert({
        domainName: String(domain.domain_name),
        dueDate,
        autoRenew: Boolean(domain.auto_renew),
        registrar: (domain.registrar as string | null) ?? null,
        clientName: clientName(domain.clients as NestedClient, 'Unknown client'),
        clientId: domain.client_id as string,
        milestone,
      }),
    })
  }

  candidates.sort((a, b) => a.daysUntil - b.daysUntil || a.alert.title.localeCompare(b.alert.title))
  return candidates
}

async function claimAlert(
  supabase: SupabaseClient,
  candidate: RenewalCandidate,
  today: string
): Promise<{ id: string } | { skipped: true } | { error: string }> {
  const { data, error } = await supabase
    .from('renewal_alert_log')
    .insert({
      item_type: candidate.itemType,
      item_id: candidate.itemId,
      milestone: candidate.milestone,
      due_date: candidate.dueDate,
      sent_on: today,
    })
    .select('id')
    .single()

  if (error?.code === '23505') return { skipped: true }
  if (error) return { error: error.message }
  if (!data?.id) return { error: 'Failed to record renewal alert' }
  return { id: data.id as string }
}

export async function runRenewalAlerts(
  supabase: SupabaseClient,
  options?: { dryRun?: boolean; now?: Date }
): Promise<{
  ok: boolean
  today: string
  dryRun: boolean
  sent: number
  skipped: number
  failed: { itemType: RenewalItemType; itemId: string; error: string }[]
  candidates: { itemType: RenewalItemType; itemId: string; milestone: RenewalMilestone; dueDate: string; title: string }[]
}> {
  const today = nzTodayYmd(options?.now)
  const candidates = await collectRenewalCandidates(supabase, today)
  const failed: { itemType: RenewalItemType; itemId: string; error: string }[] = []
  let sent = 0
  let skipped = 0

  if (options?.dryRun) {
    return {
      ok: true,
      today,
      dryRun: true,
      sent: 0,
      skipped: 0,
      failed: [],
      candidates: candidates.map((candidate) => ({
        itemType: candidate.itemType,
        itemId: candidate.itemId,
        milestone: candidate.milestone,
        dueDate: candidate.dueDate,
        title: candidate.alert.title,
      })),
    }
  }

  for (const candidate of candidates) {
    const claimed = await claimAlert(supabase, candidate, today)
    if ('skipped' in claimed) {
      skipped += 1
      continue
    }
    if ('error' in claimed) {
      failed.push({ itemType: candidate.itemType, itemId: candidate.itemId, error: claimed.error })
      continue
    }

    const result = await sendSlackAlert('billing', candidate.alert)
    if (!result.ok) {
      await supabase.from('renewal_alert_log').delete().eq('id', claimed.id)
      failed.push({ itemType: candidate.itemType, itemId: candidate.itemId, error: result.error })
      continue
    }
    sent += 1
  }

  return {
    ok: failed.length === 0,
    today,
    dryRun: false,
    sent,
    skipped,
    failed,
    candidates: candidates.map((candidate) => ({
      itemType: candidate.itemType,
      itemId: candidate.itemId,
      milestone: candidate.milestone,
      dueDate: candidate.dueDate,
      title: candidate.alert.title,
    })),
  }
}
