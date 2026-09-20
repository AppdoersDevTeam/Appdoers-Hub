-- Period analytics need a close/outcome timestamp that does not move when the row is later edited.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

UPDATE tasks
SET closed_at = updated_at
WHERE status = 'closed'
  AND closed_at IS NULL;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS outcome_at TIMESTAMPTZ;

UPDATE leads
SET outcome_at = updated_at
WHERE status IN ('won', 'lost')
  AND outcome_at IS NULL;

CREATE INDEX IF NOT EXISTS tasks_closed_at_idx ON tasks (closed_at)
  WHERE closed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS leads_outcome_at_idx ON leads (outcome_at)
  WHERE outcome_at IS NOT NULL;
