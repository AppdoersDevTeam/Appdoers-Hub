'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NewLeadSlideOver } from './new-lead-slide-over'
import { ConvertLeadButton } from './convert-lead-button'
import { LeadDeleteButton } from './lead-delete-button'
import { ListToolbar, LIST_SELECT_CLASS } from '@/components/ui/list-toolbar'
import { ColumnVisibilityMenu } from '@/components/ui/column-visibility-menu'
import { ResizableSortableTh } from '@/components/ui/resizable-sortable-th'
import { RowHoverPreview, RowHoverPreviewProvider } from '@/components/ui/row-hover-preview'
import { useTablePrefs, type TableColumnDef } from '@/hooks/use-table-prefs'
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { sortRows, type SortDir, type SortValue } from '@/lib/utils/table-sort'
import {
  ALL_LEAD_STATUSES,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_STYLES,
} from '@/lib/leads/constants'
import type { LeadSource, LeadStatus, TeamUser } from '@/lib/types/database'

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
  converted_client_id: string | null
}

const sourceLabels = LEAD_SOURCE_LABELS

const LEAD_STATUS_ORDER: Record<string, number> = Object.fromEntries(
  ALL_LEAD_STATUSES.map((status, index) => [status, index])
)

const LEAD_COLUMNS: TableColumnDef[] = [
  { id: 'company', label: 'Company', sortable: true },
  { id: 'contact', label: 'Primary Contact', defaultWidth: 140, sortable: true },
  { id: 'source', label: 'Source', defaultWidth: 112, sortable: true },
  { id: 'value', label: 'Est. Value', defaultWidth: 104, sortable: true },
  { id: 'status', label: 'Status', defaultWidth: 120, sortable: true },
  { id: 'assigned', label: 'Assigned To', defaultWidth: 128, sortable: true },
  { id: 'nextAction', label: 'Next Action', defaultWidth: 112, sortable: true },
  { id: 'activity', label: 'Last Activity', defaultWidth: 112, sortable: true },
  { id: 'actions', label: 'Actions', defaultWidth: 120, hideable: false, sortable: false },
]

const LEAD_SORT_GETTERS: Record<string, (l: LeadRow) => SortValue> = {
  company: (l) => l.company_name || l.contact_name,
  contact: (l) => l.contact_name,
  source: (l) => sourceLabels[l.source as LeadSource] ?? l.source,
  value: (l) => l.estimated_value,
  status: (l) => LEAD_STATUS_ORDER[l.status] ?? 99,
  assigned: (l) => l.assigned_to_name,
  nextAction: (l) => l.next_action_date,
  activity: (l) => l.updated_at,
}

interface Props {
  leads: LeadRow[]
  teamMembers: Pick<TeamUser, 'id' | 'full_name'>[]
}

