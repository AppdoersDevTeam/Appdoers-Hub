-- Mark each agency tool as company-wide (null) or assigned to one client.

ALTER TABLE agency_subscriptions
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS agency_subscriptions_client_id_idx
  ON agency_subscriptions (client_id);
