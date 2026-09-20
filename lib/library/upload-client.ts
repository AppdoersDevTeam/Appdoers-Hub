import { titleFromFileName, type LibraryKind } from '@/lib/library/constants'

export interface LibraryUploadResult {
  id: string
  file_name: string | null
  mime_type: string | null
  file_size: number | null
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    if (/request entity too large/i.test(text) || res.status === 413) {
      throw new Error('File is too large to send through the app server.')
    }
    throw new Error(text.replace(/\s+/g, ' ').slice(0, 180) || `Upload failed (${res.status})`)
  }
}

export async function submitLibraryUpload(input: {
  file: File
  kind: LibraryKind
  title?: string
  summary?: string
  body?: string
  itemId?: string
}): Promise<{ success: true; item: LibraryUploadResult } | { success: false; error: string }> {
  const title = input.title?.trim() || titleFromFileName(input.file.name)
  const payload = {
    item_id: input.itemId,
    kind: input.kind,
    title,
    summary: input.summary ?? '',
    body: input.body ?? '',
    file_name: input.file.name,
    mime_type: input.file.type,
    file_size: input.file.size,
  }

  try {
    const prepareRes = await fetch('/api/library/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, step: 'prepare' }),
    })
    const prepareJson = await readJson(prepareRes)
    if (!prepareRes.ok || !prepareJson.success) {
      return { success: false, error: String(prepareJson.error ?? 'Could not start upload') }
    }

    const uploadRes = await fetch(String(prepareJson.signedUrl), {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${String(prepareJson.token)}`,
        'Content-Type': input.file.type || 'application/octet-stream',
        'x-upsert': 'false',
      },
      body: input.file,
    })
    if (!uploadRes.ok) {
      const uploadText = await uploadRes.text()
      return { success: false, error: uploadText.slice(0, 180) || 'File upload failed' }
    }

    const completeRes = await fetch('/api/library/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        step: 'complete',
        storage_path: prepareJson.path,
      }),
    })
    const json = await readJson(completeRes)
    if (!completeRes.ok || !json.success) {
      return { success: false, error: String(json.error ?? 'Upload failed') }
    }

    const item = json.item as Record<string, unknown>
    return {
      success: true,
      item: {
        id: String(item.id),
        file_name: (item.file_name as string | null) ?? payload.file_name,
        mime_type: (item.mime_type as string | null) ?? payload.mime_type,
        file_size: typeof item.file_size === 'number' ? item.file_size : payload.file_size,
      },
    }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
