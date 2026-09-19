// Server-only — do not import this in client components
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'
import type { SlackChannel } from './slack-channels'
export type { SlackChannel } from './slack-channels'
export { SLACK_CHANNEL_LABELS, SLACK_CHANNEL_DESCRIPTIONS, ALL_SLACK_CHANNELS } from './slack-channels'

export type SlackBlock = Record<string, unknown>

export type SlackApiResult<T> =
  | ({ ok: true } & T)
  | { ok: false; error: string; code: string }

export type SlackVoidResult = { ok: true } | { ok: false; error: string; code: string }

const SLACK_API = 'https://slack.com/api'

function slackBotToken(): string | null {
  const token = process.env.SLACK_BOT_TOKEN?.trim()
  return token || null
}

function mapSlackError(code: string): string {
  switch (code) {
    case 'restricted_action':
      return 'Workspace settings only allow admins to create public channels. Ask a Slack admin to allow members to create channels, then try again.'
    case 'missing_scope':
      return 'The Slack app is missing a required permission. Add the bot scopes and reinstall the app to the workspace.'
    case 'invalid_auth':
    case 'not_authed':
    case 'token_revoked':
    case 'token_expired':
      return 'Slack bot token is missing or invalid. Set SLACK_BOT_TOKEN and reinstall the Slack app if needed.'
    case 'invalid_name':
    case 'invalid_name_required':
    case 'invalid_name_punctuation':
    case 'invalid_name_maxlength':
    case 'invalid_name_specials':
      return 'That Slack channel name is not allowed. Try renaming the client so the channel slug uses letters and numbers only.'
    case 'not_in_channel':
      return 'The Slack bot is not in that channel and could not join it.'
    case 'channel_not_found':
      return 'The Slack channel could not be found. It may have been archived or renamed.'
    case 'no_token':
      return 'SLACK_BOT_TOKEN is not configured. Add a Slack bot token to the environment, then try again.'
    default:
      return `Slack request failed (${code}).`
  }
}

