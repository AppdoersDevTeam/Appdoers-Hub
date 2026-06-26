export function formatPdfCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatPdfDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-NZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function sanitizePdfFilename(name: string): string {
  const base = name.replace(/[^a-z0-9._-]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  return base.endsWith('.pdf') ? base : `${base || 'document'}.pdf`
}
