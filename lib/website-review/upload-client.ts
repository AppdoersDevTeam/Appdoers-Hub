/**
 * Browser-side signed upload: asks `endpoint` to prepare a signed URL, PUTs the file to storage,
 * then calls `endpoint` again to complete. Returns the JSON from the complete step.
 */
export async function signedUpload<T>(
  endpoint: string,
  file: File,
  extra: Record<string, unknown>
): Promise<T> {
  const prepareRes = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...extra, step: 'prepare', file_name: file.name, mime_type: file.type, file_size: file.size }),
  })
  const prepared = await prepareRes.json().catch(() => ({}))
  if (!prepareRes.ok) throw new Error(prepared.error || 'Could not start the upload')

  const uploadRes = await fetch(String(prepared.signedUrl), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${String(prepared.token)}`,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'false',
    },
    body: file,
  })
  if (!uploadRes.ok) throw new Error('The upload failed. Please check your connection and try again.')

  const completeRes = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...extra, step: 'complete', storage_path: prepared.path, file_name: file.name, file_size: file.size }),
  })
  const completed = await completeRes.json().catch(() => ({}))
  if (!completeRes.ok) throw new Error(completed.error || 'Could not finish the upload')
  return completed as T
}
