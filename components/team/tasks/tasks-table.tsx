'use client'

import { useMemo, useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { Download, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NewTaskSlideOver } from './new-task-slide-over'
import { TaskStatusSelect } from './task-status-select'
import { deleteTaskAction } from '@/lib/actions/tasks'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { MultiSelectFilter } from '@/components/ui/multi-select-filter'
import { ListToolbar, LIST_SELECT_CLASS } from '@/components/ui/list-toolbar'
import { ColumnVisibilityMenu } from '@/components/ui/column-visibility-menu'
import { ResizableSortableTh } from '@/components/ui/resizable-sortable-th'
import { RowHoverPreview, RowHoverPreviewProvider } from '@/components/ui/row-hover-preview'
import { DataTable, dataTableCellClass } from '@/components/ui/data-table'
import { useTablePrefs, type TableColumnDef } from '@/hooks/use-table-prefs'
import { formatDate, formatHours, todayYmd } from '@/lib/utils/format'
import { TASK_STATUS_CONFIG, TASK_STATUS_OPTIONS } from '@/lib/tasks/constants'
import { cn } from '@/lib/utils/cn'
import { sortRows, type SortDir, type SortValue } from '@/lib/utils/table-sort'
import type { TeamUser } from '@/lib/types/database'

type TaskRow = {
  id: string
  title: string
  type: string
  priority: string
  status: string
  workflow_stage?: string
  project_id: string
  project_name: string
  client_id?: string
  client_name: string
  assigned_to?: string | null
  assigned_to_name: string | null
  due_date: string | null
  time_spent: number
  updated_at: string
}

const typeConfig: Record<string, { label: string; cls: string }> = {
  feature: { label: 'Feature', cls: 'bg-blue-50 text-blue-700' },
  bug: { label: 'Bug', cls: 'bg-red-50 text-red-700' },
  revision: { label: 'Revision', cls: 'bg-amber-50 text-amber-700' },
  content: { label: 'Content', cls: 'bg-emerald-50 text-emerald-700' },
  design: { label: 'Design', cls: 'bg-purple-50 text-purple-700' },
  admin: { label: 'Admin', cls: 'bg-slate-100 text-slate-500' },
}

const priorityConfig: Record<string, { label: string; cls: string }> = {
  p0: { label: 'P0', cls: 'bg-red-100 text-red-700 font-bold' },
  p1: { label: 'P1', cls: 'bg-orange-50 text-orange-700' },
  p2: { label: 'P2', cls: 'bg-amber-50 text-amber-700' },
  p3: { label: 'P3', cls: 'bg-slate-100 text-slate-500' },
}

const PRIORITY_ORDER: Record<string, number> = { p0: 0, p1: 1, p2: 2, p3: 3 }
const STATUS_ORDER: Record<string, number> = { open: 0, in_progress: 1, awaiting_review: 2, closed: 3 }
const ALL_STATUS_VALUES = TASK_STATUS_OPTIONS.map((option) => option.value)

const TASK_COLUMNS_FULL: TableColumnDef[] = [
  { id: 'title', label: 'Title', defaultWidth: 220, sortable: true },
  { id: 'type', label: 'Type', defaultWidth: 96, sortable: true },
  { id: 'priority', label: 'Priority', defaultWidth: 80, sortable: true },
  { id: 'project', label: 'Project', defaultWidth: 140, sortable: true },
  { id: 'client', label: 'Client', defaultWidth: 120, sortable: true },
  { id: 'assigned', label: 'Assigned To', defaultWidth: 128, sortable: true },
  { id: 'due', label: 'Due Date', defaultWidth: 100, defaultVisible: false, sortable: true },
  { id: 'time', label: 'Time', defaultWidth: 72, defaultVisible: false, sortable: true },
  { id: 'status', label: 'Status', defaultWidth: 168, sortable: true },
  { id: 'actions', label: 'Actions', defaultWidth: 48, hideable: false, sortable: false },
]

const TASK_COLUMNS_SCOPED: TableColumnDef[] = TASK_COLUMNS_FULL.filter(
  (c) => c.id !== 'project' && c.id !== 'client'
)

const TASK_SORT_GETTERS: Record<string, (t: TaskRow) => SortValue> = {
  title: (t) => t.title,
  type: (t) => typeConfig[t.type]?.label ?? t.type,
  priority: (t) => PRIORITY_ORDER[t.priority] ?? 99,
  project: (t) => t.project_name,
  client: (t) => t.client_name,
  assigned: (t) => t.assigned_to_name,
  due: (t) => t.due_date,
  time: (t) => t.time_spent,
  status: (t) => STATUS_ORDER[t.status] ?? 99,
}

interface Props {
  tasks: TaskRow[]
  projects: { id: string; name: string }[]
  filterProjects?: { id: string; name: string; client_id: string }[]
  clients?: { id: string; company_name: string }[]
  teamMembers: Pick<TeamUser, 'id' | 'full_name'>[]
  defaultProjectId?: string
  defaultClientId?: string
  showProjectCol?: boolean
  currentUserId?: string
  /** Controlled assignee filter (`all` | `unassigned` | team user id) */
  assigneeFilter?: string
  onAssigneeFilterChange?: (value: string) => void
}

export function TasksTable({
  tasks,
  projects,
  filterProjects,
  clients = [],
  teamMembers,
  defaultProjectId,
  defaultClientId,
  showProjectCol = true,
  currentUserId,
  assigneeFilter: assigneeFilterProp,
  onAssigneeFilterChange,
}: Props) {
  const columns = showProjectCol ? TASK_COLUMNS_FULL : TASK_COLUMNS_SCOPED
  const tableId = showProjectCol ? 'tasks' : 'tasks-scoped'
  const {
    prefs,
    widthFor,
    toggleVisible,
    setWidth,
    reset,
    minWidth,
    visibleColumns,
  } = useTablePrefs(tableId, columns)

  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState(defaultClientId ?? 'all')
  const [projectFilter, setProjectFilter] = useState(defaultProjectId ?? 'all')
  const [assigneeFilterInternal, setAssigneeFilterInternal] = useState('all')
  const assigneeFilter = assigneeFilterProp ?? assigneeFilterInternal
  const setAssigneeFilter = onAssigneeFilterChange ?? setAssigneeFilterInternal
  const [typeFilter, setTypeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<string[]>(ALL_STATUS_VALUES)
  const [showNew, setShowNew] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TaskRow | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const today = todayYmd()
  const showClientFilter = showProjectCol && !defaultClientId
  const showProjectFilter = showProjectCol && !defaultProjectId
  const projectOptions = (filterProjects ?? projects.map((p) => ({ ...p, client_id: '' }))).filter(
    (p) => clientFilter === 'all' || p.client_id === clientFilter
  )

  const secondaryActiveCount = [typeFilter !== 'all', priorityFilter !== 'all'].filter(Boolean).length

  const handleClientFilterChange = (value: string) => {
    setClientFilter(value)
    if (projectFilter !== 'all') {
      const stillValid = (filterProjects ?? []).some(
        (p) => p.id === projectFilter && (value === 'all' || p.client_id === value)
      )
      if (!stillValid) setProjectFilter('all')
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return tasks.filter((t) => {
      const matchSearch = t.title.toLowerCase().includes(q)
      const matchClient = !showClientFilter || clientFilter === 'all' || t.client_id === clientFilter
      const matchProject = !showProjectFilter || projectFilter === 'all' || t.project_id === projectFilter
      const matchAssignee =
        assigneeFilter === 'all' ||
        (assigneeFilter === 'unassigned' ? !t.assigned_to : t.assigned_to === assigneeFilter)
      const matchType = typeFilter === 'all' || t.type === typeFilter
      const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter
      const matchStatus = statusFilter.includes(t.status)
      return matchSearch && matchClient && matchProject && matchAssignee && matchType && matchPriority && matchStatus
    })
  }, [
    tasks,
    search,
    showClientFilter,
    clientFilter,
    showProjectFilter,
    projectFilter,
    assigneeFilter,
    typeFilter,
    priorityFilter,
    statusFilter,
  ])

  const sorted = useMemo(() => {
    const get = sortKey ? TASK_SORT_GETTERS[sortKey] : undefined
    if (!get) return filtered
    return sortRows(filtered, get, sortDir)
  }, [filtered, sortKey, sortDir])

  const handleDelete = () => {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteTaskAction(deleteTarget.id, deleteTarget.project_id)
      if (!result.success) return
      setDeleteTarget(null)
    })
  }

  const exportTitle = defaultProjectId
    ? `Tasks — ${projects.find((p) => p.id === defaultProjectId)?.name ?? 'Project'}`
    : defaultClientId
      ? `Tasks — ${clients.find((c) => c.id === defaultClientId)?.company_name ?? tasks[0]?.client_name ?? 'Client'}`
      : 'Tasks'

  const exportFilters = [
    search.trim() ? { label: 'Search', value: search.trim() } : null,
    showClientFilter && clientFilter !== 'all'
      ? { label: 'Client', value: clients.find((c) => c.id === clientFilter)?.company_name ?? clientFilter }
      : null,
    showProjectFilter && projectFilter !== 'all'
      ? { label: 'Project', value: projectOptions.find((p) => p.id === projectFilter)?.name ?? projectFilter }
      : null,
    assigneeFilter !== 'all'
      ? {
          label: 'Assignee',
          value:
            assigneeFilter === 'unassigned'
              ? 'Unassigned'
              : teamMembers.find((m) => m.id === assigneeFilter)?.full_name ?? assigneeFilter,
        }
      : null,
    typeFilter !== 'all' ? { label: 'Type', value: typeConfig[typeFilter]?.label ?? typeFilter } : null,
    priorityFilter !== 'all'
      ? { label: 'Priority', value: priorityConfig[priorityFilter]?.label ?? priorityFilter }
      : null,
    statusFilter.length > 0 && statusFilter.length < ALL_STATUS_VALUES.length
      ? {
          label: 'Status',
          value: TASK_STATUS_OPTIONS.filter((s) => statusFilter.includes(s.value))
            .map((s) => s.label)
            .join(', '),
        }
      : null,
  ].filter((item): item is { label: string; value: string } => item !== null)

  const handleExportPdf = async () => {
    if (sorted.length === 0 || exporting) return
    setExportError(null)
    setExporting(true)
    try {
      const res = await fetch('/api/tasks/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: sorted.map((t) => t.id),
          showProjectCol,
          title: exportTitle,
          filters: exportFilters,
        }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setExportError(data?.error ?? 'PDF export failed')
        return
      }

      const blob = await res.blob()
      const header = res.headers.get('Content-Disposition')
      const match = header?.match(/filename="([^"]+)"/)
      const filename = match?.[1] ?? 'Tasks_Export.pdf'
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      setExportError('PDF export failed')
    } finally {
      setExporting(false)
    }
  }

  const colCount = prefs.visible.length
  const handleSort = (column: string, dir: SortDir) => {
    setSortKey(column)
    setSortDir(dir)
  }

  const renderHeader = (col: TableColumnDef) => {
    if (col.id === 'actions') {
      return (
        <th
          key={col.id}
          aria-label="Delete"
          className="overflow-hidden px-2 py-3"
        />
      )
    }
    return (
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
  }

  return (
    <div className="min-w-0 space-y-3">
      <ListToolbar
        search={
          <>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="pl-9"
            />
          </>
        }
        filters={
          <>
            {showClientFilter && (
              <select
                className={LIST_SELECT_CLASS}
                value={clientFilter}
                onChange={(e) => handleClientFilterChange(e.target.value)}
              >
                <option value="all">All Clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            )}
            {showProjectFilter && (
              <select
                className={LIST_SELECT_CLASS}
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
              >
                <option value="all">All Projects</option>
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            <select
              className={LIST_SELECT_CLASS}
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              aria-label="Filter by assignee"
            >
              <option value="all">All Assignees</option>
              {currentUserId ? <option value={currentUserId}>Me</option> : null}
              <option value="unassigned">Unassigned</option>
              {teamMembers
                .filter((m) => m.id !== currentUserId)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
            </select>
            <MultiSelectFilter
              label="Filter by status"
              allLabel="All Statuses"
              emptyLabel="No statuses"
              options={TASK_STATUS_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
            />
            <ColumnVisibilityMenu
              columns={columns}
              visible={prefs.visible}
              onToggle={toggleVisible}
              onReset={reset}
            />
          </>
        }
        secondaryFilters={
          <>
            <select
              className={cn(LIST_SELECT_CLASS, 'w-full max-w-none')}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              {Object.entries(typeConfig).map(([v, { label }]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
            <select
              className={cn(LIST_SELECT_CLASS, 'w-full max-w-none')}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">All Priorities</option>
              {Object.entries(priorityConfig).map(([v, { label }]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </>
        }
        secondaryActiveCount={secondaryActiveCount}
        actions={
          <>
            <Button
              variant="outline"
              onClick={handleExportPdf}
              disabled={sorted.length === 0 || exporting}
              loading={exporting}
              title="Export the currently filtered tasks as PDF"
            >
              <Download className="h-4 w-4" />
              Export PDF{sorted.length > 0 ? ` (${sorted.length})` : ''}
            </Button>
            <Button onClick={() => setShowNew(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New Task
            </Button>
          </>
        }
      />
      {exportError ? <p className="text-sm text-red-600">{exportError}</p> : null}

      <div className="hub-card min-w-0 overflow-hidden p-0">
        <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
          <RowHoverPreviewProvider>
            <DataTable columns={visibleColumns} widthFor={widthFor}>
              <thead>
                <tr className="border-b border-slate-200">
                  {visibleColumns.map(renderHeader)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-10 text-center text-slate-500">
                      {tasks.length === 0 ? 'No tasks yet.' : 'No tasks match your filters.'}
                    </td>
                  </tr>
                ) : (
                  sorted.map((t) => {
                    const ty = typeConfig[t.type] ?? typeConfig.admin
                    const pr = priorityConfig[t.priority] ?? priorityConfig.p3
                    const isOverdue = Boolean(t.due_date && t.due_date < today && t.status !== 'closed')
                    const statusLabel =
                      TASK_STATUS_CONFIG[t.status as keyof typeof TASK_STATUS_CONFIG]?.label ?? t.status

                    const cells: Record<string, ReactNode> = {
                      title: (
                        <RowHoverPreview
                          title={t.title}
                          badge={
                            isOverdue ? <span className="shrink-0 text-xs text-red-600">Overdue</span> : null
                          }
                          meta={[
                            { label: 'Type', value: ty.label },
                            { label: 'Priority', value: pr.label },
                            ...(showProjectCol
                              ? [
                                  { label: 'Project', value: t.project_name },
                                  { label: 'Client', value: t.client_name },
                                ]
                              : []),
                            { label: 'Assignee', value: t.assigned_to_name ?? 'Unassigned' },
                            { label: 'Due', value: t.due_date ? formatDate(t.due_date) : '—' },
                            { label: 'Status', value: statusLabel },
                            { label: 'Time', value: formatHours(t.time_spent) },
                          ]}
                        >
                          <Link
                            href={`/app/tasks/${t.id}`}
                            className={cn(
                              'block truncate font-medium transition-colors hover:text-blue-600',
                              isOverdue ? 'text-red-600' : 'text-slate-900'
                            )}
                          >
                            {t.title}
                          </Link>
                        </RowHoverPreview>
                      ),
                      type: (
                        <span className={cn('inline-block max-w-full truncate rounded-full px-2.5 py-0.5 text-xs font-medium', ty.cls)}>
                          {ty.label}
                        </span>
                      ),
                      priority: (
                        <span className={cn('inline-block max-w-full truncate rounded-full px-2.5 py-0.5 text-xs font-medium', pr.cls)}>
                          {pr.label}
                        </span>
                      ),
                      project: (
                        <Link
                          href={`/app/projects/${t.project_id}`}
                          className="block truncate transition-colors hover:text-blue-600"
                        >
                          {t.project_name}
                        </Link>
                      ),
                      client: <span className="block truncate">{t.client_name}</span>,
                      assigned: <span className="block truncate">{t.assigned_to_name ?? '—'}</span>,
                      due: <span className="block truncate">{t.due_date ? formatDate(t.due_date) : '—'}</span>,
                      time: <span className="block truncate">{formatHours(t.time_spent)}</span>,
                      status: (
                        <div className="min-w-0 max-w-full overflow-hidden">
                          <TaskStatusSelect
                            taskId={t.id}
                            projectId={t.project_id}
                            value={t.status as 'open' | 'in_progress' | 'awaiting_review' | 'closed'}
                            compact
                          />
                        </div>
                      ),
                      actions: (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(t)}
                          disabled={isPending}
                          className="inline-flex rounded p-1 text-slate-500 transition-colors hover:text-red-600"
                          title="Delete task"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ),
                    }

                    return (
                      <tr
                        key={t.id}
                        className={cn(
                          'transition-colors hover:bg-slate-50',
                          isOverdue && 'border-l-2 border-l-[#EF4444]'
                        )}
                      >
                        {visibleColumns.map((c) => (
                          <td
                            key={c.id}
                            className={cn(
                              dataTableCellClass,
                              c.id === 'actions' && 'px-2',
                              c.id === 'status' && 'px-3',
                              ['project', 'client', 'assigned', 'due', 'time'].includes(c.id) && 'text-slate-600'
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

      <NewTaskSlideOver
        open={showNew}
        onClose={() => setShowNew(false)}
        projects={projects}
        teamMembers={teamMembers}
        defaultProjectId={defaultProjectId}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Task"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete Task"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isPending={isPending}
      />
    </div>
  )
}
