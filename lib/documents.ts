export type DocumentKind = 'proposal' | 'contract'

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
  client_id: string | null
  lead_id?: string | null
  owner_kind: 'client' | 'lead'
  owner_name: string
}

export interface LeadOption {
  id: string
  contact_name: string
  company_name: string | null
}

export function leadDisplayName(lead: { contact_name: string; company_name: string | null }): string {
  return lead.company_name ? `${lead.contact_name} · ${lead.company_name}` : lead.contact_name
}

export function oneRelation<T extends object>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

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

export function documentStatusTimestamps(
  kind: DocumentKind,
  status: string,
  now = new Date().toISOString()
): Record<string, string | null> {
  const updates: Record<string, string | null> = { status }
  if (status === 'draft') {
    updates.sent_at = null
    if (kind === 'contract') updates.signed_at = null
  } else if (status === 'signed' && kind === 'contract') {
    updates.sent_at = now
    updates.signed_at = now
  } else {
    updates.sent_at = now
    if (kind === 'contract') updates.signed_at = null
  }
  return updates
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
