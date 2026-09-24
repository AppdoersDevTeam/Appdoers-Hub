'use client'

import { useMemo, useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NewProjectSlideOver } from './new-project-slide-over'
import { deleteProjectAction } from '@/lib/actions/projects'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { ListToolbar, LIST_SELECT_CLASS } from '@/components/ui/list-toolbar'
import { ColumnVisibilityMenu } from '@/components/ui/column-visibility-menu'
import { ResizableSortableTh } from '@/components/ui/resizable-sortable-th'
import { RowHoverPreview, RowHoverPreviewProvider } from '@/components/ui/row-hover-preview'
import { DataTable, dataTableCellClass } from '@/components/ui/data-table'
import { useTablePrefs, type TableColumnDef } from '@/hooks/use-table-prefs'
import { formatDate, formatHours } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { sortRows, type SortDir, type SortValue } from '@/lib/utils/table-sort'

type ProjectRow = {
  id: string
  name: string
  type: string
  current_phase: string
  client_status: string
  status: string
  start_date: string | null
  target_launch_date: string | null
  estimated_hours: number | null
  logged_hours: number
  client_name: string
  client_id: string
}

const phaseLabels: Record<string, string> = {
  discovery: 'Discovery',
  design: 'Design',
  development: 'Development',
  review_qa: 'Review & QA',
  launch: 'Launch',
  maintenance: 'Maintenance',
}

const clientStatusConfig: Record<string, { label: string; cls: string }> = {
  new: { label: 'New', cls: 'bg-slate-100 text-slate-500' },
  in_progress: { label: 'In Progress', cls: 'bg-blue-50 text-blue-700' },
  awaiting_appdoers: { label: 'Awaiting Us', cls: 'bg-amber-50 text-amber-700' },
  awaiting_client: { label: 'Awaiting Client', cls: 'bg-orange-50 text-orange-700' },
  completed: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700' },
  on_hold: { label: 'On Hold', cls: 'bg-red-50 text-red-700' },
}

const projectStatusConfig: Record<string, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700' },
  on_hold: { label: 'On Hold', cls: 'bg-amber-50 text-amber-700' },
  completed: { label: 'Completed', cls: 'bg-slate-100 text-slate-500' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-50 text-red-700' },
}

const PHASE_ORDER: Record<string, number> = {
  discovery: 0,
  design: 1,
  development: 2,
  review_qa: 3,
  launch: 4,
  maintenance: 5,
}

const CLIENT_STATUS_ORDER: Record<string, number> = {
  new: 0,
  in_progress: 1,
  awaiting_appdoers: 2,
  awaiting_client: 3,
  on_hold: 4,
  completed: 5,
}

const PROJECT_STATUS_ORDER: Record<string, number> = {
  active: 0,
  on_hold: 1,
  completed: 2,
  cancelled: 3,
}

const PROJECT_COLUMNS: TableColumnDef[] = [
  { id: 'name', label: 'Project', defaultWidth: 220, sortable: true },
  { id: 'client', label: 'Client', defaultWidth: 160, sortable: true },
  { id: 'type', label: 'Type', defaultWidth: 100, sortable: true },
  { id: 'phase', label: 'Phase', defaultWidth: 120, sortable: true },
  { id: 'clientStatus', label: 'Client Status', defaultWidth: 128, sortable: true },
  { id: 'launch', label: 'Launch Date', defaultWidth: 112, sortable: true },
  { id: 'hours', label: 'Hours', defaultWidth: 100, sortable: true },
  { id: 'status', label: 'Status', defaultWidth: 104, sortable: true },
  { id: 'actions', label: 'Actions', defaultWidth: 48, hideable: false, sortable: false },
]

const PROJECT_SORT_GETTERS: Record<string, (p: ProjectRow) => SortValue> = {
  name: (p) => p.name,
  client: (p) => p.client_name,
  type: (p) => p.type,
  phase: (p) => PHASE_ORDER[p.current_phase] ?? 99,
  clientStatus: (p) => CLIENT_STATUS_ORDER[p.client_status] ?? 99,
  launch: (p) => p.target_launch_date,
  hours: (p) => p.logged_hours,
  status: (p) => PROJECT_STATUS_ORDER[p.status] ?? 99,
}

interface Props {
  projects: ProjectRow[]
  clients: { id: string; company_name: string }[]
}

