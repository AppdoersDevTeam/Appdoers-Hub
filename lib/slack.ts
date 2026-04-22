type SlackBlock = Record<string, unknown>

export async function sendSlackMessage(text: string, blocks?: SlackBlock[]) {
  const url = process.env.SLACK_WEBHOOK_URL
  if (!url) {
    console.warn('[Slack] SLACK_WEBHOOK_URL not set')
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
