import React from 'react'
import { registerPdfFonts } from '@/lib/pdf/fonts'
import { TasksPDFDocument, type TasksPDFProps } from '@/lib/pdf/tasks-pdf-document'
import { renderPdfToBuffer } from '@/lib/pdf/render-to-buffer'

export async function renderTasksPdfToBuffer(props: TasksPDFProps): Promise<Buffer> {
  registerPdfFonts()
  return renderPdfToBuffer(React.createElement(TasksPDFDocument, props))
}
