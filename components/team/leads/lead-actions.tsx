'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ConvertLeadButton } from './convert-lead-button'
import { LeadDeleteButton } from './lead-delete-button'
import {
  updateLeadStatusAction,
  markLeadLostAction,
  markLeadWonAction,
} from '@/lib/actions/leads'
import type { LeadStatus, LostReason, TeamUser } from '@/lib/types/database'
import {
  ALL_LEAD_STATUSES,
  LEAD_STATUS_FLOW,
  LEAD_STATUS_LABELS,
  PIPELINE_LEAD_STATUSES,
} from '@/lib/leads/constants'
import { cn } from '@/lib/utils/cn'

const LOST_REASONS: { value: LostReason; label: string }[] = [
  { value: 'price', label: 'Price' },
  { value: 'timing', label: 'Timing' },
  { value: 'competitor', label: 'Went with Competitor' },
  { value: 'no_response', label: 'No Response' },
  { value: 'out_of_scope', label: 'Out of Scope' },
  { value: 'other', label: 'Other' },
]

const selectClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none'
const labelClass = 'block text-xs font-medium text-slate-500 mb-1'

interface Props {
  leadId: string
  leadName: string
  currentStatus: LeadStatus
  hasConvertedClient: boolean
  convertedClientId?: string | null
  teamMembers: Pick<TeamUser, 'id' | 'full_name'>[]
}

export function LeadActions({
  leadId,
  leadName,
  currentStatus,
  hasConvertedClient,
  convertedClientId,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showLostForm, setShowLostForm] = useState(false)
  const [lostReason, setLostReason] = useState<LostReason>('other')
  const [lostNotes, setLostNotes] = useState('')

  const nextStep = LEAD_STATUS_FLOW[currentStatus]
  const isOpen = PIPELINE_LEAD_STATUSES.includes(currentStatus)
  const canConvert = !hasConvertedClient && currentStatus !== 'lost'

  const setStatus = (status: LeadStatus) => {
    setError(null)
    startTransition(async () => {
      const result = await updateLeadStatusAction(leadId, status)
      if (!result.success) setError(result.error)
    })
  }

  const markWon = () => {
    setError(null)
    startTransition(async () => {
      const result = await markLeadWonAction(leadId)
      if (!result.success) setError(result.error)
    })
  }

  const markLost = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await markLeadLostAction(leadId, lostReason, lostNotes)
      if (!result.success) {
        setError(result.error)
        return
      }
      setShowLostForm(false)
    })
  }

  return (
    <div className="hub-card space-y-4">
      <h3 className="text-sm font-semibold text-slate-900">Actions</h3>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {isOpen && (
        <div className="space-y-3">
          {nextStep && (
            <Button
              onClick={() => setStatus(nextStep.next)}
              disabled={isPending}
              className="w-full"
            >
              {isPending ? 'Updating…' : nextStep.label}
            </Button>
          )}

          <div>
            <label className={labelClass} htmlFor={`lead-status-${leadId}`}>
              Status
            </label>
            <select
              id={`lead-status-${leadId}`}
              className={selectClass}
              value={currentStatus}
              disabled={isPending}
              onChange={(e) => setStatus(e.target.value as LeadStatus)}
            >
              {ALL_LEAD_STATUSES.filter(
                (status) => status !== 'won' && status !== 'lost'
              ).map((status) => (
                <option key={status} value={status}>
                  {LEAD_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {(canConvert || isOpen || hasConvertedClient || currentStatus === 'lost') && (
        <div className="space-y-3 border-t border-slate-200 pt-4">
          {canConvert && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500">Close deal</p>
              <ConvertLeadButton leadId={leadId} leadName={leadName} fullWidth />
              {isOpen && (
                <button
                  type="button"
                  onClick={markWon}
                  disabled={isPending}
                  className="w-full text-center text-xs text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline disabled:opacity-50"
                >
                  Mark won without converting
                </button>
              )}
            </div>
          )}

          {hasConvertedClient && (
            <p className="text-sm text-emerald-700">
              Converted to client
              {convertedClientId && (
                <>
                  {' · '}
                  <Link
                    href={`/app/clients/${convertedClientId}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    View client
                  </Link>
                </>
              )}
            </p>
          )}

          {currentStatus === 'lost' && (
            <p className="text-sm text-slate-500">This lead is closed as lost.</p>
          )}

          {isOpen && (
            <>
              {!showLostForm ? (
                <Button
                  variant="outline"
                  onClick={() => setShowLostForm(true)}
                  disabled={isPending}
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  Mark as Lost
                </Button>
              ) : (
                <form
                  onSubmit={markLost}
                  className="space-y-3 rounded-lg border border-red-200 bg-red-50/50 p-3"
                >
                  <div>
                    <label className={labelClass}>Lost reason *</label>
                    <select
                      className={selectClass}
                      value={lostReason}
                      onChange={(e) => setLostReason(e.target.value as LostReason)}
                    >
                      {LOST_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Notes (optional)</label>
                    <textarea
                      className={cn(selectClass, 'resize-none')}
                      rows={3}
                      value={lostNotes}
                      onChange={(e) => setLostNotes(e.target.value)}
                      placeholder="Any additional context…"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={isPending}
                      className="flex-1"
                    >
                      Confirm Lost
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowLostForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      )}

      <div className="border-t border-slate-200 pt-4">
        <LeadDeleteButton
          leadId={leadId}
          leadName={leadName}
          fullWidth
          variant="outline"
        />
      </div>
    </div>
  )
}
