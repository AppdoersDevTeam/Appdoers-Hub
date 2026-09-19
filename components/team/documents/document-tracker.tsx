'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Download, Eye, EyeOff, Plus, Trash2, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SlideOver } from '@/components/ui/slide-over'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  deleteDocumentAction,
  getDocumentDownloadUrlAction,
  toggleDocumentVisibilityAction,
  updateDocumentStatusAction,
} from '@/lib/actions/documents'
import {
  DOCUMENT_ACCEPT,
  formatFileSize,
  statusesForKind,
  type DocumentKind,
} from '@/lib/documents'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

export interface TrackedDocument {
  id: string
  title: string
  status: string
  created_at: string
  sent_at: string | null
  signed_at?: string | null
  file_name: string | null
  mime_type: string | null
  file_size: number | null
  storage_path: string | null
  is_client_visible: boolean
  client_id: string
  client_name: string
}

const statusStyles: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-500' },
  sent: { label: 'Sent', cls: 'bg-blue-50 text-blue-700' },
  approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700' },
  declined: { label: 'Declined', cls: 'bg-red-50 text-red-700' },
  expired: { label: 'Expired', cls: 'bg-amber-50 text-amber-700' },
  signed: { label: 'Signed', cls: 'bg-emerald-50 text-emerald-700' },
  superseded: { label: 'Superseded', cls: 'bg-slate-100 text-slate-500' },
}

const labelClass = 'block text-xs font-medium text-slate-500 mb-1'
const selectClass = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none'

export function DocumentTracker({
  kind,
  documents: initialDocuments,
  clients,
  clientId,
}: {
  kind: DocumentKind
  documents: TrackedDocument[]
  clients: { id: string; company_name: string }[]
  clientId?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [documents, setDocuments] = useState(initialDocuments)
  const [showUpload, setShowUpload] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TrackedDocument | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    client_id: clientId ?? '',
    title: '',
    status: 'sent',
    is_client_visible: true,
  })

  useEffect(() => {
    setDocuments(initialDocuments)
  }, [initialDocuments])

  const noun = kind === 'proposal' ? 'proposal' : 'contract'
  const nounTitle = kind === 'proposal' ? 'Proposal' : 'Contract'
  const statuses = statusesForKind(kind)
  const showClientCol = !clientId

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const file = fileInputRef.current?.files?.[0]
    if (!form.client_id) { setError('Select a client'); return }
    if (!form.title.trim()) { setError('Title is required'); return }
    if (!file) { setError('Choose a PDF or Word document'); return }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('kind', kind)
    formData.append('client_id', form.client_id)
    formData.append('title', form.title.trim())
    formData.append('status', form.status)
    formData.append('is_client_visible', String(form.is_client_visible))

    try {
      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error ?? 'Upload failed')
        return
      }
      const clientName = clients.find((c) => c.id === form.client_id)?.company_name ?? '—'
      setDocuments((prev) => [{ ...json.document, client_name: clientName }, ...prev])
      setShowUpload(false)
      setForm({
        client_id: clientId ?? '',
        title: '',
        status: 'sent',
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

  const handleDownload = (doc: TrackedDocument) => {
    startTransition(async () => {
      const result = await getDocumentDownloadUrlAction(kind, doc.id)
      if (!result.success) {
        setError(result.error)
        return
      }
      const a = document.createElement('a')
      a.href = result.data.url
      a.download = result.data.name
      a.target = '_blank'
      a.rel = 'noreferrer'
      document.body.appendChild(a)
      a.click()
      a.remove()
    })
  }

  const handleStatus = (doc: TrackedDocument, status: string) => {
    startTransition(async () => {
      const result = await updateDocumentStatusAction(kind, doc.id, status)
      if (!result.success) {
        setError(result.error)
        return
      }
      setDocuments((prev) => prev.map((item) => item.id === doc.id ? { ...item, status } : item))
    })
  }

  const handleVisibility = (doc: TrackedDocument) => {
    startTransition(async () => {
      const next = !doc.is_client_visible
      const result = await toggleDocumentVisibilityAction(kind, doc.id, next)
      if (!result.success) {
        setError(result.error)
        return
      }
      setDocuments((prev) => prev.map((item) => item.id === doc.id ? { ...item, is_client_visible: next } : item))
    })
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteDocumentAction(kind, deleteTarget.id)
      if (!result.success) {
        setError(result.error)
        setDeleteTarget(null)
        return
      }
      setDocuments((prev) => prev.filter((item) => item.id !== deleteTarget.id))
      setDeleteTarget(null)
      router.refresh()
    })
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setShowUpload(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Upload {nounTitle}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="hub-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {['Title', ...(showClientCol ? ['Client'] : []), 'File', 'Status', 'Client portal', 'Uploaded', ''].map((h) => (
                  <th key={h || 'actions'} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={showClientCol ? 7 : 6} className="px-4 py-10 text-center text-slate-500">
                    No {noun}s yet. Upload a PDF or Word document to keep track of them.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const st = statusStyles[doc.status] ?? statusStyles.draft
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{doc.title}</td>
                      {showClientCol && (
                        <td className="px-4 py-3 text-slate-600">{doc.client_name}</td>
                      )}
                      <td className="px-4 py-3 text-slate-600">
                        {doc.file_name ? (
                          <button
                            type="button"
                            onClick={() => handleDownload(doc)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1.5 text-blue-600 hover:underline"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span className="max-w-[180px] truncate">{doc.file_name}</span>
                            <span className="text-xs text-slate-400">{formatFileSize(doc.file_size)}</span>
                          </button>
                        ) : (
                          <span className="text-slate-400">No file</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className={cn('rounded-full border-0 px-2.5 py-0.5 text-xs font-medium', st.cls)}
                          value={doc.status}
                          disabled={isPending}
                          onChange={(e) => handleStatus(doc, e.target.value)}
                        >
                          {statuses.map((value) => (
                            <option key={value} value={value}>
                              {statusStyles[value]?.label ?? value}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleVisibility(doc)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
                          title={doc.is_client_visible ? 'Visible in client portal' : 'Hidden from client portal'}
                        >
                          {doc.is_client_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          {doc.is_client_visible ? 'Visible' : 'Hidden'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(doc.created_at)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(doc)}
                          disabled={isPending}
                          className="rounded p-1 text-slate-500 hover:text-red-600 transition-colors"
                          title={`Delete ${noun}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
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
        title={`Delete ${nounTitle}`}
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel={`Delete ${nounTitle}`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isPending={isPending}
      />

      <SlideOver
        open={showUpload}
        onClose={() => setShowUpload(false)}
        title={`Upload ${nounTitle}`}
        subtitle="Attach a PDF or Word document to keep on the client record"
      >
        <form onSubmit={handleUpload} className="space-y-5 px-6 py-5">
          {error && showUpload && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
          )}
          {!clientId && (
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
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className={labelClass}>Title *</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder={kind === 'proposal' ? 'e.g. Launch Tier proposal' : 'e.g. Service agreement'}
              required
            />
          </div>
          <div>
            <label className={labelClass}>File (PDF or Word) *</label>
            <input
              ref={fileInputRef}
              type="file"
              accept={DOCUMENT_ACCEPT}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select
              className={selectClass}
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {statusStyles[value]?.label ?? value}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.is_client_visible}
              onChange={(e) => setForm((f) => ({ ...f, is_client_visible: e.target.checked }))}
            />
            Show in client portal
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={uploading} className="flex-1">
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading…' : `Upload ${nounTitle}`}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </>
  )
}
