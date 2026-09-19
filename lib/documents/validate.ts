import {
  ALLOWED_DOCUMENT_EXTENSIONS,
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE,
} from './constants'

export function hasAllowedDocumentExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase()
  return ALLOWED_DOCUMENT_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

export function isAllowedDocumentMime(mimeType: string | null | undefined): boolean {
  if (!mimeType) return true
  return (ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(mimeType)
}

export function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || fileName
}

export function validateUploadedDocument(file: {
  name: string
  type: string
  size: number
}): string | null {
  if (!file.name) return 'A file is required'
  if (file.size <= 0) return 'The selected file is empty'
  if (file.size > MAX_DOCUMENT_SIZE) return 'File exceeds the 50MB limit'
  if (!hasAllowedDocumentExtension(file.name)) {
    return 'Only PDF and Word documents (.pdf, .doc, .docx) are allowed'
  }
  if (!isAllowedDocumentMime(file.type)) {
    return 'Only PDF and Word documents (.pdf, .doc, .docx) are allowed'
  }
  return null
}
