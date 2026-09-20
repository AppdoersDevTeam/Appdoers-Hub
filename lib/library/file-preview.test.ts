import { describe, expect, it } from 'vitest'
import {
  contentDispositionFilename,
  escapeHtml,
  libraryFileHref,
  libraryFilePageHref,
  libraryPreviewKind,
  mimeForLibraryPreview,
} from '@/lib/library/file-preview'

describe('libraryPreviewKind', () => {
  it('detects PDFs from name or mime', () => {
    expect(libraryPreviewKind('Guide.pdf', null)).toBe('pdf')
    expect(libraryPreviewKind('file.bin', 'application/pdf')).toBe('pdf')
  })

  it('detects Word formats', () => {
    expect(libraryPreviewKind('Policy.docx', null)).toBe('docx')
    expect(libraryPreviewKind('Legacy.doc', 'application/msword')).toBe('doc')
  })

  it('returns unknown for other types', () => {
    expect(libraryPreviewKind('notes.txt', 'text/plain')).toBe('unknown')
  })
})

describe('library file URLs', () => {
  it('builds preview, download, and page URLs', () => {
    expect(libraryFileHref('abc')).toBe('/api/library/abc/file')
    expect(libraryFileHref('abc', { download: true, v: '1' })).toBe(
      '/api/library/abc/file?download=1&v=1'
    )
    expect(libraryFilePageHref('abc', '1')).toBe('/app/library-file/abc?v=1')
  })

  it('maps preview kinds to mime types', () => {
    expect(mimeForLibraryPreview('pdf')).toBe('application/pdf')
    expect(mimeForLibraryPreview('docx')).toContain('wordprocessingml')
  })
})

describe('HTML helpers', () => {
  it('escapes text used in preview pages', () => {
    expect(escapeHtml(`<img src="x" onerror="alert('x')">`)).toContain('&lt;img')
    expect(escapeHtml(`<img src="x" onerror="alert('x')">`)).not.toContain('<img')
  })

  it('encodes content-disposition filenames', () => {
    const value = contentDispositionFilename('Client "A".pdf')
    expect(value).toContain('filename="Client _A_.pdf"')
    expect(value).toContain("filename*=UTF-8''")
  })
})
