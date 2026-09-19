'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Eye, EyeOff, FileText, Plus, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SlideOver } from '@/components/ui/slide-over'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  deleteDocumentAction,
  toggleDocumentVisibilityAction,
  updateDocumentStatusAction,
} from '@/lib/actions/documents'
import { DOCUMENT_ACCEPT, type DocumentKind } from '@/lib/documents/constants'
import { cn } from '@/lib/utils/cn'
import { formatBytes, formatDate } from '@/lib/utils/format'

export interface DocumentRecordRow {
  id: string
  title: string
  status: string
  created_at: string
  sent_at: string | null
  client_id: string
  client_name: string
  file_name: string | null
  file_size: number | null
  file_mime_type: string | null
  is_client_visible: boolean
}

const proposalStatuses: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-500' },
  sent: { label: 'Sent', cls: 'bg-blue-50 text-blue-700' },
  approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700' },
  declined: { label: 'Declined', cls: 'bg-red-50 text-red-700' },
  expired: { label: 'Expired', cls: 'bg-amber-50 text-amber-700' },
}

const contractStatuses: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-500' },
  sent: { label: 'Sent', cls: 'bg-blue-50 text-blue-700' },
  signed: { label: 'Signed', cls: 'bg-emerald-50 text-emerald-700' },
  superseded: { label: 'Superseded', cls: 'bg-amber-50 text-amber-700' },
}

const copy = {
  proposal: {
    singular: 'Proposal',
    plural: 'proposals',
    addLabel: 'Add Proposal',
    empty: 'No proposals yet. Upload a PDF or Word document to keep track of client proposals.',
    slideTitle: 'Add Proposal',
    slideSubtitle: 'Upload a PDF or Word file so we can keep it with this client.',
    uploadPath: '/api/proposals/upload',
    filePath: (id: string) => `/api/proposals/${id}/file`,
    statuses: proposalStatuses,
  },
  contract: {
    singular: 'Contract',
    plural: 'contracts',
    addLabel: 'Add Contract',
    empty: 'No contracts yet. Upload a PDF or Word document to keep track of client contracts.',
    slideTitle: 'Add Contract',
    slideSubtitle: 'Upload a signed or draft contract PDF or Word file.',
    uploadPath: '/api/contracts/upload',
    filePath: (id: string) => `/api/contracts/${id}/file`,
    statuses: contractStatuses,
  },
} as const

const labelClass = 'block text-xs font-medium text-slate-500 mb-1'
const selectClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none'

