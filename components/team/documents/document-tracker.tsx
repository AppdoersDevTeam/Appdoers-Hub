'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Download, Eye, EyeOff, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SlideOver } from '@/components/ui/slide-over'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  deleteDocumentAction,
  getDocumentDownloadUrlAction,
  toggleDocumentVisibilityAction,
  updateDocumentAction,
  updateDocumentStatusAction,
} from '@/lib/actions/documents'
import {
  DOCUMENT_ACCEPT,
  formatFileSize,
  leadDisplayName,
  statusesForKind,
  type DocumentKind,
  type LeadOption,
  type TrackedDocument,
} from '@/lib/documents'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

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

export type { TrackedDocument, LeadOption }

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    if (/request entity too large/i.test(text) || res.status === 413) {
      throw new Error('File is too large to send through the app server.')
    }
    throw new Error(text.replace(/\s+/g, ' ').slice(0, 180) || `Upload failed (${res.status})`)
  }
}

export function DocumentTracker({
  kind,
  documents: initialDocuments,
  clients,
  leads = [],
  clientId,
  leadId,
}: {
  kind: DocumentKind
  documents: TrackedDocument[]
  clients: { id: string; company_name: string }[]
  leads?: LeadOption[]
  clientId?: string
  leadId?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [documents, setDocuments] = useState(initialDocuments)
  const [showUpload, setShowUpload] = useState(false)
  const [editing, setEditing] = useState<TrackedDocument | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TrackedDocument | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const allowLeadOwner = kind === 'proposal'
  const defaultOwnerType: 'client' | 'lead' = leadId ? 'lead' : 'client'
  const [form, setForm] = useState({
    owner_type: defaultOwnerType,
    client_id: clientId ?? '',
    lead_id: leadId ?? '',
    title: '',
    status: 'sent',
    is_client_visible: !leadId,
  })

  useEffect(() => {
    setDocuments(initialDocuments)
  }, [initialDocuments])

  const noun = kind === 'proposal' ? 'proposal' : 'contract'
  const nounTitle = kind === 'proposal' ? 'Proposal' : 'Contract'
  const statuses = statusesForKind(kind)
  const showOwnerCol = !clientId && !leadId
  const ownerLocked = Boolean(clientId || leadId)
  const ownerType = ownerLocked ? defaultOwnerType : form.owner_type
  const showPortalToggle = ownerType === 'client'

  const resetForm = () => {
    setForm({
      owner_type: defaultOwnerType,
      client_id: clientId ?? '',
      lead_id: leadId ?? '',
      title: '',
      status: 'sent',
      is_client_visible: !leadId,
    })
  }

  const closeForm = () => {
    setShowUpload(false)
    setEditing(null)
    setError(null)
    resetForm()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const openCreate = () => {
    setError(null)
    setEditing(null)
    resetForm()
    if (fileInputRef.current) fileInputRef.current.value = ''
    setShowUpload(true)
  }

  const openEdit = (doc: TrackedDocument) => {
    setError(null)
    setEditing(doc)
    setForm({
      owner_type: doc.owner_kind,
      client_id: doc.client_id ?? '',
      lead_id: doc.lead_id ?? '',
      title: doc.title,
      status: doc.status,
      is_client_visible: doc.is_client_visible,
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
    setShowUpload(true)
  }

  const ownerNameFromForm = () => {
    if (ownerType === 'lead') {
      const lead = leads.find((l) => l.id === form.lead_id)
      return lead ? leadDisplayName(lead) : 'Lead'
    }
    return clients.find((c) => c.id === form.client_id)?.company_name ?? '—'
  }

  const applySavedDocument = (
    doc: TrackedDocument,
    uploaded?: Record<string, unknown>
  ): TrackedDocument => ({
    ...doc,
    title: String(uploaded?.title ?? form.title.trim()),
    status: String(uploaded?.status ?? form.status),
    sent_at: uploaded && 'sent_at' in uploaded ? (uploaded.sent_at as string | null) : doc.sent_at,
    signed_at: uploaded && 'signed_at' in uploaded ? (uploaded.signed_at as string | null) : doc.signed_at,
    file_name: (uploaded?.file_name as string | null | undefined) ?? doc.file_name,
    mime_type: (uploaded?.mime_type as string | null | undefined) ?? doc.mime_type,
    file_size: typeof uploaded?.file_size === 'number' ? uploaded.file_size : doc.file_size,
    storage_path: (uploaded?.storage_path as string | null | undefined) ?? doc.storage_path,
    is_client_visible: ownerType === 'client' && form.is_client_visible,
    client_id: ownerType === 'client' ? form.client_id : null,
    lead_id: ownerType === 'lead' ? form.lead_id : null,
    owner_kind: ownerType,
    owner_name: ownerNameFromForm(),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const file = fileInputRef.current?.files?.[0]
    if (ownerType === 'client' && !form.client_id) { setError('Select a client'); return }
    if (ownerType === 'lead' && !form.lead_id) { setError('Select a lead'); return }
    if (!form.title.trim()) { setError('Title is required'); return }
    if (!editing && !file) { setError('Choose a PDF or Word document'); return }

    if (editing && !file) {
      setUploading(true)
      try {
        const result = await updateDocumentAction(kind, editing.id, {
          title: form.title.trim(),
          status: form.status,
          is_client_visible: ownerType === 'client' && form.is_client_visible,
          client_id: ownerType === 'client' ? form.client_id : '',
          lead_id: ownerType === 'lead' ? form.lead_id : '',
        })
        if (!result.success) {
          setError(result.error)
          return
        }
        setDocuments((prev) => prev.map((item) => item.id === editing.id ? applySavedDocument(item) : item))
        closeForm()
        router.refresh()
      } catch (err) {
        setError(String(err))
      } finally {
        setUploading(false)
      }
      return
    }

    if (!file) return

    setUploading(true)
    const payload = {
      kind,
      document_id: editing?.id,
      client_id: ownerType === 'client' ? form.client_id : '',
      lead_id: ownerType === 'lead' ? form.lead_id : '',
      title: form.title.trim(),
      status: form.status,
      is_client_visible: ownerType === 'client' && form.is_client_visible,
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
    }

    try {
      const prepareRes = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, step: 'prepare' }),
      })
      const prepareJson = await readJson(prepareRes)
      if (!prepareRes.ok || !prepareJson.success) {
        setError(String(prepareJson.error ?? 'Could not start upload'))
        return
      }

      const uploadRes = await fetch(String(prepareJson.signedUrl), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${String(prepareJson.token)}`,
          'Content-Type': file.type || 'application/octet-stream',
          'x-upsert': 'false',
        },
        body: file,
      })
      if (!uploadRes.ok) {
        const uploadText = await uploadRes.text()
        setError(uploadText.slice(0, 180) || 'File upload failed')
        return
      }

      const completeRes = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          step: 'complete',
          storage_path: prepareJson.path,
        }),
      })
      const json = await readJson(completeRes)
      if (!completeRes.ok || !json.success) {
        setError(String(json.error ?? (editing ? 'Update failed' : 'Upload failed')))
        return
      }
      const uploaded = json.document as Record<string, unknown>
      if (editing) {
        setDocuments((prev) => prev.map((item) => item.id === editing.id ? applySavedDocument(item, uploaded) : item))
      } else {
        const nextDoc: TrackedDocument = {
          id: String(uploaded.id),
          title: String(uploaded.title ?? payload.title),
          status: String(uploaded.status ?? payload.status),
          created_at: String(uploaded.created_at ?? new Date().toISOString()),
          sent_at: (uploaded.sent_at as string | null) ?? null,
          signed_at: (uploaded.signed_at as string | null) ?? null,
          file_name: (uploaded.file_name as string | null) ?? payload.file_name,
          mime_type: (uploaded.mime_type as string | null) ?? payload.mime_type,
          file_size: typeof uploaded.file_size === 'number' ? uploaded.file_size : payload.file_size,
          storage_path: (uploaded.storage_path as string | null) ?? null,
          is_client_visible: ownerType === 'client' && form.is_client_visible,
          client_id: (uploaded.client_id as string | null) ?? null,
          lead_id: (uploaded.lead_id as string | null) ?? null,
          owner_kind: ownerType,
          owner_name: ownerNameFromForm(),
        }
        setDocuments((prev) => [nextDoc, ...prev])
      }
      closeForm()
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
    if (doc.owner_kind !== 'client' || !doc.client_id) return
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

  const ownerColLabel = kind === 'proposal' ? 'For' : 'Client'

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate}>
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
                {['Title', ...(showOwnerCol ? [ownerColLabel] : []), 'File', 'Status', 'Client portal', 'Uploaded', ''].map((h) => (
                  <th key={h || 'actions'} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={showOwnerCol ? 7 : 6} className="px-4 py-10 text-center text-slate-500">
                    No {noun}s yet. Upload a PDF or Word document to keep track of them.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const st = statusStyles[doc.status] ?? statusStyles.draft
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <button
                          type="button"
                          onClick={() => openEdit(doc)}
                          className="text-left hover:text-blue-600 transition-colors"
                          title={`Edit ${noun}`}
                        >
                          {doc.title}
                        </button>
                      </td>
                      {showOwnerCol && (
                        <td className="px-4 py-3 text-slate-600">
                          <div className="flex flex-col gap-0.5">
                            <span>{doc.owner_name}</span>
                            {kind === 'proposal' && (
                              <span className="text-[11px] uppercase tracking-wide text-slate-400">
                                {doc.owner_kind === 'lead' ? 'Lead' : 'Client'}
                              </span>
                            )}
                          </div>
                        </td>
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
                        {doc.owner_kind === 'client' && doc.client_id ? (
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
                        ) : (
                          <span className="text-xs text-slate-400">n/a</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(doc.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(doc)}
                            disabled={isPending}
                            className="rounded p-1 text-slate-500 hover:text-blue-600 transition-colors"
                            title={`Edit ${noun}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(doc)}
                            disabled={isPending}
                            className="rounded p-1 text-slate-500 hover:text-red-600 transition-colors"
                            title={`Delete ${noun}`}
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
        title={`Delete ${nounTitle}`}
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel={`Delete ${nounTitle}`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isPending={isPending}
      />

      <SlideOver
        open={showUpload}
        onClose={closeForm}
        title={editing ? `Edit ${nounTitle}` : `Upload ${nounTitle}`}
        subtitle={
          editing
            ? `Update this ${noun}, or replace the attached file`
            : kind === 'proposal'
              ? 'Attach a PDF or Word document to a client or lead'
              : 'Attach a PDF or Word document to keep on the client record'
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {error && showUpload && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
          )}
          {!ownerLocked && allowLeadOwner && (
            <div>
              <label className={labelClass}>Attach to *</label>
              <div className="flex gap-2">
                {(['client', 'lead'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm((f) => ({
                      ...f,
                      owner_type: type,
                      is_client_visible: type === 'client' ? f.is_client_visible : false,
                    }))}
                    className={cn(
                      'flex-1 rounded-md border px-3 py-2 text-sm font-medium capitalize',
                      ownerType === type
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!ownerLocked && ownerType === 'client' && (
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
          {!ownerLocked && ownerType === 'lead' && (
            <div>
              <label className={labelClass}>Lead *</label>
              <select
                className={selectClass}
                value={form.lead_id}
                onChange={(e) => setForm((f) => ({ ...f, lead_id: e.target.value }))}
                required
              >
                <option value="">Select lead…</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>{leadDisplayName(l)}</option>
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
            <label className={labelClass}>File (PDF or Word){editing ? '' : ' *'}</label>
            <input
              ref={fileInputRef}
              type="file"
              accept={DOCUMENT_ACCEPT}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              required={!editing}
            />
            {editing?.file_name && (
              <p className="mt-1.5 text-xs text-slate-500">
                Current file: {editing.file_name}. Leave empty to keep it, or choose a new file to replace it.
              </p>
            )}
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
          {showPortalToggle && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.is_client_visible}
                onChange={(e) => setForm((f) => ({ ...f, is_client_visible: e.target.checked }))}
              />
              Show in client portal
            </label>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={uploading} className="flex-1">
              {editing ? <Pencil className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              {uploading
                ? (editing ? 'Saving…' : 'Uploading…')
                : editing
                  ? 'Save Changes'
                  : `Upload ${nounTitle}`}
            </Button>
            <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </>
  )
}
