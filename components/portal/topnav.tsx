'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AppdoersLogo } from '@/components/brand/appdoers-logo'
import { cn } from '@/lib/utils/cn'

const navItems = [
  { href: '/portal/projects', label: 'My Projects' },
  { href: '/portal/proposals', label: 'Proposals' },
  { href: '/portal/contracts', label: 'Contracts' },
  { href: '/portal/recaps', label: 'Reports' },
]

interface TopNavProps {
  clientName?: string
}

export function PortalTopNav({ clientName }: TopNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/portal/login')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white safe-top">
      <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/portal/projects" className="flex items-center gap-2">
          <AppdoersLogo variant="icon" />
          <span className="text-sm font-semibold text-slate-900">Appdoers Hub</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map(({ href, label }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors touch-manipulation',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          {clientName && (
            <span className="hidden max-w-[10rem] truncate text-sm text-slate-500 sm:block">
              {clientName}
            </span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="hidden h-11 w-11 items-center justify-center rounded-md md:flex text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 touch-manipulation"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-md text-slate-400 md:hidden touch-manipulation"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 top-[calc(3.5rem+env(safe-area-inset-top,0px))] -z-10 bg-slate-900/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      {mobileOpen && (
        <div className="border-t border-slate-100 bg-white px-4 py-2 safe-bottom md:hidden">
          {clientName && (
            <p className="truncate px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              {clientName}
            </p>
          )}
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-medium touch-manipulation',
                pathname.startsWith(href)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-md border-t border-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 touch-manipulation"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </header>
  )
}
