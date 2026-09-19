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

export function slackPeopleLines(input: {
  requestedBy?: string | null
  by?: string | null
  byLabel?: string
  assignedTo?: string | null
}): string[] {
  const requestedBy = input.requestedBy?.trim() || null
  const by = input.by?.trim() || null
  const byLabel = input.byLabel ?? 'Updated by'
  const lines: string[] = []

  if (requestedBy) lines.push(slackPersonLine('Requested by', requestedBy))
  if (by && by !== requestedBy) lines.push(slackPersonLine(byLabel, by))
  if (input.assignedTo) lines.push(slackPersonLine('Assigned To', input.assignedTo))

  return lines
}
