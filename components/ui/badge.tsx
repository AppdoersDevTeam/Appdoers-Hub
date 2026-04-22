import * as React from 'react'
import { cn } from '@/lib/utils/cn'
import type {
  LeadStatus,
  ProjectStatus,
  ClientFacingStatus,
  TaskStatus,
  TaskPriority,
  ProposalStatus,
  ContractStatus,
  InvoiceStatus,
} from '@/lib/types/database'

type BadgeStatus =
  | LeadStatus
  | ProjectStatus
  | ClientFacingStatus
  | TaskStatus
  | TaskPriority
  | ProposalStatus
  | ContractStatus
  | InvoiceStatus
  | 'active'
  | 'inactive'
  | 'churned'
  | string

const statusConfig: Record<string, { label: string; className: string }> = {
  // Lead statuses
  new: { label: 'New', className: 'bg-[#1C2537] text-[#94A3B8] border border-[#1F2D45]' },
  contacted: { label: 'Contacted', className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  qualified: { label: 'Qualified', className: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
  proposal_sent: { label: 'Proposal Sent', className: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
  negotiating: { label: 'Negotiating', className: 'bg-orange-500/10 text-orange-400 border border-orange-500/20' },
  won: { label: 'Won', className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  lost: { label: 'Lost', className: 'bg-red-500/10 text-red-400 border border-red-500/20' },

  // Project internal statuses
  active: { label: 'Active', className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  on_hold: { label: 'On Hold', className: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
  completed: { label: 'Completed', className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  cancelled: { label: 'Cancelled', className: 'bg-red-500/10 text-red-400 border border-red-500/20' },

  // Client-facing statuses
  in_progress: { label: 'In Progress', className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  awaiting_appdoers: { label: 'Awaiting Appdoers', className: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
  awaiting_client: { label: 'Awaiting Client', className: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },

  // Task statuses
  open: { label: 'Open', className: 'bg-[#1C2537] text-[#94A3B8] border border-[#1F2D45]' },
  in_progress_task: { label: 'In Progress', className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  awaiting_review: { label: 'Awaiting Review', className: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
  closed: { label: 'Closed', className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },

  // Task priorities
  p0: { label: 'P0 Critical', className: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  p1: { label: 'P1 High', className: 'bg-orange-500/10 text-orange-400 border border-orange-500/20' },
  p2: { label: 'P2 Medium', className: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
  p3: { label: 'P3 Low', className: 'bg-[#1C2537] text-[#94A3B8] border border-[#1F2D45]' },

  // Proposal statuses
  draft: { label: 'Draft', className: 'bg-[#1C2537] text-[#94A3B8] border border-[#1F2D45]' },
  sent: { label: 'Sent', className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  approved: { label: 'Approved', className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  declined: { label: 'Declined', className: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  expired: { label: 'Expired', className: 'bg-[#1C2537] text-[#475569] border border-[#1F2D45]' },

  // Contract statuses
  signed: { label: 'Signed', className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  superseded: { label: 'Superseded', className: 'bg-[#1C2537] text-[#475569] border border-[#1F2D45]' },

  // Invoice statuses
  paid: { label: 'Paid', className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  overdue: { label: 'Overdue', className: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  void: { label: 'Void', className: 'bg-[#1C2537] text-[#475569] border border-[#1F2D45]' },

  // Client statuses
  inactive: { label: 'Inactive', className: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
  churned: { label: 'Churned', className: 'bg-red-500/10 text-red-400 border border-red-500/20' },
}

interface BadgeProps {
  status: BadgeStatus
  className?: string
  portal?: boolean
}

export function StatusBadge({ status, className, portal = false }: BadgeProps) {
  const config = statusConfig[status] ?? {
    label: status.replace(/_/g, ' '),
    className: 'bg-[#1C2537] text-[#94A3B8] border border-[#1F2D45]',
  }

  if (portal) {
    const portalConfig: Record<string, string> = {
      new: 'bg-slate-100 text-slate-600 border border-slate-200',
      in_progress: 'bg-blue-50 text-blue-700 border border-blue-200',
      awaiting_appdoers: 'bg-purple-50 text-purple-700 border border-purple-200',
      awaiting_client: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      on_hold: 'bg-orange-50 text-orange-700 border border-orange-200',
      sent: 'bg-blue-50 text-blue-700 border border-blue-200',
      approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      signed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      paid: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      overdue: 'bg-red-50 text-red-700 border border-red-200',
    }
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
          portalConfig[status] ?? 'bg-slate-100 text-slate-600 border border-slate-200',
          className
        )}
      >
        {config.label}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

interface GenericBadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'neutral' | 'blue' | 'purple'
  className?: string
}

export function Badge({ children, variant = 'default', className }: GenericBadgeProps) {
  const variants = {
    default: 'bg-[#1C2537] text-[#94A3B8] border border-[#1F2D45]',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    warning: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/20',
    neutral: 'bg-[#1C2537] text-[#475569] border border-[#1F2D45]',
    blue: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
