-- Client plan variant + add-on services

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS contract_months INTEGER,
  ADD COLUMN IF NOT EXISTS setup_upfront DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_service_id UUID REFERENCES service_catalog(id);

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_contract_months_check;
ALTER TABLE clients ADD CONSTRAINT clients_contract_months_check
  CHECK (contract_months IS NULL OR contract_months IN (12, 24, 48));

CREATE TABLE IF NOT EXISTS client_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_catalog_id UUID NOT NULL REFERENCES service_catalog(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  monthly_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  setup_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, service_catalog_id)
);

CREATE INDEX IF NOT EXISTS client_services_client_id_idx ON client_services(client_id);

ALTER TABLE client_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_services_team" ON client_services FOR ALL USING (is_team_member());
