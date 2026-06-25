-- Per-task cumulative time spent (editable, rolls up to project totals)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS time_spent DECIMAL(8,2) NOT NULL DEFAULT 0 CHECK (time_spent >= 0);

-- Backfill from existing time entries
UPDATE tasks t
SET time_spent = COALESCE((
  SELECT ROUND(SUM(te.hours)::numeric, 2)
  FROM time_entries te
  WHERE te.task_id = t.id
), 0);
