import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { ContactsSection } from '@/components/team/clients/contacts-section'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { ClientEditForm } from '@/components/team/clients/client-edit-form'
import { ArrowLeft, FolderOpen, FileText, ScrollText, Receipt } from 'lucide-react'
import { FilesManager } from '@/components/team/files/files-manager'
import { TasksTable } from '@/components/team/tasks/tasks-table'
import { NotesSection } from '@/components/team/notes/notes-section'
import { CredentialsSection } from '@/components/team/clients/credentials-section'
import { DomainsSection } from '@/components/team/clients/domains-section'
import { cn } from '@/lib/utils/cn'

import { PLAN_LABELS } from '@/lib/constants/plans'

const planLabels: Record<string, string> = { ...PLAN_LABELS, none: '—' }

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'projects', label: 'Projects' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'proposals', label: 'Proposals' },
  { key: 'contracts', label: 'Contracts' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'files', label: 'Files' },
  { key: 'notes', label: 'Notes' },
  { key: 'credentials', label: 'Credentials' },
  { key: 'domains', label: 'Domains' },
]

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function ClientDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { tab = 'overview' } = await searchParams
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (!client) notFound()

  const { data: teamMembers } = await supabase
    .from('team_users')
    .select('id, full_name')
    .eq('is_active', true)
    .order('full_name')

  const { data: contacts } = await supabase
    .from('client_contacts')
    .select('*')
    .eq('client_id', id)
    .order('is_primary', { ascending: false })

  const [{ data: catalogPlans }, { data: catalogAddons }, { data: clientServices }] = await Promise.all([
    supabase
      .from('service_catalog')
      .select('id, name, type, plan_key, setup_fee, monthly_fee, min_upfront, contract_months')
      .eq('type', 'plan')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('service_catalog')
      .select('id, name, type, plan_key, setup_fee, monthly_fee, min_upfront, contract_months')
      .eq('type', 'addon')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('client_services')
      .select('service_catalog_id, quantity, monthly_fee, setup_fee')
      .eq('client_id', id),
  ])

  const selectedPlan = catalogPlans?.find((p) => p.id === client.plan_service_id)
  const resolvedPlanServiceId =
    client.plan_service_id ??
    (client.subscription_plan !== 'none'
      ? catalogPlans?.find(
          (p) =>
            p.plan_key === client.subscription_plan &&
            p.contract_months === (client.contract_months ?? 12)
        )?.id ?? null
      : null)
  const planDisplayName =
    selectedPlan?.name ??
    catalogPlans?.find((p) => p.id === resolvedPlanServiceId)?.name ??
    planLabels[client.subscription_plan] ??
    client.subscription_plan

  // Fetch notes only when on notes tab
  const { data: clientNotes } = tab === 'notes'
    ? await supabase
        .from('notes')
        .select('id, content, type, created_at, team_users(full_name)')
        .eq('entity_type', 'client')
        .eq('entity_id', id)
        .order('created_at', { ascending: false })
    : { data: null }

  // Fetch files only when on files tab
  const { data: clientFiles } = tab === 'files'
    ? await supabase
        .from('files')
        .select('id, name, size, mime_type, folder, is_client_visible, created_at, client_id, project_id, projects(name)')
        .eq('client_id', id)
        .order('created_at', { ascending: false })
    : { data: null }

  // Fetch credentials only when on credentials tab
  const { data: clientCredentials } = tab === 'credentials'
    ? await supabase
        .from('client_credentials')
        .select('id, platform, username, password_encrypted, url, notes')
        .eq('client_id', id)
        .order('created_at', { ascending: false })
    : { data: null }

  // Fetch domains only when on domains tab
  const { data: clientDomains } = tab === 'domains'
    ? await supabase
        .from('client_domains')
        .select('id, domain_name, registrar, expiry_date, auto_renew, hosting_provider, vercel_project_name, ssl_status, tech_stack, dns_notes')
        .eq('client_id', id)
        .order('created_at', { ascending: false })
    : { data: null }

  // Fetch projects only when on projects tab
  const { data: clientProjects } = tab === 'projects'
    ? await supabase
        .from('projects')
        .select('id, name, type, current_phase, client_status, status, start_date, target_launch_date, estimated_hours')
        .eq('client_id', id)
        .order('created_at', { ascending: false })
    : { data: null }

  // Fetch tasks only when on tasks tab — get project IDs first, then tasks
  let clientTasks = null
  let clientProjectsForTasks: { id: string; name: string; client_id: string }[] | null = null
  if (tab === 'tasks') {
    const { data: projectIds } = await supabase
      .from('projects')
      .select('id, name, client_id')
      .eq('client_id', id)
    clientProjectsForTasks = projectIds ?? []
    if (projectIds && projectIds.length > 0) {
      const ids = projectIds.map((p) => p.id)
      const { data } = await supabase
        .from('tasks')
        .select('id, title, type, priority, status, project_id, assigned_to, time_spent, due_date, updated_at, team_users!assigned_to(full_name), projects(name)')
        .in('project_id', ids)
        .order('created_at', { ascending: false })
      clientTasks = data
    }
  }

  // Fetch proposals only when on proposals tab
  const { data: clientProposals } = tab === 'proposals'
    ? await supabase
        .from('proposals')
        .select('id, title, version, status, created_at, sent_at, total_setup, total_monthly')
        .eq('client_id', id)
        .order('created_at', { ascending: false })
    : { data: null }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/app/clients"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> All Clients
      </Link>

      <PageHeader
        title={client.company_name}
        subtitle={planDisplayName}
      />

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-0.5 overflow-x-auto">
          {TABS.map(({ key, label }) => (
            <Link
              key={key}
              href={`/app/clients/${id}?tab=${key}`}
              className={cn(
                'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
                tab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: Client Info */}
          <div className="space-y-6 lg:col-span-2">
            {/* Details Card */}
            <div className="hub-card space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <InfoRow label="Industry" value={client.industry ?? '—'} />
                <InfoRow label="Location" value={client.location ?? '—'} />
                <InfoRow
                  label="Website"
                  value={
                    client.website ? (
                      <a
                        href={client.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {client.website}
                      </a>
                    ) : (
                      '—'
                    )
                  }
                />
                <InfoRow label="Status" value={
                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium',
                    client.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                    client.status === 'churned' ? 'bg-red-50 text-red-700' :
                    'bg-slate-100 text-slate-500'
                  )}>
                    {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                  </span>
                } />
                <InfoRow label="Client Since" value={formatDate(client.created_at)} />
                <InfoRow label="Payment Terms" value={`${client.payment_terms} days`} />
              </div>
            </div>

            {/* Contacts */}
            <div className="hub-card">
              <ContactsSection
                clientId={id}
                contacts={contacts ?? []}
              />
            </div>
          </div>

          {/* Right: Financials */}
          <div className="space-y-4">
            <div className="hub-card space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Financials</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Subscription Plan</p>
                  <p className="mt-0.5 font-medium text-slate-900">{planDisplayName}</p>
                  {client.contract_months && (
                    <p className="text-xs text-slate-500">{client.contract_months}-month contract</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500">Monthly Fee (MRR)</p>
                  <p className="mt-0.5 text-xl font-semibold text-emerald-600">
                    {formatCurrency(Number(client.monthly_fee) + (clientServices ?? []).reduce((s, r) => s + Number(r.monthly_fee), 0))}
                  </p>
                  {(clientServices ?? []).length > 0 && (
                    <p className="text-xs text-slate-500">
                      Plan {formatCurrency(client.monthly_fee)} + add-ons{' '}
                      {formatCurrency((clientServices ?? []).reduce((s, r) => s + Number(r.monthly_fee), 0))}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500">Setup Fee (total)</p>
                  <p className="mt-0.5 font-medium text-slate-900">
                    {formatCurrency(Number(client.setup_fee) + (clientServices ?? []).reduce((s, r) => s + Number(r.setup_fee), 0))}
                  </p>
                </div>
                {Number(client.setup_upfront) > 0 && (
                  <div>
                    <p className="text-xs text-slate-500">Due Upfront</p>
                    <p className="mt-0.5 font-medium text-slate-900">
                      {formatCurrency(client.setup_upfront)}
                    </p>
                  </div>
                )}
                {(clientServices ?? []).length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Add-ons</p>
                    <ul className="space-y-1 text-sm text-slate-600">
                      {(clientServices ?? []).map((cs) => {
                        const svc = catalogAddons?.find((a) => a.id === cs.service_catalog_id)
                        return (
                          <li key={cs.service_catalog_id}>
                            {svc?.name ?? 'Add-on'}
                            {cs.quantity > 1 && ` × ${cs.quantity}`}
                            {' — '}
                            {formatCurrency(cs.monthly_fee)}/mo
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
                {client.subscription_start_date && (
                  <div>
                    <p className="text-xs text-slate-500">Subscription Start</p>
                    <p className="mt-0.5 text-slate-600">
                      {formatDate(client.subscription_start_date)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Edit Form */}
            <ClientEditForm
              client={{
                ...client,
                contract_months: client.contract_months ?? null,
                plan_service_id: resolvedPlanServiceId,
                setup_upfront: Number(client.setup_upfront ?? 0),
                monthly_fee: Number(client.monthly_fee),
                setup_fee: Number(client.setup_fee),
              }}
              catalogPlans={(catalogPlans ?? []).map((p) => ({
                id: p.id,
                name: p.name,
                type: 'plan' as const,
                plan_key: p.plan_key,
                setup_fee: Number(p.setup_fee),
                monthly_fee: Number(p.monthly_fee),
                min_upfront: p.min_upfront != null ? Number(p.min_upfront) : null,
                contract_months: p.contract_months,
              }))}
              catalogAddons={(catalogAddons ?? []).map((p) => ({
                id: p.id,
                name: p.name,
                type: 'addon' as const,
                plan_key: p.plan_key,
                setup_fee: Number(p.setup_fee),
                monthly_fee: Number(p.monthly_fee),
                min_upfront: p.min_upfront != null ? Number(p.min_upfront) : null,
                contract_months: p.contract_months,
              }))}
              clientServices={(clientServices ?? []).map((cs) => ({
                service_catalog_id: cs.service_catalog_id,
                quantity: cs.quantity,
                monthly_fee: Number(cs.monthly_fee),
                setup_fee: Number(cs.setup_fee),
              }))}
            />
          </div>
        </div>
      )}

      {tab === 'projects' && (
        clientProjects && clientProjects.length > 0 ? (
          <div className="hub-card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    {['Project', 'Type', 'Phase', 'Client Status', 'Launch Date', 'Hours', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {clientProjects.map((p) => {
                    const phaseLabels: Record<string, string> = { discovery: 'Discovery', design: 'Design', development: 'Development', review_qa: 'Review & QA', launch: 'Launch', maintenance: 'Maintenance' }
                    const clientStatusCls: Record<string, string> = { new: 'bg-slate-100 text-slate-500', in_progress: 'bg-blue-50 text-blue-700', awaiting_appdoers: 'bg-amber-50 text-amber-700', awaiting_client: 'bg-orange-50 text-orange-700', completed: 'bg-emerald-50 text-emerald-700', on_hold: 'bg-red-50 text-red-700' }
                    const statusCls: Record<string, string> = { active: 'bg-emerald-50 text-emerald-700', on_hold: 'bg-amber-50 text-amber-700', completed: 'bg-slate-100 text-slate-500', cancelled: 'bg-red-50 text-red-700' }
                    const hours = p.estimated_hours ? `${p.estimated_hours}h est.` : '—'
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <Link href={`/app/projects/${p.id}`} className="hover:text-blue-600 transition-colors">{p.name}</Link>
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-600">{p.type}</td>
                        <td className="px-4 py-3 text-slate-600">{phaseLabels[p.current_phase] ?? p.current_phase}</td>
                        <td className="px-4 py-3">
                          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', clientStatusCls[p.client_status] ?? 'bg-slate-100 text-slate-500')}>{p.client_status?.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{p.target_launch_date ? formatDate(p.target_launch_date) : '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{hours}</td>
                        <td className="px-4 py-3">
                          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', statusCls[p.status] ?? 'bg-slate-100 text-slate-500')}>{p.status?.replace(/_/g, ' ')}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState icon={FolderOpen} title="No projects yet" description="Projects will appear here once created." />
        )
      )}
      {tab === 'tasks' && (
        <TasksTable
          tasks={(clientTasks ?? []).map((t) => ({
            id: t.id,
            title: t.title,
            type: t.type,
            priority: t.priority,
            status: t.status,
            project_id: t.project_id,
            project_name: (t.projects as { name?: string } | null)?.name ?? '—',
            client_id: id,
            client_name: client.company_name,
            assigned_to: t.assigned_to as string | null,
            assigned_to_name: (t.team_users as { full_name?: string } | null)?.full_name ?? null,
            due_date: t.due_date,
            time_spent: Number(t.time_spent ?? 0),
            updated_at: t.updated_at,
          }))}
          projects={(clientProjectsForTasks ?? []).map((p) => ({ id: p.id, name: p.name }))}
          filterProjects={clientProjectsForTasks ?? []}
          teamMembers={teamMembers ?? []}
          defaultClientId={id}
          showProjectCol={true}
        />
      )}
      {tab === 'proposals' && (
        clientProposals && clientProposals.length > 0 ? (
          <div className="hub-card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    {['Title', 'Version', 'Status', 'Setup', 'Monthly', 'Created', 'Sent'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {clientProposals.map((p) => {
                    const statusCls: Record<string, { label: string; cls: string }> = { draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-500' }, sent: { label: 'Sent', cls: 'bg-blue-50 text-blue-700' }, approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700' }, declined: { label: 'Declined', cls: 'bg-red-50 text-red-700' }, expired: { label: 'Expired', cls: 'bg-amber-50 text-amber-700' } }
                    const st = statusCls[p.status] ?? statusCls.draft
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <Link href={`/app/proposals/${p.id}`} className="hover:text-blue-600 transition-colors">{p.title}</Link>
                        </td>
                        <td className="px-4 py-3 text-slate-600">v{p.version}</td>
                        <td className="px-4 py-3">
                          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', st.cls)}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{p.total_setup ? formatCurrency(Number(p.total_setup)) : '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{p.total_monthly ? `${formatCurrency(Number(p.total_monthly))}/mo` : '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(p.created_at)}</td>
                        <td className="px-4 py-3 text-slate-500">{p.sent_at ? formatDate(p.sent_at) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState icon={FileText} title="No proposals yet" description="Proposals will appear here once created." />
        )
      )}
      {tab === 'contracts' && (
        <EmptyState
          icon={ScrollText}
          title="No contracts yet"
          description="Contracts will appear here once signed."
        />
      )}
      {tab === 'invoices' && (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description="Invoices will appear here once generated."
        />
      )}
      {tab === 'files' && (
        <FilesManager
          files={(clientFiles ?? []).map((f) => ({
            id: f.id,
            name: f.name as string,
            size: f.size as number | null,
            mime_type: f.mime_type as string | null,
            folder: f.folder as string | null,
            is_client_visible: f.is_client_visible as boolean,
            created_at: f.created_at as string,
            client_id: f.client_id as string,
            project_id: f.project_id as string | null,
            client_name: client.company_name,
            project_name: (f.projects as { name?: string } | null)?.name ?? null,
          }))}
          clients={[{ id: client.id, company_name: client.company_name }]}
          clientId={id}
        />
      )}
      {tab === 'notes' && (
        <NotesSection
          notes={(clientNotes ?? []).map((n) => ({
            id: n.id,
            content: n.content as string,
            type: n.type as string | null,
            created_at: n.created_at as string,
            team_users: (n.team_users as { full_name?: string } | null)
              ? { full_name: (n.team_users as { full_name?: string }).full_name ?? '' }
              : null,
          }))}
          entityType="client"
          entityId={id}
        />
      )}
      {tab === 'credentials' && (
        <CredentialsSection
          credentials={(clientCredentials ?? []).map((c) => ({
            id: c.id as string,
            platform: c.platform as string,
            username: c.username as string | null,
            password_encrypted: c.password_encrypted as string | null,
            url: c.url as string | null,
            notes: c.notes as string | null,
          }))}
          clientId={id}
        />
      )}
      {tab === 'domains' && (
        <DomainsSection
          domains={(clientDomains ?? []).map((d) => ({
            id: d.id as string,
            domain_name: d.domain_name as string,
            registrar: d.registrar as string | null,
            expiry_date: d.expiry_date as string | null,
            auto_renew: (d.auto_renew as boolean) ?? false,
            hosting_provider: d.hosting_provider as string | null,
            vercel_project_name: d.vercel_project_name as string | null,
            ssl_status: d.ssl_status as string | null,
            tech_stack: (d.tech_stack as string[]) ?? [],
            dns_notes: d.dns_notes as string | null,
          }))}
          clientId={id}
        />
      )}
    </div>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-slate-600">{value}</p>
    </div>
  )
}
