import { NextRequest, NextResponse } from 'next/server'
import { requireTeamAccess } from '@/lib/supabase/route-access'
import { DOCUMENT_BUCKET } from '@/lib/documents'
import {
  contentDispositionFilename,
  libraryPreviewKind,
  mimeForLibraryPreview,
  previewMessageHtml,
} from '@/lib/library/file-preview'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function htmlResponse(html: string, status = 200) {
  return new NextResponse(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const download = req.nextUrl.searchParams.get('download') === '1'
  const access = await requireTeamAccess()
  if (!access.ok) {
    return htmlResponse(previewMessageHtml('Library file', access.message), access.status)
  }

  const { data: item } = await access.db
    .from('hub_library_items')
    .select('id, title, file_name, mime_type, storage_path')
    .eq('id', id)
    .maybeSingle()

  if (!item?.storage_path) {
    return htmlResponse(previewMessageHtml('Library file', 'No file uploaded for this item.'), 404)
  }

  const fileName = item.file_name || `${item.title}.pdf`
  const kind = libraryPreviewKind(item.file_name, item.mime_type)

  if (download) {
    const { data, error } = await access.db.storage
      .from(DOCUMENT_BUCKET)
      .createSignedUrl(item.storage_path, 300, { download: fileName })

    if (error || !data?.signedUrl) {
      return htmlResponse(
        previewMessageHtml('Library file', error?.message ?? 'Could not download this file.'),
        500
      )
    }

    return NextResponse.redirect(data.signedUrl)
  }

  if (kind === 'pdf' || kind === 'docx') {
    const { data: file, error } = await access.db.storage
      .from(DOCUMENT_BUCKET)
      .download(item.storage_path)

    if (error || !file) {
      return htmlResponse(
        previewMessageHtml('Library file', error?.message ?? 'Could not load this file.'),
        500
      )
    }

    return new NextResponse(new Uint8Array(await file.arrayBuffer()), {
      headers: {
        'Content-Type': mimeForLibraryPreview(kind, item.mime_type),
        'Content-Disposition': `inline; ${contentDispositionFilename(fileName)}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  }

  return htmlResponse(
    previewMessageHtml(
      fileName,
      kind === 'doc'
        ? 'Older Word files (.doc) cannot be previewed in Hub. Download the file to open it.'
        : 'This file type cannot be previewed in Hub. Download it to open it.'
    )
  )
}
