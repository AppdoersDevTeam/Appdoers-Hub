'use client'

import { useState, useRef, useTransition } from 'react'
import { Upload, Download, Trash2, Eye, EyeOff, FileText, Image, File, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getFileDownloadUrlAction, deleteFileAction, toggleFileVisibilityAction } from '@/lib/actions/files'
import { cn } from '@/lib/utils/cn'

interface FileRow {
  id: string
  name: string
  size: number | null
  mime_type: string | null
  folder: string | null
  is_client_visible: boolean
  created_at: string
  client_id: string
  project_id: string | null
  client_name: string
  project_name: string | null
}

function FileIcon({ mimeType }: { mimeType: string | null }) {
  if (!mimeType) return <File className="h-4 w-4" />
  if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />
  if (mimeType === 'application/pdf') return <FileText className="h-4 w-4" />
  return <File className="h-4 w-4" />
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

const FOLDERS = ['General', 'Contracts', 'Invoices', 'Design', 'Assets', 'Reports']

export function FilesManager({
  files: initialFiles,
  clients,
  clientId,
  projectId,
  showClientColumn = false,
}: {
  files: FileRow[]
  clients: { id: string; company_name: string }[]
  clientId?: string
  projectId?: string
  showClientColumn?: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [files, setFiles] = useState(initialFiles)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [folderFilter, setFolderFilter] = useState('all')
  const [visibilityFilter, setVisibilityFilter] = useState('all')
  const [selectedClientId, setSelectedClientId] = useState(clientId ?? '')
  const [selectedFolder, setSelectedFolder] = useState('')
  const [isClientVisible, setIsClientVisible] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = files.filter((f) => {
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.client_name.toLowerCase().includes(search.toLowerCase())
    const matchFolder = folderFilter === 'all' || f.folder === folderFilter || (!f.folder && folderFilter === 'General')
    const matchVis = visibilityFilter === 'all' || (visibilityFilter === 'visible' ? f.is_client_visible : !f.is_client_visible)
    return matchSearch && matchFolder && matchVis
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const targetClientId = clientId ?? selectedClientId
    if (!targetClientId) { setUploadError('Select a client first'); return }

    setUploading(true)
    setUploadError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('client_id', targetClientId)
    if (projectId) formData.append('project_id', projectId)
    if (selectedFolder) formData.append('folder', selectedFolder)
    formData.append('is_client_visible', String(isClientVisible))

    try {
      const res = await fetch('/api/files/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setUploadError(json.error ?? 'Upload failed')
      } else {
        // Add to local state
        const newFile: FileRow = {
          ...json.file,
          client_id: targetClientId,
          project_id: projectId ?? null,
          client_name: clients.find((c) => c.id === targetClientId)?.company_name ?? '—',
          project_name: null,
        }
        setFiles((prev) => [newFile, ...prev])
      }
    } catch (err) {
      setUploadError(String(err))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDownload = (fileId: string) => {
    startTransition(async () => {
      const result = await getFileDownloadUrlAction(fileId)
      if (result.success) {
        const a = document.createElement('a')
        a.href = result.data.url
        a.download = result.data.name
        a.click()
      }
    })
  }

  const handleDelete = (file: FileRow) => {
    if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteFileAction(file.id, file.client_id)
      if (result.success) {
        setFiles((prev) => prev.filter((f) => f.id !== file.id))
      }
    })
  }

  const handleToggleVisibility = (file: FileRow) => {
    startTransition(async () => {
      const result = await toggleFileVisibilityAction(file.id, !file.is_client_visible)
      if (result.success) {
        setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, is_client_visible: !f.is_client_visible } : f))
      }
    })
  }

  const selectClass = 'rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#3B82F6] focus:outline-none'

  return (
    <div className="space-y-4">
      {/* Upload bar */}
      <div className="hub-card">
        <div className="flex flex-wrap items-end gap-3">
          {!clientId && (
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1">Client *</label>
              <select className={selectClass} value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
                <option value="">Select client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1">Folder</label>
            <select className={selectClass} value={selectedFolder} onChange={(e) => setSelectedFolder(e.target.value)}>
              <option value="">General</option>
              {FOLDERS.filter(f => f !== 'General').map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 pb-0.5">
            <input
              type="checkbox"
              id="clientVisible"
              checked={isClientVisible}
              onChange={(e) => setIsClientVisible(e.target.checked)}
              className="rounded border-[#1F2D45]"
            />
            <label htmlFor="clientVisible" className="text-sm text-[#CBD5E1] cursor-pointer">Visible to client in portal</label>
          </div>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || (!clientId && !selectedClientId)}
          >
            <Upload className="mr-1.5 h-4 w-4" />
            {uploading ? 'Uploading…' : 'Upload File'}
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
        </div>
        {uploadError && <p className="mt-2 text-sm text-[#EF4444]">{uploadError}</p>}
        <p className="mt-2 text-xs text-[#475569]">Max 50MB · PDF, Word, Excel, images, ZIP, video</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search files…"
          className="max-w-xs"
        />
        <select className={cn(selectClass, 'max-w-[140px]')} value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)}>
          <option value="all">All Folders</option>
          {FOLDERS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className={cn(selectClass, 'max-w-[160px]')} value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value)}>
          <option value="all">All Files</option>
          <option value="visible">Client Visible</option>
          <option value="internal">Internal Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="hub-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1F2D45]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#475569]">Name</th>
                {showClientColumn && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#475569]">Client</th>}
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#475569]">Folder</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#475569]">Size</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#475569]">Uploaded</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#475569]">Portal</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#475569]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2D45]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={showClientColumn ? 7 : 6} className="px-4 py-10 text-center text-[#475569]">
                    <FolderOpen className="mx-auto h-8 w-8 mb-2 opacity-40" />
                    No files yet. Upload your first file above.
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr key={f.id} className="hover:bg-[#1C2537] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[#475569]"><FileIcon mimeType={f.mime_type} /></span>
                        <span className="font-medium text-[#F1F5F9] truncate max-w-[240px]" title={f.name}>{f.name}</span>
                      </div>
                    </td>
                    {showClientColumn && <td className="px-4 py-3 text-[#CBD5E1]">{f.client_name}</td>}
                    <td className="px-4 py-3 text-[#475569]">{f.folder ?? 'General'}</td>
                    <td className="px-4 py-3 text-[#475569]">{formatBytes(f.size)}</td>
                    <td className="px-4 py-3 text-[#475569]">{formatDate(f.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleVisibility(f)}
                        disabled={isPending}
                        title={f.is_client_visible ? 'Visible to client — click to hide' : 'Internal only — click to share with client'}
                        className={cn(
                          'rounded p-1 transition-colors',
                          f.is_client_visible
                            ? 'text-[#10B981] hover:bg-[#1F2D45]'
                            : 'text-[#475569] hover:bg-[#1F2D45] hover:text-[#94A3B8]'
                        )}
                      >
                        {f.is_client_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDownload(f.id)}
                          disabled={isPending}
                          className="rounded p-1 text-[#475569] hover:bg-[#1F2D45] hover:text-[#94A3B8] transition-colors"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(f)}
                          disabled={isPending}
                          className="rounded p-1 text-[#475569] hover:bg-[#1F2D45] hover:text-[#EF4444] transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