export function LeadsTable({ leads, teamMembers }: Props) {
  const { prefs, isVisible, widthFor, toggleVisible, setWidth, reset, minWidth } = useTablePrefs(
    'leads',
    LEAD_COLUMNS
  )
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [assignedFilter, setAssignedFilter] = useState('all')
  const [showNew, setShowNew] = useState(false)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return leads.filter((l) => {
      const matchSearch =
        l.contact_name.toLowerCase().includes(q) || (l.company_name ?? '').toLowerCase().includes(q)
      const matchStatus = statusFilter === 'all' || l.status === statusFilter
      const matchAssigned = assignedFilter === 'all' || l.assigned_to_name === assignedFilter
      return matchSearch && matchStatus && matchAssigned
    })
  }, [leads, search, statusFilter, assignedFilter])

  const sorted = useMemo(() => {
    const get = sortKey ? LEAD_SORT_GETTERS[sortKey] : undefined
    if (!get) return filtered
    return sortRows(filtered, get, sortDir)
  }, [filtered, sortKey, sortDir])

  const handleSort = (column: string, dir: SortDir) => {
    setSortKey(column)
    setSortDir(dir)
  }

  return (
    <>
      <ListToolbar
        search={
          <>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads…"
              className="pl-9"
            />
          </>
        }
        filters={
          <>
            <select
              className={LIST_SELECT_CLASS}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              {ALL_LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {LEAD_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <select
              className={LIST_SELECT_CLASS}
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
          </>
        }
        actions={
          <>
            <ColumnVisibilityMenu
              columns={LEAD_COLUMNS}
              visible={prefs.visible}
              onToggle={toggleVisible}
              onReset={reset}
            />
            <Button onClick={() => setShowNew(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New Lead
            </Button>
          </>
        }
      />

      <div className="hub-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <RowHoverPreviewProvider>
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  {LEAD_COLUMNS.filter((c) => isVisible(c.id)).map((col) =>
                    col.id === 'actions' ? (
                      <th
                        key={col.id}
                        style={{ width: widthFor(col.id), minWidth: widthFor(col.id) }}
                        className="sticky right-0 bg-white px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500"
                      >
                        Actions
                      </th>
                    ) : (
                      <ResizableSortableTh
                        key={col.id}
                        label={col.label}
                        column={col.id}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                        width={widthFor(col.id)}
                        onResize={setWidth}
                        minWidth={minWidth}
                        sortable={col.sortable !== false}
                        resizable={col.id !== 'company'}
                      />
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={prefs.visible.length} className="px-4 py-10 text-center text-slate-500">
                      {leads.length === 0
                        ? 'No leads yet. Add your first lead to get started.'
                        : 'No leads match your filters.'}
                    </td>
                  </tr>
                ) : (
                  sorted.map((l) => {
                    const status = l.status as LeadStatus
                    const stLabel = LEAD_STATUS_LABELS[status] ?? l.status
                    const stCls = LEAD_STATUS_STYLES[status] ?? LEAD_STATUS_STYLES.new
                    const displayTitle = l.company_name || l.contact_name
                    const cells: Record<string, ReactNode> = {
                      company: (
                        <RowHoverPreview
                          title={displayTitle}
                          meta={[
                            { label: 'Contact', value: l.company_name ? l.contact_name : '—' },
                            { label: 'Source', value: sourceLabels[l.source as LeadSource] ?? l.source },
                            {
                              label: 'Est. value',
                              value: l.estimated_value ? formatCurrency(l.estimated_value) : '—',
                            },
                            { label: 'Status', value: stLabel },
                            { label: 'Assignee', value: l.assigned_to_name ?? '—' },
                            {
                              label: 'Next action',
                              value: l.next_action_date ? formatDate(l.next_action_date) : '—',
                            },
                            { label: 'Last activity', value: formatRelativeTime(l.updated_at) },
                          ]}
                        >
                          <Link
                            href={`/app/leads/${l.id}`}
                            className="min-w-0 truncate font-medium text-slate-900 transition-colors hover:text-blue-600"
                          >
                            {displayTitle}
                          </Link>
                        </RowHoverPreview>
                      ),
                      contact: l.company_name ? l.contact_name : '—',
                      source: sourceLabels[l.source as LeadSource] ?? l.source,
                      value: l.estimated_value ? formatCurrency(l.estimated_value) : '—',
                      status: (
                        <span
                          className={cn(
                            'inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
                            stCls
                          )}
                        >
                          {stLabel}
                        </span>
                      ),
                      assigned: l.assigned_to_name ?? '—',
                      nextAction: l.next_action_date ? formatDate(l.next_action_date) : '—',
                      activity: formatRelativeTime(l.updated_at),
                      actions: (
                        <div className="flex items-center justify-end gap-0.5">
                          {l.converted_client_id ? (
                            <Link
                              href={`/app/clients/${l.converted_client_id}`}
                              className="mr-1 whitespace-nowrap text-xs font-medium text-emerald-700 hover:underline"
                            >
                              View client
                            </Link>
                          ) : status !== 'lost' ? (
                            <ConvertLeadButton
                              leadId={l.id}
                              leadName={displayTitle}
                              iconOnly
                            />
                          ) : null}
                          <LeadDeleteButton leadId={l.id} leadName={displayTitle} iconOnly />
                        </div>
                      ),
                    }

                    return (
                      <tr key={l.id} className="group transition-colors hover:bg-slate-50">
                        {LEAD_COLUMNS.filter((c) => isVisible(c.id)).map((c) => (
                          <td
                            key={c.id}
                            className={cn(
                              c.id === 'actions'
                                ? 'sticky right-0 bg-white px-3 py-3 group-hover:bg-slate-50'
                                : 'px-4 py-3',
                              ['contact', 'source', 'value', 'assigned', 'nextAction'].includes(c.id) &&
                                'text-slate-600',
                              c.id === 'activity' && 'text-slate-500',
                              c.id === 'company' && 'min-w-0 font-medium text-slate-900'
                            )}
                          >
                            {cells[c.id]}
                          </td>
                        ))}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </RowHoverPreviewProvider>
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
