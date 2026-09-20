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
  new: { label: 'New', className: 'bg-slate-100 text-slate-600 border border-slate-200' },
  contacted: { label: 'Contacted', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  qualified: { label: 'Qualified', className: 'bg-purple-50 text-purple-700 border border-purple-200' },
  proposal_sent: { label: 'Proposal Sent', className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  negotiating: { label: 'Negotiating', className: 'bg-orange-50 text-orange-700 border border-orange-200' },
  won: { label: 'Won', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  lost: { label: 'Lost', className: 'bg-red-50 text-red-700 border border-red-200' },

  // Project internal statuses
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  on_hold: { label: 'On Hold', className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  completed: { label: 'Completed', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-700 border border-red-200' },

  // Client-facing statuses
  in_progress: { label: 'In Progress', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  awaiting_appdoers: { label: 'Awaiting Appdoers', className: 'bg-purple-50 text-purple-700 border border-purple-200' },
  awaiting_client: { label: 'Awaiting Client', className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },

  // Task statuses
  open: { label: 'Open', className: 'bg-slate-100 text-slate-600 border border-slate-200' },
  in_progress_task: { label: 'In Progress', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  awaiting_review: { label: 'Awaiting Review', className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  closed: { label: 'Closed', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },

  // Task priorities
  p0: { label: 'P0 Critical', className: 'bg-red-50 text-red-700 border border-red-200' },
  p1: { label: 'P1 High', className: 'bg-orange-50 text-orange-700 border border-orange-200' },
  p2: { label: 'P2 Medium', className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  p3: { label: 'P3 Low', className: 'bg-slate-100 text-slate-600 border border-slate-200' },

  // Proposal statuses
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600 border border-slate-200' },
  sent: { label: 'Sent', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  declined: { label: 'Declined', className: 'bg-red-50 text-red-700 border border-red-200' },
  expired: { label: 'Expired', className: 'bg-slate-100 text-slate-500 border border-slate-200' },

  // Contract statuses
  signed: { label: 'Signed', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  superseded: { label: 'Superseded', className: 'bg-slate-100 text-slate-500 border border-slate-200' },

  // Invoice statuses
  paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  overdue: { label: 'Overdue', className: 'bg-red-50 text-red-700 border border-red-200' },
  void: { label: 'Void', className: 'bg-slate-100 text-slate-500 border border-slate-200' },

  // Client statuses
  inactive: { label: 'Inactive', className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  churned: { label: 'Churned', className: 'bg-red-50 text-red-700 border border-red-200' },
}

interface BadgeProps {
  status: BadgeStatus
  className?: string
  portal?: boolean
}

export function StatusBadge({ status, className, portal = false }: BadgeProps) {
  const config = statusConfig[status] ?? {
    label: status.replace(/_/g, ' '),
    className: 'bg-slate-100 text-slate-600 border border-slate-200',
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
    default: 'bg-slate-100 text-slate-600 border border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    danger: 'bg-red-50 text-red-700 border border-red-200',
    neutral: 'bg-slate-100 text-slate-500 border border-slate-200',
    blue: 'bg-blue-50 text-blue-700 border border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200',
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
