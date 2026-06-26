import React from 'react'
import { InvoicePDFDocument, type InvoicePDFProps } from '@/lib/invoices/invoice-pdf-document'
import { registerPdfFonts } from '@/lib/pdf/fonts'
import { renderPdfToBuffer } from '@/lib/pdf/render-to-buffer'

export async function renderInvoicePdfToBuffer(props: InvoicePDFProps): Promise<Buffer> {
  registerPdfFonts()
  return renderPdfToBuffer(React.createElement(InvoicePDFDocument, props))
}
