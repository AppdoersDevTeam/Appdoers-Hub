import path from 'path'
import { Font } from '@react-pdf/renderer'

let registered = false

const FONT_DIR = path.join(process.cwd(), 'public', 'fonts', 'inter')

export const PDF_FONT = {
  regular: 'Inter',
  medium: 'Inter',
  semibold: 'Inter',
  bold: 'Inter',
} as const

export function registerPdfFonts(): void {
  if (registered) return

  Font.register({
    family: 'Inter',
    fonts: [
      { src: path.join(FONT_DIR, 'Inter-Regular.woff'), fontWeight: 400 },
      { src: path.join(FONT_DIR, 'Inter-Medium.woff'), fontWeight: 500 },
      { src: path.join(FONT_DIR, 'Inter-SemiBold.woff'), fontWeight: 600 },
      { src: path.join(FONT_DIR, 'Inter-Bold.woff'), fontWeight: 700 },
    ],
  })

  registered = true
}

export const pdfFontStyles = {
  regular: { fontFamily: PDF_FONT.regular, fontWeight: 400 as const },
  medium: { fontFamily: PDF_FONT.medium, fontWeight: 500 as const },
  semibold: { fontFamily: PDF_FONT.semibold, fontWeight: 600 as const },
  bold: { fontFamily: PDF_FONT.bold, fontWeight: 700 as const },
}
