'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  FolderKanban,
  CheckSquare,
  FileText,
  ScrollText,
  Receipt,
  FolderOpen,
  BarChart2,
  Settings,
  CreditCard,
  UserCircle,
} from 'lucide-react'
import { AppdoersLogo } from '@/components/brand/appdoers-logo'
import { cn } from '@/lib/utils/cn'

const navItems = [
  { href: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/clients', label: 'Clients', icon: Users },
  { href: '/app/leads', label: 'Leads', icon: TrendingUp },
  { href: '/app/projects', label: 'Projects', icon: FolderKanban },
  { href: '/app/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/app/proposals', label: 'Proposals', icon: FileText },
  { href: '/app/contracts', label: 'Contracts', icon: ScrollText },
  { href: '/app/invoices', label: 'Invoices', icon: Receipt },
  { href: '/app/files', label: 'Files', icon: FolderOpen },
  { href: '/app/recaps', label: 'Recaps', icon: BarChart2 },
  { href: '/app/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/app/settings', label: 'Settings', icon: Settings },
]

// These are always visible (not permission-gated)
const bottomItems = [
  { href: '/app/account', label: 'My Account', icon: UserCircle },
]

interface Props {
  hiddenHrefs?: string[]
}

export function Sidebar({ hiddenHrefs = [] }: Props) {
  const pathname = usePathname()

  const visible = navItems.filter(item => !hiddenHrefs.includes(item.href))

  const isActive = (href: string) =>
    pathname === href || (href !== '/app/dashboard' && pathname.startsWith(href))

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-slate-200 px-4">
        <Link href="/app/dashboard" className="flex items-center gap-2">
          <AppdoersLogo variant="icon" />
          <span className="text-sm font-semibold text-slate-900">Appdoers Hub</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {visible.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive(href)
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom — always-visible items + version */}
      <div className="border-t border-slate-200 px-3 py-3 space-y-0.5">
        {bottomItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive(href)
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
        <p className="px-3 pt-2 text-xs text-slate-400">Appdoers Hub v0.1</p>
      </div>
    </aside>
  )
}
