import { describe, expect, it } from 'vitest'
import {
  contentDispositionFilename,
  escapeHtml,
  libraryFileHref,
  libraryPreviewKind,
  stripUnsafeHtml,
  wrapLibraryPreviewHtml,
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

describe('libraryFileHref', () => {
  it('builds preview and download URLs', () => {
    expect(libraryFileHref('abc')).toBe('/api/library/abc/file')
    expect(libraryFileHref('abc', { download: true, v: '1' })).toBe(
      '/api/library/abc/file?download=1&v=1'
    )
  })
})

describe('HTML helpers', () => {
  it('escapes text used in preview pages', () => {
    expect(escapeHtml(`<img src="x" onerror="alert('x')">`)).toContain('&lt;img')
    expect(escapeHtml(`<img src="x" onerror="alert('x')">`)).not.toContain('<img')
  })

  it('strips scripts and inline handlers from converted Word HTML', () => {
    const cleaned = stripUnsafeHtml(
      `<p>Hello</p><script>alert(1)</script><img src="x" onerror="alert(1)">`
    )
    expect(cleaned).toContain('<p>Hello</p>')
    expect(cleaned).not.toMatch(/<script/i)
    expect(cleaned).not.toMatch(/onerror/i)
  })

  it('wraps converted Word HTML in a readable page', () => {
    const html = wrapLibraryPreviewHtml({ title: 'Onboarding', body: '<p>Step one</p>' })
    expect(html).toContain('Onboarding')
    expect(html).toContain('<p>Step one</p>')
  })

  it('encodes content-disposition filenames', () => {
    const value = contentDispositionFilename('Client "A".pdf')
    expect(value).toContain('filename="Client _A_.pdf"')
    expect(value).toContain("filename*=UTF-8''")
  })
})
