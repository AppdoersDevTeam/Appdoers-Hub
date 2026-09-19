'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import {
  sendToChannel,
  SLACK_CHANNEL_LABELS,
  type SlackChannel,
} from '@/lib/slack'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function updateSettingAction(
  key: string,
  value: Record<string, unknown>
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { error } = await supabase.from('settings').upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )

    if (error) return { success: false, error: error.message }
    revalidatePath('/app/settings')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function testSlackChannelAction(
  channel: SlackChannel
): Promise<ActionResult<undefined>> {
  try {
    const label = SLACK_CHANNEL_LABELS[channel]
    const result = await sendToChannel(
      channel,
      `✅ Appdoers Hub test: ${label} webhook is working.`,
      [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*✅ Slack webhook test*\nChannel: *${label}*\nThis confirms Appdoers Hub can post to this webhook.`,
          },
        },
      ],
      { fallback: false }
    )

    if (!result.ok) {
      return { success: false, error: result.error }
    }
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
