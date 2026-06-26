import { renderToBuffer } from '@react-pdf/renderer'
import type { ReactElement } from 'react'

type PdfElement = Parameters<typeof renderToBuffer>[0]

export function renderPdfToBuffer(element: ReactElement): Promise<Buffer> {
  return renderToBuffer(element as PdfElement)
}
