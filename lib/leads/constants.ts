import type { CompanySize, LeadSource, LeadStatus } from '@/lib/types/database'

export type { CompanySize }
export type ServiceInterest = 'website' | 'email' | 'support' | 'custom'

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  in_conversation: 'In Conversation',
  proposal_sent: 'Proposal Sent',
  contract_sent: 'Contract Sent',
  won: 'Won',
  lost: 'Lost',
}

export const PIPELINE_LEAD_STATUSES: LeadStatus[] = [
  'new',
  'contacted',
  'in_conversation',
  'proposal_sent',
  'contract_sent',
]

export const ALL_LEAD_STATUSES: LeadStatus[] = [...PIPELINE_LEAD_STATUSES, 'won', 'lost']

export const LEAD_STATUS_FLOW: Record<LeadStatus, { next: LeadStatus; label: string } | null> = {
  new: { next: 'contacted', label: 'Mark Contacted' },
  contacted: { next: 'in_conversation', label: 'Move to In Conversation' },
  in_conversation: { next: 'proposal_sent', label: 'Proposal Sent' },
  proposal_sent: { next: 'contract_sent', label: 'Contract Sent' },
  contract_sent: null,
  won: null,
  lost: null,
}

export const LEAD_STATUS_STYLES: Record<LeadStatus, string> = {
  new: 'bg-slate-100 text-slate-500',
  contacted: 'bg-blue-50 text-blue-700',
  in_conversation: 'bg-amber-50 text-amber-700',
  proposal_sent: 'bg-purple-50 text-purple-700',
  contract_sent: 'bg-orange-50 text-orange-700',
  won: 'bg-emerald-50 text-emerald-700',
  lost: 'bg-red-50 text-red-700',
}

export const LEAD_SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: 'word_of_mouth', label: 'Word of Mouth' },
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'social', label: 'Social Media' },
  { value: 'cold_outreach', label: 'Cold Outreach' },
  { value: 'other', label: 'Other' },
]

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = Object.fromEntries(
  LEAD_SOURCE_OPTIONS.map((s) => [s.value, s.label])
) as Record<LeadSource, string>

export const COMPANY_SIZE_OPTIONS: { value: CompanySize; label: string }[] = [
  { value: 'solo', label: 'Solo' },
  { value: '2-10', label: '2–10' },
  { value: '11-50', label: '11–50' },
  { value: '51+', label: '51+' },
]

export const COMPANY_SIZE_LABELS: Record<CompanySize, string> = Object.fromEntries(
  COMPANY_SIZE_OPTIONS.map((s) => [s.value, s.label])
) as Record<CompanySize, string>

export const SERVICE_INTEREST_OPTIONS: { value: ServiceInterest; label: string }[] = [
  { value: 'website', label: 'Website' },
  { value: 'email', label: 'Email' },
  { value: 'support', label: 'Ongoing support' },
  { value: 'custom', label: 'Custom' },
]

export const SERVICE_INTEREST_LABELS: Record<ServiceInterest, string> = Object.fromEntries(
  SERVICE_INTEREST_OPTIONS.map((s) => [s.value, s.label])
) as Record<ServiceInterest, string>
