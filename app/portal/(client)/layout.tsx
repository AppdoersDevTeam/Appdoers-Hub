import { PortalTopNav } from '@/components/portal/topnav'

export default function PortalClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-portal min-h-screen bg-[#F8FAFC]">
      <PortalTopNav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="animate-fade-in">{children}</div>
      </main>
    </div>
  )
}
