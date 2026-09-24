'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, FileText } from 'lucide-react'
import { getDocumentDownloadUrlAction } from '@/lib/actions/documents'
import { signContractAction } from '@/lib/actions/contracts'
import type { DocumentKind } from '@/lib/documents'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

const statusConfig: Record<string, { label: string; cls: string }> = {
  sent: { label: 'Sent', cls: 'bg-blue-50 text-blue-600' },
  approved: { label: 'Approved', cls: 'bg-green-50 text-green-700' },
  declined: { label: 'Declined', cls: 'bg-red-50 text-red-600' },
  expired: { label: 'Expired', cls: 'bg-amber-50 text-amber-700' },
  signed: { label: 'Signed', cls: 'bg-green-50 text-green-700' },
  superseded: { label: 'Superseded', cls: 'bg-gray-100 text-gray-600' },
}

export interface PortalDocument {
  id: string
  title: string
  status: string
  created_at: string
  sent_at: string | null
  signed_at?: string | null
  file_name: string | null
}

export function PortalDocumentList({
  kind,
  documents,
  signer,
}: {
  kind: DocumentKind
  documents: PortalDocument[]
  signer?: { full_name: string; email: string }
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [signingId, setSigningId] = useState<string | null>(null)
  const [signerName, setSignerName] = useState(signer?.full_name ?? '')
  const [agreed, setAgreed] = useState(false)
  const noun = kind === 'proposal' ? 'proposals' : 'contracts'
  const heading = kind === 'proposal' ? 'Proposals' : 'Contracts'
  const subtitle =
    kind === 'proposal'
      ? 'Download proposal documents from Appdoers.'
      : 'Download and sign contract documents from Appdoers.'

  const handleDownload = (doc: PortalDocument) => {
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

  const handleSign = (doc: PortalDocument) => {
    if (!signerName.trim()) {
      setError('Enter your full legal name to sign.')
      return
    }
    if (!agreed) {
      setError('Confirm you have read and agree to the contract.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await signContractAction(doc.id, signerName.trim())
      if (!result.success) {
        setError(result.error)
        return
      }
      setSigningId(null)
      setAgreed(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{heading}</h1>
        <p className="text-gray-500 mt-1">{subtitle}</p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500">No {noun} to display yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const st = statusConfig[doc.status] ?? { label: doc.status, cls: 'bg-gray-100 text-gray-600' }
            return (
              <div key={doc.id} className="rounded-xl border border-gray-200 bg-white px-5 py-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{doc.title}</p>
                    <p className="text-sm text-gray-500">
                      {doc.signed_at
                        ? `Signed ${formatDate(doc.signed_at)}`
                        : doc.sent_at
                          ? `Received ${formatDate(doc.sent_at)}`
                          : formatDate(doc.created_at)}
                      {doc.file_name ? ` · ${doc.file_name}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleDownload(doc)}
                    disabled={isPending || !doc.file_name}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  {kind === 'contract' && doc.status === 'sent' && (
                    <button
                      type="button"
                      onClick={() => setSigningId(signingId === doc.id ? null : doc.id)}
                      className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                    >
                      Sign
                    </button>
                  )}
                  <span className={cn('rounded-full px-3 py-1 text-xs font-medium', st.cls)}>{st.label}</span>
                </div>
                </div>
                {signingId === doc.id && kind === 'contract' && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                    <p className="text-sm text-emerald-900">
                      Download and read the contract, then type your full legal name to sign electronically.
                    </p>
                    <input
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="Full legal name"
                      className="w-full max-w-sm rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm"
                    />
                    <label className="flex items-start gap-2 text-sm text-emerald-900">
                      <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-1"
                      />
                      I have read this contract and agree to be bound by its terms.
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSign(doc)}
                      disabled={isPending || !agreed || !signerName.trim()}
                      className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {isPending ? 'Signing…' : 'Sign contract'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
