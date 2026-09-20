import { timingSafeEqual } from 'crypto'
import { buildSlackAlert, type SlackBlock } from '@/lib/slack'

export type PlatformAlertEvent = {
  type: string
  projectRef: string | null
  organizationSlug: string | null
  timestamp: string | null
  isTest: boolean
  payload: Record<string, unknown>
}

const EVENT_LABELS: Record<string, string> = {
  'project.paused': 'Project paused',
  'project.restored': 'Project restored',
  'project.removed': 'Project removed',
  'project.pending_shutdown_notification': 'Project pending shutdown',
  'project.shutdown_eligible': 'Project eligible for shutdown',
  'project.disk_growth': 'Project disk growth',
  'project.subscription_updated': 'Project subscription updated',
  'project.infra_restarted': 'Project infrastructure restarted',
  'project.infra_updated': 'Project infrastructure updated',
  'project.infra_restart_or_resize_initiated': 'Project restart or resize started',
  'project.database_upgrade_status_change': 'Database upgrade status changed',
  'project.restore_failed': 'Project restore failed',
  'project.hibernation_suspended': 'Project hibernated',
  'project.hibernation_waken': 'Project woken from hibernation',
}

export function secretsMatch(provided: string, expected: string): boolean {
  if (!expected || !provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function extractWebhookSecret(req: Request): string {
  const auth = req.headers.get('authorization')?.trim() ?? ''
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim()
  }
  return (
    req.headers.get('x-hub-webhook-secret')?.trim() ||
    req.headers.get('x-webhook-secret')?.trim() ||
    ''
  )
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function normalizeEventType(raw: string): string {
  return raw.replace(/^v\d+\./, '')
}

function pickPayload(root: Record<string, unknown>): Record<string, unknown> {
  const nested =
    asRecord(root.payload) ||
    asRecord(asRecord(root.event)?.payload) ||
    asRecord(asRecord(root.data)?.payload) ||
    asRecord(asRecord(asRecord(root.data)?.attributes)?.payload)
  return nested ?? {}
}

export function parsePlatformEvent(body: unknown): PlatformAlertEvent | null {
  const root = asRecord(body)
  if (!root) return null

  const data = asRecord(root.data)
  const attributes = asRecord(data?.attributes)
  const event = asRecord(root.event)

  const typeCandidates = [
    asString(root.type),
    asString(event?.type),
    asString(data?.type),
    asString(attributes?.type),
    asString(asRecord(root.attributes)?.type),
    asString(pickPayload(root).type),
  ].filter((value): value is string => Boolean(value) && value !== 'endpoint' && value !== 'ingress')

  const type = typeCandidates[0]
  if (!type) return null

  const payload = pickPayload(root)
  const projectRef =
    asString(payload.project_ref) ||
    asString(payload.projectRef) ||
    asString(root.project_ref) ||
    asString(root.projectRef) ||
    asString(attributes?.project_ref)
  const organizationSlug =
    asString(payload.organization_slug) ||
    asString(payload.organizationSlug) ||
    asString(root.organization_slug) ||
    asString(root.organizationSlug) ||
    asString(attributes?.organization_slug)
  const timestamp =
    asString(root.timestamp) ||
    asString(event?.timestamp) ||
    asString(payload.timestamp) ||
    asString(attributes?.timestamp)
  const isTest = root.is_test === true || payload.is_test === true || event?.is_test === true

  return {
    type: normalizeEventType(type),
    projectRef,
    organizationSlug,
    timestamp,
    isTest,
    payload,
  }
}

export function eventLabel(type: string): string {
  return EVENT_LABELS[normalizeEventType(type)] ?? normalizeEventType(type).replace(/[._]/g, ' ')
}

function projectDashboardUrl(projectRef: string | null): string | null {
  if (!projectRef) return null
  return `https://supabase.com/dashboard/project/${encodeURIComponent(projectRef)}`
}

export function formatSlackAlert(event: PlatformAlertEvent): { text: string; blocks: SlackBlock[] } {
  const title = eventLabel(event.type)
  const testPrefix = event.isTest ? '[TEST] ' : ''
  const project = event.projectRef ?? 'unknown project'
  const org = event.organizationSlug ?? 'unknown org'
  const dashboard = projectDashboardUrl(event.projectRef)
  const text = `${testPrefix}Supabase: ${title} (${project})`

  const extraFields = Object.keys(event.payload)
    .filter(
      (key) => !['project_ref', 'projectRef', 'organization_slug', 'organizationSlug', 'is_test'].includes(key)
    )
    .slice(0, 6)
    .map((key) => {
      const value = event.payload[key]
      const rendered = typeof value === 'string' ? value : JSON.stringify(value)
      return { label: key, value: String(rendered ?? '') }
    })

  return {
    text,
    blocks: buildSlackAlert({
      text,
      title: `${testPrefix}${title}`,
      fields: [
        { label: 'Project', value: project },
        { label: 'Organization', value: org },
        ...extraFields,
      ],
      context: event.timestamp ? [event.timestamp] : [],
      action: dashboard ? { label: 'Open in Supabase', url: dashboard } : null,
    }),
  }
}