export function DocumentRecordsList({
  kind,
  records,
  clients,
  lockedClientId,
}: {
  kind: DocumentKind
  records: DocumentRecordRow[]
  clients: { id: string; company_name: string }[]
  lockedClientId?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rows, setRows] = useState(records)
  const showClientColumn = !lockedClientId

  useEffect(() => {
    setRows(records)
  }, [records])
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DocumentRecordRow | null>(null)
  const [form, setForm] = useState({
    client_id: lockedClientId ?? '',
    title: '',
    is_client_visible: true,
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const meta = copy[kind]

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const clientId = lockedClientId ?? form.client_id
    if (!clientId) {
      setError('Select a client')
      return
    }
    if (!selectedFile) {
      setError('Choose a PDF or Word document')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('client_id', clientId)
    if (form.title.trim()) formData.append('title', form.title.trim())
    formData.append('is_client_visible', String(form.is_client_visible))

    try {
      const res = await fetch(meta.uploadPath, { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error ?? 'Upload failed')
        return
      }
      setRows((prev) => [json.document as DocumentRecordRow, ...prev])
      setShowNew(false)
      setSelectedFile(null)
      setForm({
        client_id: lockedClientId ?? '',
        title: '',
        is_client_visible: true,
      })
      if (fileInputRef.current) fileInputRef.current.value = ''
      router.refresh()
    } catch (err) {
      setError(String(err))
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteDocumentAction(kind, deleteTarget.id)
      if (result.success) {
        setRows((prev) => prev.filter((row) => row.id !== deleteTarget.id))
      }
      setDeleteTarget(null)
      router.refresh()
    })
  }

  const handleStatus = (row: DocumentRecordRow, status: string) => {
    startTransition(async () => {
      const result = await updateDocumentStatusAction(kind, row.id, status)
      if (result.success) {
        setRows((prev) =>
          prev.map((item) =>
            item.id === row.id
              ? {
                  ...item,
                  status,
                  is_client_visible: status === 'sent' ? true : item.is_client_visible,
                }
              : item
          )
        )
      }
    })
  }

  const handleVisibility = (row: DocumentRecordRow) => {
    startTransition(async () => {
      const next = !row.is_client_visible
      const result = await toggleDocumentVisibilityAction(kind, row.id, next)
      if (result.success) {
        setRows((prev) =>
          prev.map((item) =>
            item.id === row.id
              ? {
                  ...item,
                  is_client_visible: next,
                  status: next ? 'sent' : item.status,
                }
              : item
          )
        )
      }
    })
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setShowNew(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> {meta.addLabel}
        </Button>
      </div>

      <div className="hub-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {['Title', ...(showClientColumn ? ['Client'] : []), 'File', 'Status', 'Uploaded', 'Portal', ''].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={showClientColumn ? 7 : 6} className="px-4 py-10 text-center text-slate-500">
                    {meta.empty}
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const st = meta.statuses[row.status] ?? meta.statuses.draft
                  return (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{row.title}</td>
                      {showClientColumn && (
                        <td className="px-4 py-3 text-slate-600">{row.client_name}</td>
                      )}
                      <td className="px-4 py-3 text-slate-600">
                        {row.file_name ? (
                          <a
                            href={meta.filePath(row.id)}
                            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700"
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate max-w-[180px]" title={row.file_name}>
                              {row.file_name}
                            </span>
                            <span className="text-xs text-slate-400">{formatBytes(row.file_size)}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">No file</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className={cn(
                            'rounded-full border-0 px-2.5 py-0.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500',
                            st.cls
                          )}
                          value={row.status}
                          disabled={isPending}
                          onChange={(e) => handleStatus(row, e.target.value)}
                        >
                          {Object.entries(meta.statuses).map(([value, config]) => (
                            <option key={value} value={value}>
                              {config.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(row.created_at)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleVisibility(row)}
                          disabled={isPending}
                          title={
                            row.is_client_visible
                              ? 'Visible in client portal — click to hide'
                              : 'Internal only — click to share in portal'
                          }
                          className={cn(
                            'rounded p-1 transition-colors',
                            row.is_client_visible
                              ? 'text-emerald-600 hover:bg-slate-100'
                              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                          )}
                        >
                          {row.is_client_visible ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {row.file_name && (
                            <a
                              href={meta.filePath(row.id)}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                              title="Download"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => setDeleteTarget(row)}
                            disabled={isPending}
                            className="rounded p-1 text-slate-500 hover:text-red-600 transition-colors"
                            title={`Delete ${meta.singular.toLowerCase()}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title={`Delete ${meta.singular}`}
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel={`Delete ${meta.singular}`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isPending={isPending}
      />

      <SlideOver
        open={showNew}
        onClose={() => setShowNew(false)}
        title={meta.slideTitle}
        subtitle={meta.slideSubtitle}
      >
        <form onSubmit={handleUpload} className="space-y-5 px-6 py-5">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          {!lockedClientId && (
            <div>
              <label className={labelClass}>Client *</label>
              <select
                className={selectClass}
                value={form.client_id}
                onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                required
              >
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className={labelClass}>Title</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Leave blank to use the file name"
            />
          </div>
          <div>
            <label className={labelClass}>Document *</label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-sm text-slate-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              <Upload className="h-4 w-4" />
              {selectedFile ? selectedFile.name : 'Choose PDF or Word file'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={DOCUMENT_ACCEPT}
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-2 text-xs text-slate-500">PDF, DOC, or DOCX · Max 50MB</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`${kind}-visible`}
              checked={form.is_client_visible}
              onChange={(e) => setForm((f) => ({ ...f, is_client_visible: e.target.checked }))}
              className="rounded border-slate-200"
            />
            <label htmlFor={`${kind}-visible`} className="text-sm text-slate-600 cursor-pointer">
              Visible to client in portal
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={uploading} className="flex-1">
              {uploading ? 'Uploading…' : `Add ${meta.singular}`}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowNew(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </SlideOver>
    </>
  )
}
