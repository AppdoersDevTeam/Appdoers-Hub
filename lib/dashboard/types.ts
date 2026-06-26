import type { DashboardPeriod } from './periods'
import type { LeadStatus, WorkflowStage } from '@/lib/types/database'

export interface CountByLabel {
  label: string
  value: number
  key?: string
}

export interface HoursByDate {
  date: string
  label: string
  hours: number
  billableHours: number
}

export interface OverdueTaskItem {
  id: string
  title: string
  dueDate: string
  projectName: string
  assigneeName: string | null
}

export interface FollowUpItem {
  id: string
  companyName: string
  contactName: string
  nextAction: string | null
  nextActionDate: string
}

export interface ProjectHealthItem {
  id: string
  name: string
  clientName: string
  estimatedHours: number
  loggedHours: number
  overByHours: number
}

export interface OverdueInvoiceItem {
  id: string
  invoiceNumber: string
  clientName: string
  dueDate: string
  total: number
}

export interface RenewalItem {
  id: string
  name: string
  planName: string | null
  billingCycle: string
  cost: number
  renewalDate: string
}

export interface ActivityItem {
  id: string
  description: string
  performerName: string
  createdAt: string
}

export interface DashboardAnalytics {
  period: DashboardPeriod
  periodLabel: string

  // Snapshot KPIs
  pipelineValue: number
  mrrTotal: number
  activeProjects: number
  onHoldProjects: number
  openTasks: number
  overdueTasks: number
  billableWipValue: number

  // Period KPIs
  hoursLogged: number
  billableHoursLogged: number
  tasksClosed: number
  leadsWon: number
  leadsLost: number
  paidThisPeriod: number

  // Chart data
  hoursByDate: HoursByDate[]
  leadsByStatus: CountByLabel[]
  tasksByWorkflowStage: CountByLabel[]
  hoursByMember: CountByLabel[]

  // Action panels
  overdueTaskItems: OverdueTaskItem[]
  followUpItems: FollowUpItem[]
  projectHealthItems: ProjectHealthItem[]
  overdueInvoices: OverdueInvoiceItem[]
  overdueInvoiceCount: number
  overdueInvoiceValue: number

  // Footer
  renewingSoon: RenewalItem[]
  activityFeed: ActivityItem[]
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal_sent: 'Proposal Sent',
  negotiating: 'Negotiating',
  won: 'Won',
  lost: 'Lost',
}

export const PIPELINE_LEAD_STATUSES: LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'proposal_sent',
  'negotiating',
]

export const WORKFLOW_STAGE_ORDER: WorkflowStage[] = [
  'pm',
  'designer',
  'developer',
  'qa',
  'reviewer',
  'done',
]
