import React from 'react'
import { RecapPDFDocument, type RecapPDFProps } from '@/lib/recaps/recap-pdf-document'
import { renderPdfToBuffer } from '@/lib/pdf/render-to-buffer'

export async function renderRecapPdfToBuffer(props: RecapPDFProps): Promise<Buffer> {
  return renderPdfToBuffer(React.createElement(RecapPDFDocument, props))
}
