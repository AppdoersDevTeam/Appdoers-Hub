'use client'

import { useState, useTransition } from 'react'
import { ChevronRight, CheckCircle, Clock, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { advancePhaseAction, updatePhaseAction } from '@/lib/actions/projects'
import { cn } from '@/lib/utils/cn'
import type { ProjectPhase, TeamUser } from '@/lib/types/database'

interface Phase {
  id: string
  phase: ProjectPhase
  status: string
  assigned_to: string | null
  estimated_hours: number | null
  start_date: string | null
  end_date: string | null
  notes: string | null
}

interface Props {
  projectId: string
  currentPhase: ProjectPhase
  phases: Phase[]
  teamMembers: Pick<TeamUser, 'id' | 'full_name'>[]
}

const PHASE_ORDER: ProjectPhase[] = [
  'discovery', 'design', 'development', 'review_qa', 'launch', 'maintenance',
]

const phaseLabel: Record<ProjectPhase, string> = {
  discovery: 'Discovery',
  design: 'Design',
  development: 'Development',
  review_qa: 'Review & QA',
  launch: 'Launch',
  maintenance: 'Maintenance',
}

const labelClass = 'block text-xs font-medium text-[#94A3B8] mb-1'
const selectClass = 'w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#3B82F6] focus:outline-none'

export function PhasesTab({ projectId, currentPhase, phases, teamMembers }: Props) {
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const phaseMap = Object.fromEntries(phases.map((p) => [p.phase, p]))

  const [editForm, setEditForm] = useState({
    status: 'pending' as 'pending' | 'in_progress' | 'completed',
    assigned_to: '',
    estimated_hours: '',
    start_date: '',
    end_date: '',
    notes: '',
  })

  const openEdit = (phase: Phase) => {
    setEditingId(phase.id)
    setEditForm({
      status: phase.status as 'pending' | 'in_progress' | 'completed',
      assigned_to: phase.assigned_to ?? '',
      estimated_hours: phase.estimated_hours ? String(phase.estimated_hours) : '',
      start_date: phase.start_date ?? '',
      end_date: phase.end_date ?? '',
      notes: phase.notes ?? '',
    })
  }

  const saveEdit = (phaseId: string) => {
    startTransition(async () => {
      const result = await updatePhaseAction(phaseId, projectId, {
        status: editForm.status,
        assigned_to: editForm.assigned_to || null,
        estimated_hours: parseFloat(editForm.estimated_hours) || null,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
        notes: editForm.notes || null,
      })
      if (!result.success) { setError(result.error); return }
      setEditingId(null)
    })
  }

  const advance = () => {
    setError(null)
    startTransition(async () => {
      const result = await advancePhaseAction(projectId, currentPhase)
      if (!result.success) setError(result.error)
    })
  }

  const isLastPhase = currentPhase === 'maintenance'

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-[#EF4444]/20 bg-[#EF4444]/10 px-4 py-2 text-sm text-[#EF4444]">
          {error}
        </div>
      )}

      {/* Advance button */}
      {!isLastPhase && (
        <div className="flex items-center justify-between rounded-lg border border-[#3B82F6]/20 bg-[#3B82F6]/5 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[#F1F5F9]">
              Current phase: <span className="text-[#3B82F6]">{phaseLabel[currentPhase]}</span>
            </p>
            <p className="text-xs text-[#94A3B8]">
              Next: {phaseLabel[PHASE_ORDER[PHASE_ORDER.indexOf(currentPhase) + 1]]}
            </p>
          </div>
          <Button onClick={advance} disabled={isPending}>
            Advance Phase <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Phase list */}
      <div className="space-y-2">
        {PHASE_ORDER.map((phaseName, idx) => {
          const phase = phaseMap[phaseName]
          const isActive = phaseName === currentPhase
          const isDone = PHASE_ORDER.indexOf(phaseName) < PHASE_ORDER.indexOf(currentPhase)
          const isEditing = editingId === phase?.id

          return (
            <div
              key={phaseName}
              className={cn(
                'rounded-lg border p-4 transition-colors',
                isActive
                  ? 'border-[#3B82F6]/40 bg-[#3B82F6]/5'
                  : isDone
                  ? 'border-[#10B981]/20 bg-[#10B981]/5'
                  : 'border-[#1F2D45] bg-[#111827]'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {isDone ? (
                      <CheckCircle className="h-5 w-5 text-[#10B981]" />
                    ) : isActive ? (
                      <Clock className="h-5 w-5 text-[#3B82F6]" />
                    ) : (
                      <Circle className="h-5 w-5 text-[#475569]" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#475569]">
                        {idx + 1}.
                      </span>
                      <span className={cn('text-sm font-semibold',
                        isActive ? 'text-[#3B82F6]' : isDone ? 'text-[#10B981]' : 'text-[#F1F5F9]'
                      )}>
                        {phaseLabel[phaseName]}
                      </span>
                      {isActive && (
                        <span className="rounded-full bg-[#3B82F6] px-2 py-0.5 text-xs font-medium text-white">
                          Active
                        </span>
                      )}
                    </div>
                    {phase && !isEditing && (
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#475569]">
                        {phase.assigned_to && (
                          <span>
                            Assigned: {teamMembers.find(m => m.id === phase.assigned_to)?.full_name ?? '—'}
                          </span>
                        )}
                        {phase.estimated_hours && <span>{phase.estimated_hours}h estimated</span>}
                        {phase.start_date && <span>Start: {phase.start_date}</span>}
                        {phase.end_date && <span>End: {phase.end_date}</span>}
                        {phase.notes && (
                          <span className="text-[#94A3B8] italic">{phase.notes}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {phase && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => isEditing ? setEditingId(null) : openEdit(phase)}
                  >
                    {isEditing ? 'Cancel' : 'Edit'}
                  </Button>
                )}
              </div>

              {/* Edit form */}
              {isEditing && phase && (
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#1F2D45] pt-4">
                  <div>
                    <label className={labelClass}>Status</label>
                    <select
                      className={selectClass}
                      value={editForm.status}
                      onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value as 'pending' | 'in_progress' | 'completed' }))}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Assigned To</label>
                    <select
                      className={selectClass}
                      value={editForm.assigned_to}
                      onChange={(e) => setEditForm(f => ({ ...f, assigned_to: e.target.value }))}
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Est. Hours</label>
                    <Input
                      type="number"
                      value={editForm.estimated_hours}
                      onChange={(e) => setEditForm(f => ({ ...f, estimated_hours: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Start Date</label>
                    <Input
                      type="date"
                      value={editForm.start_date}
                      onChange={(e) => setEditForm(f => ({ ...f, start_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>End Date</label>
                    <Input
                      type="date"
                      value={editForm.end_date}
                      onChange={(e) => setEditForm(f => ({ ...f, end_date: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Notes</label>
                    <textarea
                      className="w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#475569] focus:border-[#3B82F6] focus:outline-none resize-none"
                      rows={2}
                      value={editForm.notes}
                      onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(phase.id)} disabled={isPending}>
                      {isPending ? 'Saving…' : 'Save'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
