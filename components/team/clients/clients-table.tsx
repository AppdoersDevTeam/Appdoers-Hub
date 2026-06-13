'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NewClientSlideOver } from './new-client-slide-over'
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

type ClientRow = {
  id: string
  company_name: string
  primary_contact: string
  subscription_plan: string
  monthly_fee: number
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

export function ClientsTable({ clients }: { clients: ClientRow[] }) {
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showNew, setShowNew] = useState(false)

  const filtered = clients.filter((c) => {
    const matchSearch = c.company_name
      .toLowerCase()
      .includes(search.toLowerCase())
    const matchPlan =
      planFilter === 'all' || c.subscription_plan === planFilter
    const matchStatus =
      statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchPlan && matchStatus
  })

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
                {[
                  'Company',
                  'Primary Contact',
                  'Plan',
                  'MRR',
                  'Active Projects',
                  'Status',
                  'Last Activity',
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
                    colSpan={7}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    {clients.length === 0
                      ? 'No clients yet. Add your first client to get started.'
                      : 'No clients match your filters.'}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
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
                        {formatCurrency(c.monthly_fee)}
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
