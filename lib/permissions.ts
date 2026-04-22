export type PermissionLevel = 'edit' | 'view' | 'none'

export type Feature =
  | 'clients'
  | 'leads'
  | 'projects'
  | 'tasks'
  | 'proposals'
  | 'contracts'
  | 'invoices'
  | 'files'
  | 'recaps'
  | 'subscriptions'
  | 'settings'

export const ALL_FEATURES: Feature[] = [
  'clients', 'leads', 'projects', 'tasks', 'proposals',
  'contracts', 'invoices', 'files', 'recaps', 'subscriptions', 'settings',
]

export const FEATURE_LABELS: Record<Feature, string> = {
  clients: 'Clients',
  leads: 'Leads',
  projects: 'Projects',
  tasks: 'Tasks',
  proposals: 'Proposals',
  contracts: 'Contracts',
  invoices: 'Invoices',
  files: 'Files',
  recaps: 'Recaps',
  subscriptions: 'Subscriptions',
  settings: 'Settings',
}

/** Route that each feature maps to — used to hide sidebar links */
export const FEATURE_HREF: Record<Feature, string> = {
  clients: '/app/clients',
  leads: '/app/leads',
  projects: '/app/projects',
  tasks: '/app/tasks',
  proposals: '/app/proposals',
  contracts: '/app/contracts',
  invoices: '/app/invoices',
  files: '/app/files',
  recaps: '/app/recaps',
  subscriptions: '/app/subscriptions',
  settings: '/app/settings',
}

/** Default permissions per role */
const ROLE_DEFAULTS: Record<string, Record<Feature, PermissionLevel>> = {
  director: {
    clients: 'edit', leads: 'edit', projects: 'edit', tasks: 'edit',
    proposals: 'edit', contracts: 'edit', invoices: 'edit', files: 'edit',
    recaps: 'edit', subscriptions: 'edit', settings: 'edit',
  },
  member: {
    clients: 'edit', leads: 'edit', projects: 'edit', tasks: 'edit',
    proposals: 'view', contracts: 'view', invoices: 'view', files: 'edit',
    recaps: 'edit', subscriptions: 'none', settings: 'none',
  },
}

/**
 * Merge role defaults with any custom overrides stored on the user's record.
 * Directors always receive full edit access regardless of overrides.
 */
export function getEffectivePermissions(
  role: string,
  customPermissions: Record<string, string> = {}
): Record<Feature, PermissionLevel> {
  if (role === 'director') return ROLE_DEFAULTS.director

  const defaults = ROLE_DEFAULTS[role] ?? ROLE_DEFAULTS.member
  return {
    ...defaults,
    ...(customPermissions as Partial<Record<Feature, PermissionLevel>>),
  } as Record<Feature, PermissionLevel>
}

/** Returns hrefs that should be hidden from the sidebar for this user */
export function getHiddenHrefs(permissions: Record<Feature, PermissionLevel>): string[] {
  return ALL_FEATURES
    .filter(f => permissions[f] === 'none')
    .map(f => FEATURE_HREF[f])
}

/** True if the user can perform the required action on a feature */
export function can(
  permissions: Record<Feature, PermissionLevel>,
  feature: Feature,
  required: PermissionLevel = 'view'
): boolean {
  const level = permissions[feature]
  if (required === 'none') return true
  if (required === 'view') return level === 'view' || level === 'edit'
  return level === 'edit'
}
