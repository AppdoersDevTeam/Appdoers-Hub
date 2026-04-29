'use client'

import { useState, useTransition } from 'react'
import { Download, File, FileText, Image, FolderOpen } from 'lucide-react'
import { getPortalFileDownloadUrlAction } from '@/lib/actions/files'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'

interface PortalFile {
  id: string
  name: string
  size: number | null
  mime_type: string | null
  folder: string | null
  created_at: string
}

function FileIcon({ mimeType }: { mimeType: string | null }) {
  if (!mimeType) return <File className="h-5 w-5" />
  if (mimeType.startsWith('image/')) return <Image className="h-5 w-5" />
  if (mimeType === 'application/pdf') return <FileText className="h-5 w-5" />
  return <File className="h-5 w-5" />
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function PortalFilesView({ files }: { files: PortalFile[] }) {
  const [isPending, startTransition] = useTransition()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // Group by folder
  const folders = Array.from(new Set(files.map((f) => f.folder ?? 'General'))).sort()

  const handleDownload = (fileId: string) => {
    setDownloadingId(fileId)
    startTransition(async () => {
      const result = await getPortalFileDownloadUrlAction(fileId)
      setDownloadingId(null)
      if (result.success) {
        const a = document.createElement('a')
        a.href = result.data.url
        a.download = result.data.name
        a.click()
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Files</h1>
        <p className="text-gray-500 mt-1">Documents and assets shared with you by Appdoers.</p>
      </div>

      {files.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <FolderOpen className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500">No files have been shared with you yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {folders.map((folder) => {
            const folderFiles = files.filter((f) => (f.folder ?? 'General') === folder)
            return (
              <div key={folder}>
                <div className="flex items-center gap-2 mb-3">
                  <FolderOpen className="h-4 w-4 text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{folder}</h2>
                  <span className="text-xs text-gray-400">({folderFiles.length})</span>
                </div>
                <div className="space-y-2">
                  {folderFiles.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-blue-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-500 shrink-0">
                        <FileIcon mimeType={f.mime_type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{f.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatBytes(f.size)}{f.size ? ' · ' : ''}{formatDate(f.created_at)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownload(f.id)}
                        disabled={isPending}
                        className={cn(
                          'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                          downloadingId === f.id
                            ? 'border-gray-200 bg-gray-50 text-gray-400'
                            : 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100'
                        )}
                      >
                        <Download className="h-3.5 w-3.5" />
                        {downloadingId === f.id ? 'Loading…' : 'Download'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
