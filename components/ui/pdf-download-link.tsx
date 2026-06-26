import Link from 'next/link'

/** Shared styling for CRM PDF download links in team UI. */
export const pdfDownloadLinkClass =
  'inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:border-blue-400 hover:bg-blue-100 transition-colors'

export function PdfDownloadLink({
  href,
  label = 'Download PDF',
}: {
  href: string
  label?: string
}) {
  return (
    <Link href={href} target="_blank" rel="noopener noreferrer" className={pdfDownloadLinkClass}>
      {label}
    </Link>
  )
}
