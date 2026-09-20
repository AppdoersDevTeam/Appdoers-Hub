'use client'

import { Download, ExternalLink, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatFileSize } from '@/lib/documents'
import { libraryFileHref, libraryPreviewKind } from '@/lib/library/file-preview'

export function LibraryFileViewer({
  itemId,
  fileName,
  mimeType,
  fileSize,
  cacheKey,
}: {
  itemId: string
  fileName: string
  mimeType: string | null
  fileSize: number | null
  cacheKey: string
}) {
  const previewHref = libraryFileHref(itemId, { v: cacheKey })
  const downloadHref = libraryFileHref(itemId, { download: true, v: cacheKey })
  const kind = libraryPreviewKind(fileName, mimeType)

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
            <a href={previewHref} target="_blank" rel="noreferrer">
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
        <iframe
          src={previewHref}
          title={`${fileName} preview`}
          className="h-[75vh] w-full bg-white"
        />
      </div>
      {kind === 'docx' && (
        <p className="text-xs text-slate-400">
          Readable preview of the Word document. Layout may differ slightly from Microsoft Word.
        </p>
      )}
    </div>
  )
}
