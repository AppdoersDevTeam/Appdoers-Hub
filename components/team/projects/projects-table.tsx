'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NewProjectSlideOver } from './new-project-slide-over'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

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
  new: { label: 'New', cls: 'bg-[#94A3B8]/10 text-[#94A3B8]' },
  in_progress: { label: 'In Progress', cls: 'bg-[#3B82F6]/10 text-[#3B82F6]' },
  awaiting_appdoers: { label: 'Awaiting Us', cls: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
  awaiting_client: { label: 'Awaiting Client', cls: 'bg-[#F97316]/10 text-[#F97316]' },
  completed: { label: 'Completed', cls: 'bg-[#10B981]/10 text-[#10B981]' },
  on_hold: { label: 'On Hold', cls: 'bg-[#EF4444]/10 text-[#EF4444]' },
}

const projectStatusConfig: Record<string, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'bg-[#10B981]/10 text-[#10B981]' },
  on_hold: { label: 'On Hold', cls: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
  completed: { label: 'Completed', cls: 'bg-[#94A3B8]/10 text-[#94A3B8]' },
  cancelled: { label: 'Cancelled', cls: 'bg-[#EF4444]/10 text-[#EF4444]' },
}

interface Props {
  projects: ProjectRow[]
  clients: { id: string; company_name: string }[]
}

export function ProjectsTable({ projects, clients }: Props) {
  const [search, setSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showNew, setShowNew] = useState(false)

  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client_name.toLowerCase().includes(search.toLowerCase())
    const matchPhase = phaseFilter === 'all' || p.current_phase === phaseFilter
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchPhase && matchStatus
  })

  const selectClass =
    'rounded-md border border-[#1F2D45] bg-[#111827] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#3B82F6] focus:outline-none'

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#475569]" />
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
              <tr className="border-b border-[#1F2D45]">
                {['Project', 'Client', 'Type', 'Phase', 'Client Status', 'Launch Date', 'Hours', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#475569]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2D45]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[#475569]">
                    {projects.length === 0 ? 'No projects yet. Create your first project.' : 'No projects match your filters.'}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const cs = clientStatusConfig[p.client_status] ?? clientStatusConfig.new
                  const ps = projectStatusConfig[p.status] ?? projectStatusConfig.active
                  const hoursDisplay = p.estimated_hours
                    ? `${p.logged_hours.toFixed(1)} / ${p.estimated_hours}h`
                    : `${p.logged_hours.toFixed(1)}h`
                  return (
                    <tr key={p.id} className="hover:bg-[#1C2537] transition-colors">
                      <td className="px-4 py-3 font-medium text-[#F1F5F9]">
                        <Link href={`/app/projects/${p.id}`} className="hover:text-[#3B82F6] transition-colors">{p.name}</Link>
                      </td>
                      <td className="px-4 py-3 text-[#CBD5E1]">{p.client_name}</td>
                      <td className="px-4 py-3 capitalize text-[#CBD5E1]">{p.type}</td>
                      <td className="px-4 py-3 text-[#CBD5E1]">{phaseLabels[p.current_phase] ?? p.current_phase}</td>
                      <td className="px-4 py-3">
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', cs.cls)}>{cs.label}</span>
                      </td>
                      <td className="px-4 py-3 text-[#CBD5E1]">{p.target_launch_date ? formatDate(p.target_launch_date) : '—'}</td>
                      <td className="px-4 py-3 text-[#CBD5E1]">{hoursDisplay}</td>
                      <td className="px-4 py-3">
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', ps.cls)}>{ps.label}</span>
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
    </>
  )
}
