import { createHash } from 'crypto'

export const CURSOR_STAGES = [
  'pm',
  'designer',
  'developer',
  'qa',
  'reviewer',
  'done',
] as const

export type CursorStage = (typeof CURSOR_STAGES)[number]

export function hashApiToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function stageToTaskStatus(stage: CursorStage) {
  if (stage === 'developer') return 'in_progress'
  if (stage === 'qa' || stage === 'reviewer') return 'awaiting_review'
  if (stage === 'done') return 'closed'
  return 'open'
}

export function statusToWorkflowStage(
  status: 'open' | 'in_progress' | 'awaiting_review' | 'closed',
  currentStage?: CursorStage | null
): CursorStage {
  if (status === 'closed') return 'done'
  if (status === 'in_progress') return 'developer'
  if (status === 'awaiting_review') {
    if (currentStage === 'reviewer' || currentStage === 'qa') return currentStage
    return 'qa'
  }
  if (currentStage === 'designer' || currentStage === 'pm') return currentStage
  return 'pm'
}
