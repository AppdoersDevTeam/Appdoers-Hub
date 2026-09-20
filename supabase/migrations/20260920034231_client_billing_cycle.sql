-- Recurring client fees can be billed weekly, monthly, or yearly.
-- monthly_fee remains the amount charged per billing cycle.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly';

ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS clients_billing_cycle_check;

ALTER TABLE clients
  ADD CONSTRAINT clients_billing_cycle_check
  CHECK (billing_cycle IN ('weekly', 'monthly', 'yearly'));
