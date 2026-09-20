export type LibraryPreviewKind = 'pdf' | 'docx' | 'doc' | 'unknown'

export function libraryPreviewKind(
  fileName: string | null | undefined,
  mimeType: string | null | undefined
): LibraryPreviewKind {
  const name = (fileName ?? '').toLowerCase()
  const mime = (mimeType ?? '').toLowerCase()

  if (name.endsWith('.pdf') || mime === 'application/pdf') return 'pdf'
  if (
    name.endsWith('.docx') ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx'
  }
  if (name.endsWith('.doc') || mime === 'application/msword') return 'doc'
  return 'unknown'
}

export function libraryFileHref(
  id: string,
  options?: { download?: boolean; v?: string }
): string {
  const params = new URLSearchParams()
  if (options?.download) params.set('download', '1')
  if (options?.v) params.set('v', options.v)
  const qs = params.toString()
  return `/api/library/${id}/file${qs ? `?${qs}` : ''}`
}

export function libraryFilePageHref(id: string, v?: string): string {
  const params = new URLSearchParams()
  if (v) params.set('v', v)
  const qs = params.toString()
  return `/app/library-file/${id}${qs ? `?${qs}` : ''}`
}

export function contentDispositionFilename(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_')
  const encoded = encodeURIComponent(fileName)
  return `filename="${ascii}"; filename*=UTF-8''${encoded}`
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function previewPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
      background: #fff;
    }
    .message {
      max-width: 36rem;
      margin: 12vh auto 0;
      padding: 20px 22px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #f8fafc;
      color: #475569;
      font-size: 0.95rem;
    }
  </style>
</head>
<body>${body}</body>
</html>`
}

export function previewMessageHtml(title: string, message: string): string {
  return previewPage(title, `<div class="message">${escapeHtml(message)}</div>`)
}

export function mimeForLibraryPreview(kind: LibraryPreviewKind, fallback?: string | null): string {
  if (kind === 'pdf') return 'application/pdf'
  if (kind === 'docx') {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  if (kind === 'doc') return 'application/msword'
  return fallback || 'application/octet-stream'
}
