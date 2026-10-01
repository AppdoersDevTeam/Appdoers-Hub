-- Task-level billable flag (source of truth for task-linked time entries),
-- plus recap stats snapshot and email delivery tracking.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_billable BOOLEAN NOT NULL DEFAULT false;

-- Every existing task is non-billable; task-linked time entries inherit their task's flag.
-- Already-invoiced entries keep their flag so past invoices stay consistent.
UPDATE time_entries
SET is_billable = false
WHERE task_id IS NOT NULL
  AND is_invoiced = false
  AND is_billable IS DISTINCT FROM false;

ALTER TABLE monthly_recaps
  ADD COLUMN IF NOT EXISTS stats JSONB,
  ADD COLUMN IF NOT EXISTS sent_to_email TEXT,
  ADD COLUMN IF NOT EXISTS email_message_id TEXT;
