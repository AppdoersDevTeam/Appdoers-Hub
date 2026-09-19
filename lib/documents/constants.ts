export type DocumentKind = 'proposal' | 'contract'

export const DOCUMENT_BUCKET = 'client-files'
export const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024

export const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx'] as const

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

export const DOCUMENT_ACCEPT =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export const DOCUMENT_TABLE = {
  proposal: 'proposals',
  contract: 'contracts',
} as const

export const DOCUMENT_FOLDER = {
  proposal: 'proposals',
  contract: 'contracts',
} as const

export const DOCUMENT_LABEL = {
  proposal: 'Proposal',
  contract: 'Contract',
} as const
