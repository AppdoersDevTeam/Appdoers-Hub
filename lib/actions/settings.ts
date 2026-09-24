'use server'

import { revalidatePath } from 'next/cache'
import { requireDirectorAccess } from '@/lib/supabase/route-access'
import {
  sendSlackAlert,
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
    const access = await requireDirectorAccess()
    if (!access.ok) return { success: false, error: access.message }

    const { error } = await access.db.from('settings').upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )

    if (error) return { success: false, error: error.message }
    revalidatePath('/app/settings')
    revalidatePath('/app/dashboard')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function testSlackChannelAction(
  channel: SlackChannel
): Promise<ActionResult<undefined>> {
  try {
    const access = await requireDirectorAccess()
    if (!access.ok) return { success: false, error: access.message }

    const label = SLACK_CHANNEL_LABELS[channel]
    const result = await sendSlackAlert(
      channel,
      {
        text: `Appdoers Hub test: ${label} webhook is working.`,
        title: 'Slack webhook test',
        fields: [{ label: 'Channel', value: label }],
        context: ['This confirms Appdoers Hub can post to this webhook.'],
      },
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
