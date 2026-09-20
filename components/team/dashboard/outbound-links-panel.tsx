import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  BookOpen,
  Calculator,
  Cloud,
  CreditCard,
  Database,
  ExternalLink,
  Figma,
  Github,
  Globe,
  HardDrive,
  Instagram,
  Linkedin,
  Mail,
  Slack,
  Triangle,
  Twitter,
  Youtube,
  Facebook,
} from 'lucide-react'
import { DashboardSection } from '@/components/team/dashboard/chart-card'
import type { OutboundLinkKey, VisibleOutboundLink } from '@/lib/outbound-links'

const LINK_ICONS: Record<OutboundLinkKey | 'website', LucideIcon> = {
  website: Globe,
  github: Github,
  supabase: Database,
  vercel: Triangle,
  slack: Slack,
  stripe: CreditCard,
  xero: Calculator,
  google_workspace: Mail,
  google_drive: HardDrive,
  cloudflare: Cloud,
  figma: Figma,
  notion: BookOpen,
  google_analytics: BarChart3,
  linkedin: Linkedin,
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  x: Twitter,
}

function iconFor(id: string): LucideIcon {
  if (id in LINK_ICONS) return LINK_ICONS[id as OutboundLinkKey | 'website']
  return ExternalLink
}

interface Props {
  links: VisibleOutboundLink[]
}

export function OutboundLinksPanel({ links }: Props) {
  if (links.length === 0) return null

  return (
    <DashboardSection
      title="Quick links"
      description="Jump to company tools and profiles"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {links.map((link) => {
          const Icon = iconFor(link.id)
          return (
            <a
              key={link.id}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${link.label} (opens in a new tab)`}
              title={link.href}
              className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/40"
            >
              <div className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700">
                <Icon className="h-4 w-4" />
              </div>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                {link.label}
              </span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-blue-600" />
            </a>
          )
        })}
      </div>
    </DashboardSection>
  )
}
