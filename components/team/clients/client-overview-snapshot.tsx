import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Clock,
  FileText,
  FolderOpen,
  Globe,
  ScrollText,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import type { ClientOverviewStats, OverviewDomain } from '@/lib/clients/overview-stats'

const PHASE_LABELS: Record<string, string> = {
  discovery: 'Discovery',
  design: 'Design',
  development: 'Development',
  review_qa: 'Review & QA',
  launch: 'Launch',
  maintenance: 'Maintenance',
}

const PROJECT_STATUS_CLS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  on_hold: 'bg-amber-50 text-amber-700',
  completed: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-red-50 text-red-700',
}

function domainTone(days: number | null) {
  if (days == null) return { text: 'text-slate-500', bg: 'bg-slate-100', label: 'No expiry set' }
  if (days < 0) return { text: 'text-red-600', bg: 'bg-red-50', label: `Expired ${Math.abs(days)}d ago` }
  if (days <= 30) return { text: 'text-amber-600', bg: 'bg-amber-50', label: `Expires in ${days}d` }
  return { text: 'text-slate-600', bg: 'bg-slate-100', label: `Expires in ${days}d` }
}

function expiryValue(domain: OverviewDomain | null) {
  if (!domain?.expiry_date) return '—'
  return formatDate(domain.expiry_date)
}

