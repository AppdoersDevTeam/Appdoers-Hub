'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NewClientSlideOver } from './new-client-slide-over'
import { DeleteRecordButton } from '@/components/ui/delete-record-button'
import { deleteClientAction } from '@/lib/actions/clients'
import { formatRecurringFee, recurringFeeToMonthly } from '@/lib/clients/billing'
import type { CatalogServiceOption } from '@/lib/clients/catalog-options'
import { ListToolbar, LIST_SELECT_CLASS } from '@/components/ui/list-toolbar'
import { ColumnVisibilityMenu } from '@/components/ui/column-visibility-menu'
import { ResizableSortableTh } from '@/components/ui/resizable-sortable-th'
import { RowHoverPreview, RowHoverPreviewProvider } from '@/components/ui/row-hover-preview'
import { useTablePrefs, type TableColumnDef } from '@/hooks/use-table-prefs'
import { formatRelativeTime } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { sortRows, type SortDir, type SortValue } from '@/lib/utils/table-sort'

type ClientRow = {
  id: string
  company_name: string
  primary_contact: string
  subscription_plan: string
  plan_service_id: string | null
  plan_name: string
  monthly_fee: number
  billing_cycle?: string
  status: string
  updated_at: string
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700' },
  inactive: { label: 'Inactive', cls: 'bg-slate-100 text-slate-500' },
  churned: { label: 'Churned', cls: 'bg-red-50 text-red-700' },
}

const CLIENT_STATUS_ORDER: Record<string, number> = { active: 0, inactive: 1, churned: 2 }

const CLIENT_COLUMNS: TableColumnDef[] = [
  { id: 'company', label: 'Company', sortable: true },
  { id: 'contact', label: 'Primary Contact', defaultWidth: 160, sortable: true },
  { id: 'plan', label: 'Plan', defaultWidth: 128, sortable: true },
  { id: 'fee', label: 'Fee', defaultWidth: 112, sortable: true },
  { id: 'status', label: 'Status', defaultWidth: 104, sortable: true },
  { id: 'activity', label: 'Last Activity', defaultWidth: 120, sortable: true },
  { id: 'actions', label: 'Actions', defaultWidth: 88, hideable: false, sortable: false },
]

const CLIENT_SORT_GETTERS: Record<string, (c: ClientRow) => SortValue> = {
  company: (c) => c.company_name,
  contact: (c) => c.primary_contact,
  plan: (c) => c.plan_name,
  fee: (c) => recurringFeeToMonthly(c.monthly_fee, c.billing_cycle),
  status: (c) => CLIENT_STATUS_ORDER[c.status] ?? 99,
  activity: (c) => c.updated_at,
}

export function ClientsTable({
  clients,
  catalogPlans = [],
}: {
  clients: ClientRow[]
  catalogPlans?: CatalogServiceOption[]
}) {
  const { prefs, isVisible, widthFor, toggleVisible, setWidth, reset, minWidth } = useTablePrefs(
    'clients',
    CLIENT_COLUMNS
  )
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showNew, setShowNew] = useState(false)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const planFilterOptions = useMemo(() => {
    const names = new Set<string>()
    for (const c of clients) names.add(c.plan_name)
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [clients])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return clients.filter((c) => {
      const matchSearch = c.company_name.toLowerCase().includes(q)
      const matchPlan = planFilter === 'all' || c.plan_name === planFilter
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

  return (
    <>
      <ListToolbar
        search={
          <>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients…"
              className="pl-9"
            />
          </>
        }
        filters={
          <>
            <select
              className={LIST_SELECT_CLASS}
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
            >
              <option value="all">All Plans</option>
              {planFilterOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <select
              className={LIST_SELECT_CLASS}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="churned">Churned</option>
            </select>
          </>
        }
        actions={
          <>
            <ColumnVisibilityMenu
              columns={CLIENT_COLUMNS}
              visible={prefs.visible}
              onToggle={toggleVisible}
              onReset={reset}
            />
            <Button onClick={() => setShowNew(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New Client
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
                  {CLIENT_COLUMNS.filter((c) => isVisible(c.id)).map((col) =>
                    col.id === 'actions' ? (
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
                        sortable={false}
                        resizable
                      />
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
                      {clients.length === 0
                        ? 'No clients yet. Add your first client to get started.'
                        : 'No clients match your filters.'}
                    </td>
                  </tr>
                ) : (
                  sorted.map((c) => {
                    const st = statusConfig[c.status] ?? statusConfig.inactive
                    const fee = formatRecurringFee(c.monthly_fee, c.billing_cycle)
                    const cells: Record<string, ReactNode> = {
                      company: (
                        <RowHoverPreview
                          title={c.company_name}
                          meta={[
                            { label: 'Contact', value: c.primary_contact || '—' },
                            { label: 'Plan', value: c.plan_name },
                            { label: 'Fee', value: fee },
                            { label: 'Status', value: st.label },
                            { label: 'Last activity', value: formatRelativeTime(c.updated_at) },
                          ]}
                        >
                          <Link
                            href={`/app/clients/${c.id}`}
                            className="min-w-0 truncate font-medium text-slate-900 transition-colors hover:text-blue-600"
                          >
                            {c.company_name}
                          </Link>
                        </RowHoverPreview>
                      ),
                      contact: c.primary_contact,
                      plan: c.plan_name,
                      fee,
                      status: (
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', st.cls)}>
                          {st.label}
                        </span>
                      ),
                      activity: formatRelativeTime(c.updated_at),
                      actions: (
                        <DeleteRecordButton
                          iconOnly
                          title="Delete client"
                          message={`Delete "${c.company_name}"? Projects, invoices, documents, and contacts for this client will also be deleted. Converted leads will be unlinked. This cannot be undone.`}
                          confirmLabel="Delete Client"
                          buttonLabel={`Delete ${c.company_name}`}
                          onDelete={() => deleteClientAction(c.id)}
                        />
                      ),
                    }

                    return (
                      <tr key={c.id} className="transition-colors hover:bg-slate-50">
                        {CLIENT_COLUMNS.filter((cCol) => isVisible(cCol.id)).map((cCol) => (
                          <td
                            key={cCol.id}
                            className={cn(
                              'px-4 py-3',
                              ['contact', 'plan', 'fee'].includes(cCol.id) && 'text-slate-600',
                              cCol.id === 'activity' && 'text-slate-500',
                              cCol.id === 'company' && 'min-w-0 font-medium text-slate-900'
                            )}
                          >
                            {cells[cCol.id]}
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

      <NewClientSlideOver
        open={showNew}
        onClose={() => setShowNew(false)}
        catalogPlans={catalogPlans}
      />
    </>
  )
}
