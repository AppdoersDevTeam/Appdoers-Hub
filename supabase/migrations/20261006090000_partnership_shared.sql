-- Sara & Fabiano partnership flag. True = revenue/cost is shared 50/50;
-- false = Fabiano-only, excluded from the partnership profit split.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS is_partnership BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE agency_subscriptions
  ADD COLUMN IF NOT EXISTS is_partnership BOOLEAN NOT NULL DEFAULT TRUE;