function hoursLabel(hours: number) {
  return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)}h`
}

function Chip({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-blue-200 hover:text-blue-700 transition-colors"
    >
      {children}
    </Link>
  )
}

export function ClientOverviewSnapshot({
  clientId,
  stats,
  supabaseCount,
}: {
  clientId: string
  stats: ClientOverviewStats
  supabaseCount: number
}) {
  const nextTone = domainTone(stats.nextDomain?.days_until_expiry ?? null)
  const domainAlert = stats.expiredDomains > 0 || stats.expiringDomains > 0
  const ticketAlert = stats.overdueTickets > 0

  const kpis = [
    {
      label: 'Projects',
      value: `${stats.openProjects} open`,
      sub:
        stats.onHoldProjects > 0
          ? `${stats.completedProjects} completed · ${stats.onHoldProjects} on hold`
          : `${stats.completedProjects} completed`,
      icon: FolderOpen,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      href: `/app/clients/${clientId}?tab=projects`,
      highlight: false,
    },
    {
      label: 'Tickets this week',
      value: String(stats.ticketsDoneThisWeek),
      sub: `Done · ${stats.weekLabel}`,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      href: `/app/clients/${clientId}?tab=tasks`,
      highlight: false,
    },
    {
      label: 'Open tickets',
      value: String(stats.openTickets),
      sub: ticketAlert ? `${stats.overdueTickets} overdue` : `${hoursLabel(stats.hoursThisWeek)} logged this week`,
      icon: ticketAlert ? AlertTriangle : CheckSquare,
      color: ticketAlert ? 'text-red-600' : 'text-slate-500',
      bg: ticketAlert ? 'bg-red-50' : 'bg-slate-100',
      href: `/app/clients/${clientId}?tab=tasks`,
      highlight: ticketAlert,
    },
    {
      label: 'Domain expiry',
      value: expiryValue(stats.nextDomain),
      sub: stats.nextDomain
        ? `${stats.nextDomain.domain_name} · ${nextTone.label}`
        : 'No domains tracked',
      icon: Globe,
      color: domainAlert ? nextTone.text : 'text-blue-600',
      bg: domainAlert ? nextTone.bg : 'bg-blue-50',
      href: `/app/clients/${clientId}?tab=domains`,
      highlight: stats.expiredDomains > 0,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.label}
              href={card.href}
              className={cn(
                'hub-card block hover:border-blue-200 transition-colors',
                card.highlight && 'border-l-4 border-l-red-500'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('shrink-0 rounded-lg p-2.5', card.bg)}>
                  <Icon className={cn('h-4 w-4', card.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">{card.label}</p>
                  <p className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 line-clamp-2">{card.sub}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {supabaseCount > 0 && (
          <Chip href="/app/subscriptions">
            {supabaseCount} Supabase project{supabaseCount === 1 ? '' : 's'}
          </Chip>
        )}
        <Chip href={`/app/clients/${clientId}?tab=proposals`}>
          {stats.proposalsSent} proposal{stats.proposalsSent === 1 ? '' : 's'} sent
          {stats.proposalsApproved > 0 ? ` · ${stats.proposalsApproved} approved` : ''}
        </Chip>
        <Chip href={`/app/clients/${clientId}?tab=contracts`}>
          {stats.contractsSigned} contract{stats.contractsSigned === 1 ? '' : 's'} signed
          {stats.contractsSent > 0 ? ` · ${stats.contractsSent} awaiting signature` : ''}
        </Chip>
        {stats.outstandingInvoiceCount > 0 && (
          <span
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs',
              stats.overdueInvoiceCount > 0
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-slate-200 bg-white text-slate-600'
            )}
          >
            {stats.outstandingInvoiceCount} invoice{stats.outstandingInvoiceCount === 1 ? '' : 's'} outstanding ·{' '}
            {formatCurrency(stats.outstandingInvoiceTotal)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SnapshotList
          title="Projects"
          href={`/app/clients/${clientId}?tab=projects`}
          empty="No projects yet"
          isEmpty={stats.projects.length === 0}
        >
          {stats.projects.slice(0, 5).map((project) => (
            <div key={project.id} className="flex items-start justify-between gap-2 py-2">
              <div className="min-w-0">
                <Link
                  href={`/app/projects/${project.id}`}
                  className="text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors line-clamp-1"
                >
                  {project.name}
                </Link>
                <p className="mt-0.5 text-xs text-slate-500">
                  {PHASE_LABELS[project.current_phase] ?? project.current_phase}
                  {project.target_launch_date ? ` · Launch ${formatDate(project.target_launch_date)}` : ''}
                </p>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                  PROJECT_STATUS_CLS[project.status] ?? 'bg-slate-100 text-slate-500'
                )}
              >
                {project.status.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </SnapshotList>

        <SnapshotList
          title="Tickets"
          href={`/app/clients/${clientId}?tab=tasks`}
          empty="No ticket activity this week"
          isEmpty={stats.doneThisWeek.length === 0 && stats.overdue.length === 0 && stats.openTickets === 0}
        >
          {stats.overdue.length > 0 && (
            <p className="pt-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-red-600">Overdue</p>
          )}
          {stats.overdue.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} danger />
          ))}
          {stats.doneThisWeek.length > 0 && (
            <p className="pt-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Done this week
            </p>
          )}
          {stats.doneThisWeek.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} />
          ))}
          {stats.doneThisWeek.length === 0 && stats.overdue.length === 0 && (
            <p className="py-2 text-xs text-slate-500">{stats.openTickets} open · none closed this week</p>
          )}
        </SnapshotList>

        <SnapshotList
          title="Domains"
          href={`/app/clients/${clientId}?tab=domains`}
          empty="No domains tracked"
          isEmpty={stats.domains.length === 0}
        >
          {stats.domains.slice(0, 5).map((domain) => {
            const tone = domainTone(domain.days_until_expiry)
            return (
              <div key={domain.id} className="flex items-start justify-between gap-2 py-2">
                <div className="min-w-0">
                  <a
                    href={`https://${domain.domain_name}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors line-clamp-1"
                  >
                    {domain.domain_name}
                  </a>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {domain.auto_renew ? 'Auto-renew on' : 'Auto-renew off'}
                    {domain.ssl_status ? ` · SSL ${domain.ssl_status.replace(/_/g, ' ')}` : ''}
                  </p>
                </div>
                <span className={cn('shrink-0 rounded px-2 py-0.5 text-xs font-medium', tone.bg, tone.text)}>
                  {domain.expiry_date ? formatDate(domain.expiry_date) : 'No date'}
                </span>
              </div>
            )
          })}
        </SnapshotList>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="hub-card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FileText className="h-4 w-4 text-slate-500" />
            Documents
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Link href={`/app/clients/${clientId}?tab=proposals`} className="rounded-md bg-slate-50 px-3 py-2 hover:bg-slate-100">
              <p className="text-xs text-slate-500">Proposals sent</p>
              <p className="mt-0.5 font-semibold text-slate-900">{stats.proposalsSent}</p>
              <p className="text-xs text-slate-500">{stats.proposalsApproved} approved</p>
            </Link>
            <Link href={`/app/clients/${clientId}?tab=contracts`} className="rounded-md bg-slate-50 px-3 py-2 hover:bg-slate-100">
              <p className="text-xs text-slate-500">Contracts signed</p>
              <p className="mt-0.5 font-semibold text-slate-900">{stats.contractsSigned}</p>
              <p className="text-xs text-slate-500">
                {stats.contractsSent > 0 ? `${stats.contractsSent} awaiting signature` : 'None waiting'}
              </p>
            </Link>
          </div>
        </div>
        <div className="hub-card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Clock className="h-4 w-4 text-slate-500" />
            This week
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">Hours logged</p>
              <p className="mt-0.5 font-semibold text-slate-900">{hoursLabel(stats.hoursThisWeek)}</p>
              <p className="text-xs text-slate-500">{stats.weekLabel}</p>
            </div>
            <div className="rounded-md bg-slate-50 px-3 py-2">
              <p className="flex items-center gap-1 text-xs text-slate-500">
                <ScrollText className="h-3 w-3" />
                Outstanding invoices
              </p>
              <p className="mt-0.5 font-semibold text-slate-900">
                {stats.outstandingInvoiceCount > 0 ? formatCurrency(stats.outstandingInvoiceTotal) : '—'}
              </p>
              <p className="text-xs text-slate-500">
                {stats.outstandingInvoiceCount > 0
                  ? `${stats.outstandingInvoiceCount} unpaid${stats.overdueInvoiceCount > 0 ? ` · ${stats.overdueInvoiceCount} overdue` : ''}`
                  : 'None unpaid'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SnapshotList({
  title,
  href,
  empty,
  isEmpty,
  children,
}: {
  title: string
  href: string
  empty: string
  isEmpty: boolean
  children: ReactNode
}) {
  return (
    <div className="hub-card flex h-full flex-col">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {!isEmpty && (
          <Link href={href} className="text-xs text-blue-600 hover:underline">
            View all
          </Link>
        )}
      </div>
      {isEmpty ? (
        <p className="py-6 text-center text-xs text-slate-500">{empty}</p>
      ) : (
        <div className="divide-y divide-slate-100">{children}</div>
      )}
    </div>
  )
}

function TicketRow({
  ticket,
  danger = false,
}: {
  ticket: ClientOverviewStats['doneThisWeek'][number]
  danger?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-2 py-2">
      <div className="min-w-0">
        <Link
          href={`/app/tasks/${ticket.id}`}
          className="text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors line-clamp-1"
        >
          {ticket.title}
        </Link>
        <p className="mt-0.5 text-xs text-slate-500">
          {ticket.project_name}
          {ticket.assignee_name ? ` · ${ticket.assignee_name}` : ''}
        </p>
      </div>
      {ticket.due_date && (
        <span className={cn('shrink-0 text-xs font-medium', danger ? 'text-red-600' : 'text-slate-500')}>
          {formatDate(ticket.due_date)}
        </span>
      )}
    </div>
  )
}
