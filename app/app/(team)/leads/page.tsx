import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { LeadsTable } from '@/components/team/leads/leads-table'
import { formatCurrency } from '@/lib/utils/format'
import { TrendingUp, CheckCircle, XCircle, Users } from 'lucide-react'

export default async function LeadsPage() {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select(`
      id, contact_name, company_name, status, estimated_value,
      source, assigned_to, next_action_date, updated_at,
      team_users(full_name)
    `)
    .order('updated_at', { ascending: false })

  const { data: teamMembers } = await supabase
    .from('team_users')
    .select('id, full_name')
    .eq('is_active', true)
    .order('full_name')

  const rows = leads ?? []

  // Summary metrics
  const activeLeads = rows.filter((l) => !['won', 'lost'].includes(l.status))
  const wonLeads = rows.filter((l) => l.status === 'won')
  const lostLeads = rows.filter((l) => l.status === 'lost')
  const pipelineValue = activeLeads.reduce(
    (sum, l) => sum + (l.estimated_value ?? 0),
    0
  )

  const summaryCards = [
    {
      label: 'Pipeline Value',
      value: formatCurrency(pipelineValue),
      icon: TrendingUp,
      color: 'text-[#3B82F6]',
      bg: 'bg-[#3B82F6]/10',
    },
    {
      label: 'Active Leads',
      value: String(activeLeads.length),
      icon: Users,
      color: 'text-[#F59E0B]',
      bg: 'bg-[#F59E0B]/10',
    },
    {
      label: 'Won',
      value: String(wonLeads.length),
      icon: CheckCircle,
      color: 'text-[#10B981]',
      bg: 'bg-[#10B981]/10',
    },
    {
      label: 'Lost',
      value: String(lostLeads.length),
      icon: XCircle,
      color: 'text-[#EF4444]',
      bg: 'bg-[#EF4444]/10',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        subtitle={`${activeLeads.length} active lead${activeLeads.length !== 1 ? 's' : ''} in pipeline`}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {summaryCards.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="hub-card flex items-center gap-3">
              <div className={`rounded-lg p-2 ${c.bg}`}>
                <Icon className={`h-5 w-5 ${c.color}`} />
              </div>
              <div>
                <p className="text-xl font-semibold text-[#F1F5F9]">
                  {c.value}
                </p>
                <p className="text-xs text-[#475569]">{c.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      <LeadsTable
        leads={rows.map((l) => ({
          id: l.id,
          contact_name: l.contact_name,
          company_name: l.company_name,
          status: l.status,
          estimated_value: l.estimated_value,
          source: l.source,
          assigned_to_name:
            (l.team_users as { full_name?: string } | null)?.full_name ?? null,
          next_action_date: l.next_action_date,
          updated_at: l.updated_at,
        }))}
        teamMembers={teamMembers ?? []}
      />
    </div>
  )
}
