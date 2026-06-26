import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type { ReactElement } from 'react'
import { sanitizePdfFilename } from './format'

export async function renderPdfRoute(
  element: ReactElement,
  filename: string
): Promise<NextResponse> {
  try {
    const buffer = await renderToBuffer(element)
    const safeName = sanitizePdfFilename(filename)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}"`,
      },
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}
