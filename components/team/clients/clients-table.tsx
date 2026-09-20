'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NewClientSlideOver } from './new-client-slide-over'
import { DeleteRecordButton } from '@/components/ui/delete-record-button'
import { deleteClientAction } from '@/lib/actions/clients'
import { formatRecurringFee, recurringFeeToMonthly } from '@/lib/clients/billing'
import { SortableTh } from '@/components/ui/sortable-th'
import { formatRelativeTime } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { sortRows, type SortDir, type SortValue } from '@/lib/utils/table-sort'

type ClientRow = {
  id: string
  company_name: string
  primary_contact: string
  subscription_plan: string
  monthly_fee: number
  billing_cycle?: string
  active_projects: number
  status: string
  updated_at: string
}

import { PLAN_LABELS } from '@/lib/constants/plans'

const planLabels: Record<string, string> = PLAN_LABELS

const statusConfig: Record<string, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700' },
  inactive: { label: 'Inactive', cls: 'bg-slate-100 text-slate-500' },
  churned: { label: 'Churned', cls: 'bg-red-50 text-red-700' },
}

const CLIENT_STATUS_ORDER: Record<string, number> = { active: 0, inactive: 1, churned: 2 }

const CLIENT_SORT_GETTERS: Record<string, (c: ClientRow) => SortValue> = {
  company: (c) => c.company_name,
  contact: (c) => c.primary_contact,
  plan: (c) => planLabels[c.subscription_plan] ?? c.subscription_plan,
  fee: (c) => recurringFeeToMonthly(c.monthly_fee, c.billing_cycle),
  projects: (c) => c.active_projects,
  status: (c) => CLIENT_STATUS_ORDER[c.status] ?? 99,
  activity: (c) => c.updated_at,
}

export function ClientsTable({ clients }: { clients: ClientRow[] }) {
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showNew, setShowNew] = useState(false)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return clients.filter((c) => {
      const matchSearch = c.company_name.toLowerCase().includes(q)
      const matchPlan = planFilter === 'all' || c.subscription_plan === planFilter
      const matchStatus = statusFilter === 'all' || c.status === statusFilter
      return matchSearch && matchPlan && matchStatus
    })
  }, [clients, search, planFilter, statusFilter])

  const sorted = useMemo(() => {
    const get = sortKey ? CLIENT_SORT_GETTERS[sortKey] : undefined
    if (!get) return filtered
    return sortRows(filtered, get, sortDir)
  }, [filtered, sortKey, sortDir])

  const handleSort = (column: string, dir: SortDir) => {
    setSortKey(column)
    setSortDir(dir)
  }

  const selectClass =
    'rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none'

  return (
    <>
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="pl-9"
          />
        </div>
        <select
          className={selectClass}
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
        >
          <option value="all">All Plans</option>
          {Object.entries(planLabels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="churned">Churned</option>
        </select>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> New Client
        </Button>
      </div>

      {/* Table */}
      <div className="hub-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <SortableTh label="Company" column="company" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Primary Contact" column="contact" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Plan" column="plan" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Fee" column="fee" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Active Projects" column="projects" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Status" column="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Last Activity" column="activity" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    {clients.length === 0
                      ? 'No clients yet. Add your first client to get started.'
                      : 'No clients match your filters.'}
                  </td>
                </tr>
              ) : (
                sorted.map((c) => {
                  const st = statusConfig[c.status] ?? statusConfig.inactive
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <Link
                          href={`/app/clients/${c.id}`}
                          className="hover:text-blue-600 transition-colors"
                        >
                          {c.company_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {c.primary_contact}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {planLabels[c.subscription_plan] ?? c.subscription_plan}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatRecurringFee(c.monthly_fee, c.billing_cycle)}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">
                        {c.active_projects}
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
                      <td className="px-4 py-3 text-slate-500">
                        {formatRelativeTime(c.updated_at)}
                      </td>
                      <td className="px-4 py-3">
                        <DeleteRecordButton
                          iconOnly
                          title="Delete client"
                          message={`Delete "${c.company_name}"? Projects, invoices, documents, and contacts for this client will also be deleted. Converted leads will be unlinked. This cannot be undone.`}
                          confirmLabel="Delete Client"
                          buttonLabel={`Delete ${c.company_name}`}
                          onDelete={() => deleteClientAction(c.id)}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewClientSlideOver open={showNew} onClose={() => setShowNew(false)} />
    </>
  )
}
