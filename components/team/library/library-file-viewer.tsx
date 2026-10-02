'use client'

import { Download, ExternalLink, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatFileSize } from '@/lib/documents'
import {
  libraryFileHref,
  libraryFilePageHref,
  libraryPreviewKind,
} from '@/lib/library/file-preview'
import { LibraryDocxPreview } from './library-docx-preview'

export function LibraryFileViewer({
  itemId,
  fileName,
  mimeType,
  fileSize,
  cacheKey,
  heightClass = 'h-[75vh]',
}: {
  itemId: string
  fileName: string
  mimeType: string | null
  fileSize: number | null
  cacheKey: string
  heightClass?: string
}) {
  const fileHref = libraryFileHref(itemId, { v: cacheKey })
  const downloadHref = libraryFileHref(itemId, { download: true, v: cacheKey })
  const kind = libraryPreviewKind(fileName, mimeType)
  const openHref = kind === 'docx' ? libraryFilePageHref(itemId, cacheKey) : fileHref

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-800">
            <Paperclip className="h-3.5 w-3.5 shrink-0" />
            {fileName}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{formatFileSize(fileSize)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" asChild>
            <a href={openHref} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </a>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={downloadHref}>
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {kind === 'docx' ? (
          <LibraryDocxPreview src={fileHref} title={fileName} className={heightClass} />
        ) : (
          <>
            {/* iOS/Android render PDFs in iframes as a single unscrollable page */}
            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center md:hidden">
              <Paperclip className="h-6 w-6 text-slate-400" />
              <p className="text-sm text-slate-500">Open the file to view it on this device.</p>
              <Button variant="outline" asChild className="h-11">
                <a href={openHref} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open file
                </a>
              </Button>
            </div>
            <iframe
              src={fileHref}
              title={`${fileName} preview`}
              className={`${heightClass} hidden w-full bg-white md:block`}
            />
          </>
        )}
      </div>
    </div>
  )
}
