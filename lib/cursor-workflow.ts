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
