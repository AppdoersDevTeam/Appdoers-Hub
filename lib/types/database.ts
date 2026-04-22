export type TeamRole = 'director' | 'account_manager' | 'developer' | 'designer'

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal_sent'
  | 'negotiating'
  | 'won'
  | 'lost'

export type LeadSource =
  | 'word_of_mouth'
  | 'referral'
  | 'website'
  | 'social'
  | 'cold_outreach'
  | 'other'

export type LostReason =
  | 'price'
  | 'timing'
  | 'competitor'
  | 'no_response'
  | 'out_of_scope'
  | 'other'

export type ProjectPhase =
  | 'discovery'
  | 'design'
  | 'development'
  | 'review_qa'
  | 'launch'
  | 'maintenance'

export type ClientFacingStatus =
  | 'new'
  | 'in_progress'
  | 'awaiting_appdoers'
  | 'awaiting_client'
  | 'completed'
  | 'on_hold'

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled'

export type TaskType = 'feature' | 'bug' | 'revision' | 'content' | 'design' | 'admin'

export type TaskStatus = 'open' | 'in_progress' | 'awaiting_review' | 'closed'

export type TaskPriority = 'p0' | 'p1' | 'p2' | 'p3'

export type ProposalStatus = 'draft' | 'sent' | 'approved' | 'declined' | 'expired'

export type ContractStatus = 'draft' | 'sent' | 'signed' | 'superseded'

export type InvoiceType = 'setup' | 'monthly' | 'adhoc'

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void'

export type SubscriptionPlan =
  | 'launch'
  | 'growth'
  | 'growth_annual'
  | 'scale'
  | 'founders_special'
  | 'community'
  | 'none'

export type FileFolder =
  | 'briefs'
  | 'proposals'
  | 'contracts'
  | 'assets'
  | 'deliverables'
  | 'invoices'
  | 'misc'

export type NoteType = 'general' | 'call' | 'meeting' | 'email' | 'decision' | 'internal'

export interface TeamUser {
  id: string
  email: string
  full_name: string
  role: TeamRole
  hourly_rate: number | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  company_name: string
  logo_url: string | null
  industry: string | null
  website: string | null
  location: string | null
  subscription_plan: SubscriptionPlan
  subscription_start_date: string | null
  subscription_end_date: string | null
  monthly_fee: number
  setup_fee: number
  payment_terms: number
  status: 'active' | 'inactive' | 'churned'
  created_at: string
  updated_at: string
}

export interface ClientContact {
  id: string
  client_id: string
  full_name: string
  email: string
  phone: string | null
  role: string | null
  is_primary: boolean
  has_portal_access: boolean
  portal_user_id: string | null
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  contact_name: string
  company_name: string | null
  email: string | null
  phone: string | null
  source: LeadSource
  referral_name: string | null
  status: LeadStatus
  estimated_value: number | null
  estimated_setup_fee: number | null
  estimated_monthly: number | null
  assigned_to: string | null
  next_action: string | null
  next_action_date: string | null
  lost_reason: LostReason | null
  lost_notes: string | null
  converted_client_id: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  client_id: string
  name: string
  type: 'web' | 'ecommerce' | 'community' | 'custom'
  current_phase: ProjectPhase
  client_status: ClientFacingStatus
  status: ProjectStatus
  start_date: string | null
  target_launch_date: string | null
  actual_launch_date: string | null
  estimated_hours: number | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  project_id: string
  title: string
  description: string | null
  type: TaskType
  priority: TaskPriority
  status: TaskStatus
  assigned_to: string | null
  due_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  invoice_number: string
  client_id: string
  project_id: string | null
  type: InvoiceType
  status: InvoiceStatus
  issue_date: string
  due_date: string
  subtotal: number
  gst_amount: number
  total: number
  payment_reference: string | null
  paid_at: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Note {
  id: string
  entity_type: 'client' | 'lead' | 'project' | 'invoice' | 'proposal'
  entity_id: string
  author_id: string
  type: NoteType
  content: string
  created_at: string
  updated_at: string
}

export interface ActivityLogEntry {
  id: string
  entity_type: string
  entity_id: string
  client_id: string | null
  action: string
  description: string
  performed_by: string | null
  created_at: string
}
