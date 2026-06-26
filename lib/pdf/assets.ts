import path from 'path'

export const PDF_LOGO_PATH = path.join(process.cwd(), 'public', 'logo.png')

export const PDF_LOGO_STYLE = {
  width: 120,
  height: 36,
  objectFit: 'contain' as const,
}

export const PDF_LOGO_BOX_STYLE = {
  backgroundColor: '#ffffff',
  borderRadius: 6,
  paddingHorizontal: 10,
  paddingVertical: 8,
  marginBottom: 10,
  alignSelf: 'flex-start' as const,
}
