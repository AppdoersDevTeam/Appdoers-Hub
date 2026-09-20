import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { LeadActions } from '@/components/team/leads/lead-actions'
import { LeadDeleteButton } from '@/components/team/leads/lead-delete-button'
import { LeadNotes } from '@/components/team/leads/lead-notes'
import { LeadEditForm } from '@/components/team/leads/lead-edit-form'
import { DocumentTracker } from '@/components/team/documents/document-tracker'
import { leadDisplayName, type TrackedDocument } from '@/lib/documents'
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils/format'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import {
  COMPANY_SIZE_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_STYLES,
  SERVICE_INTEREST_LABELS,
  type CompanySize,
  type ServiceInterest,
} from '@/lib/leads/constants'
import type { Lead, LeadSource, LeadStatus } from '@/lib/types/database'

const noteTypeConfig: Record<string, { label: string; cls: string }> = {
  general: { label: 'Note', cls: 'bg-slate-100 text-slate-500' },
  call: { label: 'Call', cls: 'bg-blue-50 text-blue-700' },
  meeting: { label: 'Meeting', cls: 'bg-amber-50 text-amber-700' },
  email: { label: 'Email', cls: 'bg-purple-50 text-purple-700' },
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: lead } = await supabase
    .from('leads')
    .select('*, team_users(full_name)')
    .eq('id', id)
    .single()

  if (!lead) notFound()

  const { data: notes } = await supabase
    .from('lead_notes')
    .select('*, team_users(full_name)')
    .eq('lead_id', id)
    .order('created_at', { ascending: false })

  const { data: leadProposals } = await supabase
    .from('proposals')
    .select('id, title, status, created_at, sent_at, file_name, mime_type, file_size, storage_path, is_client_visible, client_id, lead_id')
    .eq('lead_id', id)
    .order('created_at', { ascending: false })

  const { data: teamMembers } = await supabase
    .from('team_users')
    .select('id, full_name')
    .eq('is_active', true)

  const status = lead.status as LeadStatus
  const statusLabel = LEAD_STATUS_LABELS[status] ?? status
  const statusCls = LEAD_STATUS_STYLES[status] ?? LEAD_STATUS_STYLES.new
  const assignedName =
    (lead.team_users as { full_name?: string } | null)?.full_name ?? null
  const interests = (lead.service_interest ?? []) as string[]
  const leadRecord = lead as Lead

  return (
    <div className="space-y-6">
      <Link
        href="/app/leads"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> All Leads
      </Link>

      <PageHeader
        title={lead.contact_name}
        subtitle={lead.company_name ?? 'Individual'}
        action={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <span
              className={cn(
                'rounded-full px-3 py-1 text-sm font-medium',
                statusCls
              )}
            >
              {statusLabel}
            </span>
            <LeadDeleteButton
              leadId={id}
              leadName={lead.company_name || lead.contact_name}
              fullWidth={false}
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="hub-card">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">
              Lead Details
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <InfoRow label="Email" value={lead.email ?? '—'} />
              <InfoRow label="Phone" value={lead.phone ?? '—'} />
              <InfoRow label="Job Title" value={lead.contact_role ?? '—'} />
              <InfoRow
                label="Source"
                value={LEAD_SOURCE_LABELS[lead.source as LeadSource] ?? lead.source}
              />
              {lead.referral_name && (
                <InfoRow label="Referred By" value={lead.referral_name} />
              )}
              <InfoRow
                label="Website"
                value={
                  lead.website ? (
                    <a
                      href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {lead.website}
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
              <InfoRow label="Location" value={lead.location ?? '—'} />
              <InfoRow label="Industry" value={lead.industry ?? '—'} />
              <InfoRow
                label="Company Size"
                value={
                  lead.company_size
                    ? COMPANY_SIZE_LABELS[lead.company_size as CompanySize] ?? lead.company_size
                    : '—'
                }
              />
              <InfoRow
                label="Service Interest"
                value={
                  interests.length > 0
                    ? interests
                        .map((item) => SERVICE_INTEREST_LABELS[item as ServiceInterest] ?? item)
                        .join(', ')
                    : '—'
                }
              />
              <InfoRow
                label="Assigned To"
                value={assignedName ?? 'Unassigned'}
              />
              <InfoRow
                label="Next Action"
                value={lead.next_action ?? '—'}
              />
              {lead.next_action_date && (
                <InfoRow
                  label="Next Action Date"
                  value={formatDate(lead.next_action_date)}
                />
              )}
              <InfoRow
                label="Needed By"
                value={lead.needed_by ? formatDate(lead.needed_by) : '—'}
              />
              <InfoRow
                label="Created"
                value={formatRelativeTime(lead.created_at)}
              />
              {lead.timeline_notes && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-500">Timeline Notes</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-slate-600">{lead.timeline_notes}</p>
                </div>
              )}
              {lead.budget_notes && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-500">Budget Notes</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-slate-600">{lead.budget_notes}</p>
                </div>
              )}
              {lead.status === 'lost' && lead.lost_reason && (
                <>
                  <InfoRow
                    label="Lost Reason"
                    value={lead.lost_reason.replace('_', ' ')}
                  />
                  {lead.lost_notes && (
                    <div className="col-span-2">
                      <p className="text-xs text-slate-500">Lost Notes</p>
                      <p className="mt-0.5 text-slate-600">{lead.lost_notes}</p>
                    </div>
                  )}
                </>
              )}
              {lead.converted_client_id && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-500">Converted Client</p>
                  <Link
                    href={`/app/clients/${lead.converted_client_id}`}
                    className="mt-0.5 text-blue-600 hover:underline"
                  >
                    View Client Record →
                  </Link>
                </div>
              )}
            </div>
          </div>

          <LeadEditForm lead={leadRecord} teamMembers={teamMembers ?? []} />

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Proposals</h3>
            <DocumentTracker
              kind="proposal"
              leadId={id}
              clients={[]}
              leads={[{ id: lead.id, contact_name: lead.contact_name, company_name: lead.company_name }]}
              documents={(leadProposals ?? []).map((p): TrackedDocument => ({
                id: p.id,
                title: p.title,
                status: p.status,
                created_at: p.created_at,
                sent_at: p.sent_at,
                file_name: p.file_name,
                mime_type: p.mime_type,
                file_size: p.file_size,
                storage_path: p.storage_path,
                is_client_visible: p.is_client_visible ?? false,
                client_id: p.client_id,
                lead_id: p.lead_id,
                owner_kind: 'lead',
                owner_name: leadDisplayName({
                  contact_name: lead.contact_name,
                  company_name: lead.company_name,
                }),
              }))}
            />
          </div>

          <div className="hub-card">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">
              Notes
            </h3>
            <LeadNotes leadId={id} />
            {(notes ?? []).length > 0 && (
              <div className="mt-4 divide-y divide-slate-200">
                {(notes ?? []).map((note: Record<string, unknown>) => {
                  const nt =
                    noteTypeConfig[note.type as string] ??
                    noteTypeConfig.general
                  return (
                    <div key={note.id as string} className="py-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            nt.cls
                          )}
                        >
                          {nt.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          {(note.team_users as { full_name?: string } | null)
                            ?.full_name ?? 'Team'}{' '}
                          · {formatRelativeTime(note.created_at as string)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">
                        {note.content as string}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
            {(notes ?? []).length === 0 && (
              <p className="mt-4 text-sm text-slate-500">
                No notes yet. Add a call log, meeting note, or general update.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="hub-card space-y-3 text-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              Financials
            </h3>
            <div>
              <p className="text-xs text-slate-500">Est. Setup Fee</p>
              <p className="mt-0.5 font-medium text-slate-900">
                {lead.estimated_setup_fee
                  ? formatCurrency(lead.estimated_setup_fee)
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Est. Monthly</p>
              <p className="mt-0.5 font-medium text-slate-900">
                {lead.estimated_monthly
                  ? formatCurrency(lead.estimated_monthly)
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Est. Total Value</p>
              <p className="mt-0.5 text-xl font-semibold text-blue-600">
                {lead.estimated_value
                  ? formatCurrency(lead.estimated_value)
                  : '—'}
              </p>
              {lead.estimated_monthly && (
                <p className="text-xs text-slate-500">
                  setup + monthly × 12
                </p>
              )}
            </div>
          </div>

          <LeadActions
            leadId={id}
            leadName={lead.company_name || lead.contact_name}
            currentStatus={status}
            hasConvertedClient={!!lead.converted_client_id}
            convertedClientId={lead.converted_client_id}
            teamMembers={teamMembers ?? []}
          />
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-slate-600">{value}</p>
    </div>
  )
}
