export async function getTeamMemberName(
  client: { from: (table: string) => any },
  teamUserId: string | null | undefined
): Promise<string | null> {
  if (!teamUserId) return null
  const { data } = await client.from('team_users').select('full_name').eq('id', teamUserId).maybeSingle()
  const name = data?.full_name?.trim()
  return name || null
}

export function slackPersonLine(label: string, name: string | null | undefined): string {
  const trimmed = name?.trim()
  return trimmed ? `*${label}:* ${trimmed}` : ''
}

export function slackPeopleContext(input: {
  requestedBy?: string | null
  by?: string | null
  byLabel?: string
}): string[] {
  const requestedBy = input.requestedBy?.trim() || null
  const by = input.by?.trim() || null
  const byLabel = input.byLabel ?? 'Updated by'
  const parts: string[] = []
  if (requestedBy) parts.push(`Requested by *${requestedBy}*`)
  if (by && by !== requestedBy) parts.push(`${byLabel} *${by}*`)
  return parts
}
