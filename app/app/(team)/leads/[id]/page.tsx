import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { LeadActions } from '@/components/team/leads/lead-actions'
import { LeadNotes } from '@/components/team/leads/lead-notes'
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils/format'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const statusConfig: Record<string, { label: string; cls: string }> = {
  new: { label: 'New', cls: 'bg-slate-100 text-slate-500' },
  contacted: { label: 'Contacted', cls: 'bg-blue-50 text-blue-700' },
  qualified: { label: 'Qualified', cls: 'bg-amber-50 text-amber-700' },
  proposal_sent: { label: 'Proposal Sent', cls: 'bg-purple-50 text-purple-700' },
  negotiating: { label: 'Negotiating', cls: 'bg-orange-50 text-orange-700' },
  won: { label: 'Won', cls: 'bg-emerald-50 text-emerald-700' },
  lost: { label: 'Lost', cls: 'bg-red-50 text-red-700' },
}

const sourceLabels: Record<string, string> = {
  word_of_mouth: 'Word of Mouth',
  referral: 'Referral',
  website: 'Website',
  social: 'Social Media',
  cold_outreach: 'Cold Outreach',
  other: 'Other',
}

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

  const { data: teamMembers } = await supabase
    .from('team_users')
    .select('id, full_name')
    .eq('is_active', true)

  const st = statusConfig[lead.status] ?? statusConfig.new
  const assignedName =
    (lead.team_users as { full_name?: string } | null)?.full_name ?? null

  return (
    <div className="space-y-6">
      <Link
        href="/app/leads"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> All Leads
      </Link>

      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title={lead.contact_name}
          subtitle={lead.company_name ?? 'Individual'}
        />
        <span
          className={cn(
            'mt-1 rounded-full px-3 py-1 text-sm font-medium',
            st.cls
          )}
        >
          {st.label}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Details + Notes */}
        <div className="space-y-6 lg:col-span-2">
          {/* Details */}
          <div className="hub-card">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">
              Lead Details
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <InfoRow label="Email" value={lead.email ?? '—'} />
              <InfoRow label="Phone" value={lead.phone ?? '—'} />
              <InfoRow
                label="Source"
                value={sourceLabels[lead.source] ?? lead.source}
              />
              {lead.referral_name && (
                <InfoRow label="Referred By" value={lead.referral_name} />
              )}
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
                label="Created"
                value={formatRelativeTime(lead.created_at)}
              />
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

          {/* Notes */}
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

        {/* Right: Financials + Actions */}
        <div className="space-y-4">
          {/* Financials */}
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

          {/* Status Actions */}
          <LeadActions
            leadId={id}
            currentStatus={lead.status}
            hasConvertedClient={!!lead.converted_client_id}
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
