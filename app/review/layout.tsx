import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Website review | Appdoers',
  robots: 'noindex, nofollow',
}

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return <div className="theme-portal min-h-dvh bg-[#F8FAFC] text-slate-900">{children}</div>
}
