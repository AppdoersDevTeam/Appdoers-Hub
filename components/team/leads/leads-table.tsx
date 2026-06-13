'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NewLeadSlideOver } from './new-lead-slide-over'
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import type { TeamUser } from '@/lib/types/database'

type LeadRow = {
  id: string
  contact_name: string
  company_name: string | null
  status: string
  estimated_value: number | null
  source: string
  assigned_to_name: string | null
  next_action_date: string | null
  updated_at: string
}

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
  social: 'Social',
  cold_outreach: 'Cold Outreach',
  other: 'Other',
}

interface Props {
  leads: LeadRow[]
  teamMembers: Pick<TeamUser, 'id' | 'full_name'>[]
}

export function LeadsTable({ leads, teamMembers }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [assignedFilter, setAssignedFilter] = useState('all')
  const [showNew, setShowNew] = useState(false)

  const filtered = leads.filter((l) => {
    const matchSearch =
      l.contact_name.toLowerCase().includes(search.toLowerCase()) ||
      (l.company_name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus =
      statusFilter === 'all' || l.status === statusFilter
    const matchAssigned =
      assignedFilter === 'all' || l.assigned_to_name === assignedFilter
    return matchSearch && matchStatus && matchAssigned
  })

  const selectClass =
    'rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none'

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads…"
            className="pl-9"
          />
        </div>
        <select
          className={selectClass}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          {Object.entries(statusConfig).map(([v, { label }]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={assignedFilter}
          onChange={(e) => setAssignedFilter(e.target.value)}
        >
          <option value="all">All Assignees</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.full_name}>
              {m.full_name}
            </option>
          ))}
        </select>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> New Lead
        </Button>
      </div>

      {/* Table */}
      <div className="hub-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {[
                  'Contact',
                  'Company',
                  'Status',
                  'Est. Value',
                  'Source',
                  'Assigned To',
                  'Next Action',
                  'Last Updated',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    {leads.length === 0
                      ? 'No leads yet. Add your first lead to get started.'
                      : 'No leads match your filters.'}
                  </td>
                </tr>
              ) : (
                filtered.map((l) => {
                  const st = statusConfig[l.status] ?? statusConfig.new
                  return (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <Link
                          href={`/app/leads/${l.id}`}
                          className="hover:text-blue-600 transition-colors"
                        >
                          {l.contact_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {l.company_name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-xs font-medium',
                            st.cls
                          )}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {l.estimated_value
                          ? formatCurrency(l.estimated_value)
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {sourceLabels[l.source] ?? l.source}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {l.assigned_to_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {l.next_action_date
                          ? formatDate(l.next_action_date)
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatRelativeTime(l.updated_at)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewLeadSlideOver
        open={showNew}
        onClose={() => setShowNew(false)}
        teamMembers={teamMembers}
      />
    </>
  )
}
