import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'
import { requireTeamAccess } from '@/lib/supabase/route-access'
import { DOCUMENT_BUCKET } from '@/lib/documents'
import {
  contentDispositionFilename,
  libraryPreviewKind,
  previewMessageHtml,
  wrapLibraryPreviewHtml,
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

  if (kind === 'pdf') {
    const { data: file, error } = await access.db.storage
      .from(DOCUMENT_BUCKET)
      .download(item.storage_path)

    if (error || !file) {
      return htmlResponse(
        previewMessageHtml('Library file', error?.message ?? 'Could not load this PDF.'),
        500
      )
    }

    return new NextResponse(new Uint8Array(await file.arrayBuffer()), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; ${contentDispositionFilename(fileName)}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  }

  if (kind === 'docx') {
    const { data: file, error } = await access.db.storage
      .from(DOCUMENT_BUCKET)
      .download(item.storage_path)

    if (error || !file) {
      return htmlResponse(
        previewMessageHtml('Library file', error?.message ?? 'Could not load this Word document.'),
        500
      )
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      const result = await mammoth.convertToHtml({ buffer })
      const body = result.value.trim()
        ? result.value
        : '<p>This Word document does not contain previewable text.</p>'
      return htmlResponse(wrapLibraryPreviewHtml({ title: item.title, body }))
    } catch {
      return htmlResponse(
        previewMessageHtml(
          fileName,
          'This Word document could not be previewed in Hub. Download it to open it locally.'
        ),
        500
      )
    }
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
