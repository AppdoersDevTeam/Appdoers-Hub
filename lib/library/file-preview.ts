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

export function stripUnsafeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
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
      padding: 28px 32px 48px;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
      color: #334155;
      line-height: 1.65;
      background: #fff;
    }
    .page { max-width: 800px; margin: 0 auto; }
    h1, h2, h3, h4 { color: #0f172a; line-height: 1.3; }
    h1 { font-size: 1.5rem; }
    h2 { font-size: 1.25rem; }
    h3 { font-size: 1.05rem; }
    p { margin: 0 0 0.9em; }
    a { color: #2563eb; }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    td, th { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: left; vertical-align: top; }
    ul, ol { padding-left: 1.4em; }
    blockquote { margin: 0 0 1em; padding-left: 1em; border-left: 3px solid #cbd5e1; color: #475569; }
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

export function wrapLibraryPreviewHtml(input: { title: string; body: string }): string {
  return previewPage(input.title, `<div class="page">${stripUnsafeHtml(input.body)}</div>`)
}

export function previewMessageHtml(title: string, message: string): string {
  return previewPage(title, `<div class="message">${escapeHtml(message)}</div>`)
}
