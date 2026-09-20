// Client-safe constants — no server imports here
export type SlackChannel =
  | 'general'
  | 'billing'
  | 'tasks'
  | 'projects'
  | 'clients'
  | 'leads'
  | 'proposals'

export const ALL_SLACK_CHANNELS: SlackChannel[] = [
  'general',
  'billing',
  'tasks',
  'projects',
  'clients',
  'leads',
  'proposals',
]

export const SLACK_CHANNEL_LABELS: Record<SlackChannel, string> = {
  general: 'General',
  billing: 'Billing & Invoices',
  tasks: 'Tasks',
  projects: 'Projects',
  clients: 'Clients',
  leads: 'Leads',
  proposals: 'Proposals',
}

export const SLACK_CHANNEL_DESCRIPTIONS: Record<SlackChannel, string> = {
  general: 'Default fallback — used when no specific channel is configured',
  billing: 'Invoice paid, subscription renewals, billing alerts',
  tasks: 'New tasks created, task status changes',
  projects: 'Phase advances, client status updates',
  clients: 'New clients added, status changes',
  leads: 'New leads, lead status changes',
  proposals: 'Proposals sent to clients',
}
