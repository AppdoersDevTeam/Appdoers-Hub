-- Mark the Appdoers company record as internal so Hub work stays
-- available on the Clients list without inflating client statistics.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;

UPDATE clients
SET is_internal = true
WHERE lower(trim(company_name)) IN ('appdoers', 'appdoers limited');

CREATE INDEX IF NOT EXISTS clients_is_internal_idx
  ON clients (is_internal)
  WHERE is_internal = true;
