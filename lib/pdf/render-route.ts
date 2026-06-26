import { NextResponse } from 'next/server'
import { sanitizePdfFilename } from './format'

export async function renderPdfRoute(
  render: () => Promise<Uint8Array | Buffer>,
  filename: string
): Promise<NextResponse> {
  try {
    const buffer = await render()
    const safeName = sanitizePdfFilename(filename)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('PDF generation error:', message, err)
    return NextResponse.json({ error: 'PDF generation failed', detail: message }, { status: 500 })
  }
}
