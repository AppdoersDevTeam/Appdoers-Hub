import React from 'react'
import { registerPdfFonts } from '@/lib/pdf/fonts'
import { RecapPDFDocument, type RecapPDFProps } from '@/lib/recaps/recap-pdf-document'
import { renderPdfToBuffer } from '@/lib/pdf/render-to-buffer'

export async function renderRecapPdfToBuffer(props: RecapPDFProps): Promise<Buffer> {
  registerPdfFonts()
  return renderPdfToBuffer(React.createElement(RecapPDFDocument, props))
}
