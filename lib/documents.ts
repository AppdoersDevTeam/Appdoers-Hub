export type DocumentKind = 'proposal' | 'contract'

export const DOCUMENT_BUCKET = 'client-files'
export const DOCUMENT_MAX_SIZE = 50 * 1024 * 1024

export const DOCUMENT_ACCEPT =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

const ALLOWED_EXT = new Set(['.pdf', '.doc', '.docx'])

export const PROPOSAL_STATUSES = ['draft', 'sent', 'approved', 'declined', 'expired'] as const
export const CONTRACT_STATUSES = ['draft', 'sent', 'signed', 'superseded'] as const

export type ProposalDocStatus = (typeof PROPOSAL_STATUSES)[number]
export type ContractDocStatus = (typeof CONTRACT_STATUSES)[number]

export function statusesForKind(kind: DocumentKind): readonly string[] {
  return kind === 'proposal' ? PROPOSAL_STATUSES : CONTRACT_STATUSES
}

export function tableForKind(kind: DocumentKind): 'proposals' | 'contracts' {
  return kind === 'proposal' ? 'proposals' : 'contracts'
}

export function folderForKind(kind: DocumentKind): 'proposals' | 'contracts' {
  return kind === 'proposal' ? 'proposals' : 'contracts'
}

export function isAllowedDocument(file: { name: string; type: string }): boolean {
  const ext = file.name.includes('.')
    ? `.${file.name.split('.').pop()?.toLowerCase()}`
    : ''
  if (ALLOWED_EXT.has(ext)) return true
  return ALLOWED_MIME.has(file.type)
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function parseDocumentKind(value: unknown): DocumentKind | null {
  if (value === 'proposal' || value === 'contract') return value
  return null
}

export function validateDocumentOwner(
  kind: DocumentKind,
  clientId: string,
  leadId: string
): string | null {
  if (kind === 'contract' && !clientId) return 'Select a client'
  if (kind === 'proposal' && !clientId && !leadId) return 'Select a client or a lead'
  return null
}

export function buildDocumentStoragePath(
  kind: DocumentKind,
  clientId: string,
  leadId: string,
  fileName: string
): string {
  const timestamp = Date.now()
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const ownerPrefix = clientId ? `clients/${clientId}` : `leads/${leadId}`
  return `${ownerPrefix}/${folderForKind(kind)}/${timestamp}-${safeName}`
}