export function ProjectsTable({ projects, clients }: Props) {
  const router = useRouter()
  const { prefs, widthFor, toggleVisible, setWidth, reset, minWidth, visibleColumns } = useTablePrefs(
    'projects',
    PROJECT_COLUMNS
  )
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showNew, setShowNew] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProjectRow | null>(null)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return projects.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(q) || p.client_name.toLowerCase().includes(q)
      const matchPhase = phaseFilter === 'all' || p.current_phase === phaseFilter
      const matchStatus = statusFilter === 'all' || p.status === statusFilter
      return matchSearch && matchPhase && matchStatus
    })
  }, [projects, search, phaseFilter, statusFilter])

  const sorted = useMemo(() => {
    const get = sortKey ? PROJECT_SORT_GETTERS[sortKey] : undefined
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
              placeholder="Search projects…"
              className="pl-9"
            />
          </>
        }
        filters={
          <>
            <select
              className={LIST_SELECT_CLASS}
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value)}
            >
              <option value="all">All Phases</option>
              {Object.entries(phaseLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
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
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <ColumnVisibilityMenu
              columns={PROJECT_COLUMNS}
              visible={prefs.visible}
              onToggle={toggleVisible}
              onReset={reset}
            />
          </>
        }
        actions={
          <Button onClick={() => setShowNew(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New Project
          </Button>
        }
      />

      <div className="hub-card min-w-0 overflow-hidden p-0">
        <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
          <RowHoverPreviewProvider>
            <DataTable columns={visibleColumns} widthFor={widthFor}>
              <thead>
                <tr className="border-b border-slate-200">
                  {visibleColumns.map((col) =>
                    col.id === 'actions' ? (
                      <th key={col.id} aria-label="Delete" className="overflow-hidden px-4 py-3" />
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
                        resizable
                      />
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={prefs.visible.length} className="px-4 py-10 text-center text-slate-500">
                      {projects.length === 0
                        ? 'No projects yet. Create your first project.'
                        : 'No projects match your filters.'}
                    </td>
                  </tr>
                ) : (
                  sorted.map((p) => {
                    const cs = clientStatusConfig[p.client_status] ?? clientStatusConfig.new
                    const ps = projectStatusConfig[p.status] ?? projectStatusConfig.active
                    const hoursDisplay = p.estimated_hours
                      ? `${formatHours(p.logged_hours, '0h')} / ${p.estimated_hours}h`
                      : formatHours(p.logged_hours)
                    const cells: Record<string, ReactNode> = {
                      name: (
                        <RowHoverPreview
                          title={p.name}
                          meta={[
                            { label: 'Client', value: p.client_name },
                            { label: 'Type', value: p.type },
                            { label: 'Phase', value: phaseLabels[p.current_phase] ?? p.current_phase },
                            { label: 'Client status', value: cs.label },
                            {
                              label: 'Launch',
                              value: p.target_launch_date ? formatDate(p.target_launch_date) : '—',
                            },
                            { label: 'Hours', value: hoursDisplay },
                            { label: 'Status', value: ps.label },
                          ]}
                        >
                          <Link
                            href={`/app/projects/${p.id}`}
                            className="block truncate font-medium text-slate-900 transition-colors hover:text-blue-600"
                          >
                            {p.name}
                          </Link>
                        </RowHoverPreview>
                      ),
                      client: <span className="block truncate">{p.client_name}</span>,
                      type: <span className="block truncate capitalize">{p.type}</span>,
                      phase: (
                        <span className="block truncate">
                          {phaseLabels[p.current_phase] ?? p.current_phase}
                        </span>
                      ),
                      clientStatus: (
                        <span
                          className={cn(
                            'inline-block max-w-full truncate rounded-full px-2.5 py-0.5 text-xs font-medium',
                            cs.cls
                          )}
                        >
                          {cs.label}
                        </span>
                      ),
                      launch: (
                        <span className="block truncate">
                          {p.target_launch_date ? formatDate(p.target_launch_date) : '—'}
                        </span>
                      ),
                      hours: <span className="block truncate">{hoursDisplay}</span>,
                      status: (
                        <span
                          className={cn(
                            'inline-block max-w-full truncate rounded-full px-2.5 py-0.5 text-xs font-medium',
                            ps.cls
                          )}
                        >
                          {ps.label}
                        </span>
                      ),
                      actions: (
                        <button
                          onClick={() => setDeleteTarget(p)}
                          disabled={isPending}
                          className="rounded p-1 text-slate-500 transition-colors hover:text-red-600"
                          title="Delete project"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ),
                    }

                    return (
                      <tr key={p.id} className="transition-colors hover:bg-slate-50">
                        {visibleColumns.map((c) => (
                          <td
                            key={c.id}
                            className={cn(
                              dataTableCellClass,
                              c.id !== 'name' &&
                                c.id !== 'clientStatus' &&
                                c.id !== 'status' &&
                                c.id !== 'actions'
                                ? 'text-slate-600'
                                : undefined
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
            </DataTable>
          </RowHoverPreviewProvider>
        </div>
      </div>

      <NewProjectSlideOver open={showNew} onClose={() => setShowNew(false)} clients={clients} />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All tasks and phases will also be deleted. This cannot be undone.`}
        confirmLabel="Delete Project"
        onConfirm={() => {
          if (!deleteTarget) return
          startTransition(async () => {
            await deleteProjectAction(deleteTarget.id, deleteTarget.client_id)
            setDeleteTarget(null)
            router.refresh()
          })
        }}
        onCancel={() => setDeleteTarget(null)}
        isPending={isPending}
      />
    </>
  )
}
