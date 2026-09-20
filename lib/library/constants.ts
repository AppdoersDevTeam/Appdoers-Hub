export const LIBRARY_KINDS = ['document', 'template', 'workflow'] as const

export type LibraryKind = (typeof LIBRARY_KINDS)[number]

export const LIBRARY_KIND_LABELS: Record<LibraryKind, string> = {
  document: 'Document',
  template: 'Template',
  workflow: 'Workflow',
}

export const LIBRARY_KIND_PLURALS: Record<LibraryKind, string> = {
  document: 'Documents',
  template: 'Templates',
  workflow: 'Workflows',
}

export const LIBRARY_KIND_DESCRIPTIONS: Record<LibraryKind, string> = {
  document: 'Internal process, policy, or guide',
  template: 'Reusable copy or file outline',
  workflow: 'Step-by-step team process',
}

export const LIBRARY_KIND_BADGE: Record<LibraryKind, 'blue' | 'purple' | 'success'> = {
  document: 'blue',
  template: 'purple',
  workflow: 'success',
}

export function parseLibraryKind(value: unknown): LibraryKind | null {
  if (value === 'document' || value === 'template' || value === 'workflow') return value
  return null
}

export function isValidLibraryLink(url: string): boolean {
  if (!url) return true
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export const LIBRARY_STORAGE_PREFIX = 'library/'

export function buildLibraryStoragePath(fileName: string): string {
  const timestamp = Date.now()
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${LIBRARY_STORAGE_PREFIX}${timestamp}-${safeName}`
}

export function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
}
