import React from 'react'
import { CursorTeamSetupPDFDocument } from '@/lib/pdf/cursor-team-setup-pdf-document'
import { registerPdfFonts } from '@/lib/pdf/fonts'
import { renderPdfToBuffer } from '@/lib/pdf/render-to-buffer'

export async function renderCursorTeamSetupPdfToBuffer(): Promise<Buffer> {
  registerPdfFonts()
  return renderPdfToBuffer(React.createElement(CursorTeamSetupPDFDocument))
}
