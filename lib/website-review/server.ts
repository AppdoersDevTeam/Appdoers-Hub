import type { SupabaseClient } from '@supabase/supabase-js'

/** Updates a linked project's client-facing status and logs it (service client; works without a session). */
export async function setProjectClientStatus(
  db: SupabaseClient,
  projectId: string | null,
  status: 'awaiting_client' | 'awaiting_appdoers',
  reason: string,
  performedBy: string | null
) {
  if (!projectId) return
  const { data: project } = await db.from('projects').select('name, client_id, client_status').eq('id', projectId).maybeSingle()
  if (!project || project.client_status === status) return

  const { error } = await db
    .from('projects')
    .update({ client_status: status, updated_at: new Date().toISOString() })
    .eq('id', projectId)
  if (error) {
    console.error('[Website review] project status update failed:', error.message)
    return
  }

  await db.from('activity_log').insert({
    entity_type: 'project',
    entity_id: projectId,
    client_id: project.client_id,
    action: 'client_status_changed',
    description: `"${project.name}" client status → ${status === 'awaiting_client' ? 'Awaiting client' : 'Awaiting Appdoers'} (${reason})`,
    performed_by: performedBy,
  })
}

/** Today + N calendar days, as YYYY-MM-DD. */
export function dateInDays(days: number, from = new Date()) {
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export async function signedUrlMap(db: SupabaseClient, bucket: string, paths: (string | null | undefined)[], expiresIn = 3600) {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))]
  const map = new Map<string, string>()
  if (unique.length === 0) return map
  const { data } = await db.storage.from(bucket).createSignedUrls(unique, expiresIn)
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) map.set(entry.path, entry.signedUrl)
  }
  return map
}
