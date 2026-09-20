'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NewProjectSlideOver } from './new-project-slide-over'
import { deleteProjectAction } from '@/lib/actions/projects'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { SortableTh } from '@/components/ui/sortable-th'
import { formatDate } from '@/lib/utils/format'
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

  const selectClass =
    'rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none'

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects…" className="pl-9" />
        </div>
        <select className={selectClass} value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)}>
          <option value="all">All Phases</option>
          {Object.entries(phaseLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className={selectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> New Project
        </Button>
      </div>

      <div className="hub-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <SortableTh label="Project" column="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Client" column="client" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Type" column="type" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Phase" column="phase" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Client Status" column="clientStatus" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Launch Date" column="launch" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Hours" column="hours" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Status" column="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    {projects.length === 0 ? 'No projects yet. Create your first project.' : 'No projects match your filters.'}
                  </td>
                </tr>
              ) : (
                sorted.map((p) => {
                  const cs = clientStatusConfig[p.client_status] ?? clientStatusConfig.new
                  const ps = projectStatusConfig[p.status] ?? projectStatusConfig.active
                  const hoursDisplay = p.estimated_hours
                    ? `${p.logged_hours.toFixed(1)} / ${p.estimated_hours}h`
                    : `${p.logged_hours.toFixed(1)}h`
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <Link href={`/app/projects/${p.id}`} className="hover:text-blue-600 transition-colors">{p.name}</Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.client_name}</td>
                      <td className="px-4 py-3 capitalize text-slate-600">{p.type}</td>
                      <td className="px-4 py-3 text-slate-600">{phaseLabels[p.current_phase] ?? p.current_phase}</td>
                      <td className="px-4 py-3">
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', cs.cls)}>{cs.label}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.target_launch_date ? formatDate(p.target_launch_date) : '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{hoursDisplay}</td>
                      <td className="px-4 py-3">
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', ps.cls)}>{ps.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDeleteTarget(p)}
                          disabled={isPending}
                          className="rounded p-1 text-slate-500 hover:text-red-600 transition-colors"
                          title="Delete project"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
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
