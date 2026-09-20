import { GOOGLE_FONTS_HREF } from '@/lib/intake/brand-options'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Project intake | Appdoers',
  robots: 'noindex, nofollow',
}

export default function IntakeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-portal min-h-screen bg-[#F8FAFC] text-slate-900">
      <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />
      {children}
    </div>
  )
}
