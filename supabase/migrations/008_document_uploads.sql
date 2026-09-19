-- Track proposals and contracts as uploaded PDF/DOC files instead of in-app builders.

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS file_size INTEGER,
  ADD COLUMN IF NOT EXISTS is_client_visible BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS file_size INTEGER,
  ADD COLUMN IF NOT EXISTS is_client_visible BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_proposals_client_visible
  ON proposals (client_id, is_client_visible);

CREATE INDEX IF NOT EXISTS idx_contracts_client_visible
  ON contracts (client_id, is_client_visible);

DROP POLICY IF EXISTS "proposals_portal" ON proposals;
CREATE POLICY "proposals_portal" ON proposals FOR SELECT USING (
  client_id = portal_client_id()
  AND is_client_visible = true
  AND status IN ('sent','approved','declined','expired')
);

DROP POLICY IF EXISTS "contracts_portal_read" ON contracts;
CREATE POLICY "contracts_portal_read" ON contracts FOR SELECT USING (
  client_id = portal_client_id()
  AND is_client_visible = true
  AND status IN ('sent','signed')
);
