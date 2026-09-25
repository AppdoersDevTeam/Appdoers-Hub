'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { Sidebar, TeamNav } from '@/components/team/sidebar'
import { SearchTrigger } from '@/components/team/search-trigger'
import { cn } from '@/lib/utils/cn'

interface TeamShellProps {
  hiddenHrefs?: string[]
  headerActions: ReactNode
  children: ReactNode
}

export function TeamShell({ hiddenHrefs = [], headerActions, children }: TeamShellProps) {
  const pathname = usePathname()
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    setNavOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!navOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [navOpen])

  return (
    <div className="theme-team min-h-dvh bg-[#F8FAFC]">
      <Sidebar hiddenHrefs={hiddenHrefs} />

      {/* Mobile nav drawer */}
      <div
        className={cn(
          'fixed inset-0 z-50 md:hidden',
          navOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        aria-hidden={!navOpen}
      >
        <button
          type="button"
          className={cn(
            'absolute inset-0 bg-slate-900/40 transition-opacity',
            navOpen ? 'opacity-100' : 'opacity-0'
          )}
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
        <div
          className={cn(
            'absolute inset-y-0 left-0 flex w-[min(20rem,calc(100vw-3rem))] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 ease-out safe-top',
            navOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 touch-manipulation"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
          <TeamNav hiddenHrefs={hiddenHrefs} onNavigate={() => setNavOpen(false)} />
        </div>
      </div>

      <header className="fixed right-0 top-0 z-30 flex min-h-14 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 left-0 md:left-60 sm:px-4 md:px-6 safe-top">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 md:hidden touch-manipulation"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <SearchTrigger />
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">{headerActions}</div>
      </header>

      <main className="ml-0 min-w-0 safe-main-top md:ml-60">
        <div className="min-w-0 max-w-full animate-fade-in p-4 safe-bottom sm:p-5 md:p-6">{children}</div>
      </main>
    </div>
  )
}
