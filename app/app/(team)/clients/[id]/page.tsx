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
import { NotesSection } from '@/components/team/notes/notes-section'
import { CredentialsSection } from '@/components/team/clients/credentials-section'
import { DomainsSection } from '@/components/team/clients/domains-section'
import { cn } from '@/lib/utils/cn'

const planLabels: Record<string, string> = {
  launch: 'Launch',
  growth: 'Growth',
  growth_annual: 'Growth Annual',
  scale: 'Scale',
  founders_special: 'Founders Special',
  community: 'Community',
  none: '—',
}

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'projects', label: 'Projects' },
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

  const { data: contacts } = await supabase
    .from('client_contacts')
    .select('*')
    .eq('client_id', id)
    .order('is_primary', { ascending: false })

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

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/app/clients"
        className="inline-flex items-center gap-1.5 text-sm text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> All Clients
      </Link>

      <PageHeader
        title={client.company_name}
        subtitle={planLabels[client.subscription_plan] ?? client.subscription_plan}
      />

      {/* Tabs */}
      <div className="border-b border-[#1F2D45]">
        <nav className="flex gap-0.5 overflow-x-auto">
          {TABS.map(({ key, label }) => (
            <Link
              key={key}
              href={`/app/clients/${id}?tab=${key}`}
              className={cn(
                'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
                tab === key
                  ? 'border-[#3B82F6] text-[#3B82F6]'
                  : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
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
              <h3 className="text-sm font-semibold text-[#F1F5F9]">Details</h3>
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
                        className="text-[#3B82F6] hover:underline"
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
                    client.status === 'active' ? 'bg-[#10B981]/10 text-[#10B981]' :
                    client.status === 'churned' ? 'bg-[#EF4444]/10 text-[#EF4444]' :
                    'bg-[#94A3B8]/10 text-[#94A3B8]'
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
              <h3 className="text-sm font-semibold text-[#F1F5F9]">Financials</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-[#475569]">Subscription Plan</p>
                  <p className="mt-0.5 font-medium text-[#F1F5F9]">
                    {planLabels[client.subscription_plan]}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#475569]">Monthly Fee (MRR)</p>
                  <p className="mt-0.5 text-xl font-semibold text-[#10B981]">
                    {formatCurrency(client.monthly_fee)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#475569]">Setup Fee</p>
                  <p className="mt-0.5 font-medium text-[#F1F5F9]">
                    {formatCurrency(client.setup_fee)}
                  </p>
                </div>
                {client.subscription_start_date && (
                  <div>
                    <p className="text-xs text-[#475569]">Subscription Start</p>
                    <p className="mt-0.5 text-[#CBD5E1]">
                      {formatDate(client.subscription_start_date)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Edit Form */}
            <ClientEditForm client={client} />
          </div>
        </div>
      )}

      {tab === 'projects' && (
        <EmptyState
          icon={FolderOpen}
          title="No projects yet"
          description="Projects will appear here once created."
        />
      )}
      {tab === 'proposals' && (
        <EmptyState
          icon={FileText}
          title="No proposals yet"
          description="Proposals will appear here once created."
        />
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
      <p className="text-xs text-[#475569]">{label}</p>
      <p className="mt-0.5 text-[#CBD5E1]">{value}</p>
    </div>
  )
}