async function slackApi<T extends Record<string, unknown>>(
  method: string,
  body: Record<string, unknown> = {}
): Promise<SlackApiResult<T>> {
  const token = slackBotToken()
  if (!token) {
    return { ok: false, error: mapSlackError('no_token'), code: 'no_token' }
  }

  try {
    const res = await fetch(`${SLACK_API}/${method}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(body),
    })
    const json = (await res.json()) as { ok?: boolean; error?: string } & T
    if (!json.ok) {
      const code = json.error || 'unknown_error'
      return { ok: false, error: mapSlackError(code), code }
    }
    return { ok: true, ...(json as T) }
  } catch (err) {
    return { ok: false, error: String(err), code: 'network_error' }
  }
}

export function slugifyClientChannelName(companyName: string, clientId?: string): string {
  const slug = companyName
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
  const prefix = 'client-'
  const fallback = clientId ? clientId.replace(/-/g, '').slice(0, 8) : 'channel'
  const body = (slug || fallback).slice(0, 80 - prefix.length)
  return `${prefix}${body}`
}

export function hubClientUrl(clientId: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '')
  return `${base}/app/clients/${clientId}`
}

export function hubTaskUrl(taskId: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '')
  if (!base) return ''
  return `${base}/app/tasks/${taskId}`
}

export function withHttpUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

export async function createPublicChannel(
  name: string
): Promise<SlackApiResult<{ id: string; name: string }>> {
  const result = await slackApi<{ channel?: { id?: string; name?: string } }>(
    'conversations.create',
    { name, is_private: false }
  )
  if (!result.ok) return result
  const id = result.channel?.id
  const channelName = result.channel?.name ?? name
  if (!id) {
    return { ok: false, error: 'Slack created a channel but did not return an id.', code: 'no_channel' }
  }
  return { ok: true, id, name: channelName }
}

export async function findPublicChannelByName(
  name: string
): Promise<SlackApiResult<{ id: string; name: string }>> {
  let cursor: string | undefined
  for (let i = 0; i < 20; i++) {
    const result = await slackApi<{
      channels?: { id?: string; name?: string }[]
      response_metadata?: { next_cursor?: string }
    }>('conversations.list', {
      types: 'public_channel',
      exclude_archived: true,
      limit: 200,
      ...(cursor ? { cursor } : {}),
    })
    if (!result.ok) return result
    const match = (result.channels ?? []).find((ch) => ch.name === name && ch.id)
    if (match?.id) return { ok: true, id: match.id, name: match.name ?? name }
    cursor = result.response_metadata?.next_cursor?.trim()
    if (!cursor) break
  }
  return { ok: false, error: `No public Slack channel named #${name} was found.`, code: 'channel_not_found' }
}

export async function joinPublicChannel(channelId: string): Promise<SlackApiResult<{ id: string }>> {
  const result = await slackApi<{ channel?: { id?: string } }>('conversations.join', {
    channel: channelId,
  })
  if (!result.ok) return result
  return { ok: true, id: result.channel?.id ?? channelId }
}

export async function setChannelPurpose(
  channelId: string,
  purpose: string
): Promise<SlackVoidResult> {
  const result = await slackApi('conversations.setPurpose', {
    channel: channelId,
    purpose: purpose.slice(0, 250),
  })
  if (!result.ok) return result
  return { ok: true }
}

export async function createChannelCanvas(
  channelId: string,
  markdown: string
): Promise<SlackApiResult<{ canvasId: string | null }>> {
  const result = await slackApi<{ canvas_id?: string; canvas?: { id?: string } }>(
    'conversations.canvases.create',
    {
      channel_id: channelId,
      document_content: { type: 'markdown', markdown },
    }
  )
  if (!result.ok) return result
  return { ok: true, canvasId: result.canvas_id ?? result.canvas?.id ?? null }
}

export async function addChannelBookmark(
  channelId: string,
  title: string,
  url: string
): Promise<SlackVoidResult> {
  const result = await slackApi('bookmarks.add', {
    channel_id: channelId,
    title,
    type: 'link',
    link: url,
  })
  if (!result.ok) return result
  return { ok: true }
}

export async function postToSlackChannel(
  channelId: string,
  text: string,
  blocks?: SlackBlock[]
): Promise<SlackVoidResult> {
  const result = await slackApi('chat.postMessage', {
    channel: channelId,
    text,
    unfurl_links: false,
    unfurl_media: false,
    ...(blocks ? { blocks } : {}),
  })
  if (!result.ok) return result
  return { ok: true }
}

export function buildClientChannelCanvasMarkdown(input: {
  companyName: string
  planLabel: string
  status: string
  website: string | null
  hubUrl: string
}): string {
  const websiteLine = input.website
    ? `**Website:** ${input.website}`
    : '**Website:** —'
  const statusLabel = input.status.charAt(0).toUpperCase() + input.status.slice(1)

  return [
    `# ${input.companyName}`,
    '',
    `**Plan:** ${input.planLabel} · **Status:** ${statusLabel}`,
    websiteLine,
    '',
    `[Open in Hub](${input.hubUrl})`,
    '',
    'This channel is **internal only** — do not invite the client.',
    '',
    '## Todos',
    'Tick these as you go. Project work still lives in Hub Tasks.',
    '',
    '- [ ] Collect brand assets',
    '- [ ] Confirm domain / hosting access',
    '- [ ] Follow up with client',
  ].join('\n')
}

type SlackWebhookEntry = { webhook_url?: string; enabled?: boolean }

function webhookFromEntry(entry?: SlackWebhookEntry | null): string | null {
  if (!entry || entry.enabled === false) return null
  const url = String(entry.webhook_url ?? '').trim()
  return url || null
}

function parseChannelSettings(value: unknown): Record<string, SlackWebhookEntry> {
  if (!value) return {}
  if (typeof value === 'string') {
    try {
      return parseChannelSettings(JSON.parse(value) as unknown)
    } catch {
      return {}
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, SlackWebhookEntry>
  }
  return {}
}

function createSettingsClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return null
  return createSupabaseJsClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function getWebhookUrl(
  channel: SlackChannel,
  options?: { fallback?: boolean }
): Promise<string | null> {
  const allowFallback = options?.fallback !== false
  const supabase = createSettingsClient()
  if (!supabase) {
    console.error('[Slack] Missing SUPABASE_SERVICE_ROLE_KEY; cannot load Hub Settings webhooks.')
    return null
  }

  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'slack_channels')
    .maybeSingle()

  if (error) {
    console.error('[Slack] Failed to load webhook settings:', error.message)
    return null
  }

  const channels = parseChannelSettings(data?.value)
  const specific = webhookFromEntry(channels[channel])
  if (specific) return specific

  if (allowFallback) {
    const general = webhookFromEntry(channels.general)
    if (general) return general
  }

  return null
}

export async function sendToChannel(
  channel: SlackChannel,
  text: string,
  blocks?: SlackBlock[],
  options?: { fallback?: boolean }
): Promise<SlackVoidResult> {
  const url = await getWebhookUrl(channel, options)
  if (!url) {
    const error = `No webhook configured for ${channel}`
    console.warn(`[Slack] ${error}`)
    return { ok: false, error, code: 'no_webhook' }
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, ...(blocks ? { blocks } : {}) }),
      cache: 'no-store',
    })
    const body = (await res.text()).trim()
    if (!res.ok || (body && body !== 'ok')) {
      const error = body || `Slack webhook failed (${res.status})`
      console.error('[Slack] Webhook rejected:', res.status, error)
      return { ok: false, error, code: 'webhook_rejected' }
    }
    return { ok: true }
  } catch (err) {
    const error = String(err)
    console.error('[Slack] Notification failed:', err)
    return { ok: false, error, code: 'network_error' }
  }
}

export async function notifyTaskActivity(input: {
  text: string
  blocks?: SlackBlock[]
  clientSlackChannelId?: string | null
}): Promise<void> {
  await sendToChannel('tasks', input.text, input.blocks)
  if (input.clientSlackChannelId) {
    await postToSlackChannel(input.clientSlackChannelId, input.text, input.blocks)
  }
}

// Backward-compatible wrapper — routes to general channel
export async function sendSlackMessage(text: string, blocks?: SlackBlock[]) {
  return sendToChannel('general', text, blocks)
}
