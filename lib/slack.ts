type SlackBlock = Record<string, unknown>

export type SlackChannel =
  | 'general'
  | 'billing'
  | 'tasks'
  | 'projects'
  | 'clients'
  | 'leads'
  | 'proposals'

export const SLACK_CHANNEL_LABELS: Record<SlackChannel, string> = {
  general: 'General',
  billing: 'Billing & Invoices',
  tasks: 'Tasks',
  projects: 'Projects',
  clients: 'Clients',
  leads: 'Leads',
  proposals: 'Proposals',
}

export const SLACK_CHANNEL_DESCRIPTIONS: Record<SlackChannel, string> = {
  general: 'Default fallback — used when no specific channel is configured',
  billing: 'Invoice paid, subscription renewals, billing alerts',
  tasks: 'New tasks created, task status changes',
  projects: 'Phase advances, client status updates',
  clients: 'New clients added, status changes',
  leads: 'New leads, lead status changes',
  proposals: 'Proposals sent to clients',
}

async function getWebhookUrl(channel: SlackChannel): Promise<string | null> {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'slack_channels')
      .single()

    if (data?.value) {
      const channels = data.value as Record<
        string,
        { webhook_url?: string; enabled?: boolean }
      >
      // Try specific channel first
      const specific = channels[channel]
      if (specific?.enabled !== false && specific?.webhook_url) {
        return specific.webhook_url
      }
      // Fall back to general channel
      const general = channels['general']
      if (general?.enabled !== false && general?.webhook_url) {
        return general.webhook_url
      }
    }
  } catch {
    // Fall through to env var
  }
  return process.env.SLACK_WEBHOOK_URL ?? null
}

export async function sendToChannel(
  channel: SlackChannel,
  text: string,
  blocks?: SlackBlock[]
) {
  const url = await getWebhookUrl(channel)
  if (!url) {
    console.warn(`[Slack] No webhook configured for channel: ${channel}`)
    return
  }
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, ...(blocks ? { blocks } : {}) }),
    })
  } catch (err) {
    console.error('[Slack] Notification failed:', err)
  }
}

// Backward-compatible wrapper — routes to general channel
export async function sendSlackMessage(text: string, blocks?: SlackBlock[]) {
  return sendToChannel('general', text, blocks)
}
