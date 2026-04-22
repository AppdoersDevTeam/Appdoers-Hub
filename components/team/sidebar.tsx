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
} from 'lucide-react'
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

interface Props {
  hiddenHrefs?: string[]
}

export function Sidebar({ hiddenHrefs = [] }: Props) {
  const pathname = usePathname()

  const visible = navItems.filter(item => !hiddenHrefs.includes(item.href))

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-[#1F2D45] bg-[#111827]">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-[#1F2D45] px-4">
        <Link href="/app/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#3B82F6]">
            <span className="text-xs font-bold text-white">A</span>
          </div>
          <span className="text-sm font-semibold text-[#F1F5F9]">Appdoers Hub</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {visible.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/app/dashboard' && pathname.startsWith(href))
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[#3B82F6]/10 text-[#3B82F6]'
                      : 'text-[#94A3B8] hover:bg-[#1C2537] hover:text-[#F1F5F9]'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom label */}
      <div className="border-t border-[#1F2D45] px-4 py-3">
        <p className="text-xs text-[#475569]">Appdoers Hub v0.1</p>
      </div>
    </aside>
  )
}
