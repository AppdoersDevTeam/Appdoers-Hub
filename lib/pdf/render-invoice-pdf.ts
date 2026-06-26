import React from 'react'
import { InvoicePDFDocument, type InvoicePDFProps } from '@/lib/invoices/invoice-pdf-document'
import { renderPdfToBuffer } from '@/lib/pdf/render-to-buffer'

export async function renderInvoicePdfToBuffer(props: InvoicePDFProps): Promise<Buffer> {
  return renderPdfToBuffer(React.createElement(InvoicePDFDocument, props))
}
