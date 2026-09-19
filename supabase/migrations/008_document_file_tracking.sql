-- Track uploaded proposal/contract documents instead of generating them in-app.
-- Invoices remain in the database but are no longer used by the product (Stripe).

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS file_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_size INTEGER,
  ADD COLUMN IF NOT EXISTS file_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS is_client_visible BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS file_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_size INTEGER,
  ADD COLUMN IF NOT EXISTS file_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS is_client_visible BOOLEAN NOT NULL DEFAULT false;

-- Existing sent/approved documents should remain visible in the client portal.
UPDATE proposals
SET is_client_visible = true
WHERE status IN ('sent', 'approved', 'declined', 'expired');

UPDATE contracts
SET is_client_visible = true
WHERE status IN ('sent', 'signed');

-- Portal reads uploaded files that the team has shared, not generated drafts.
DROP POLICY IF EXISTS "proposals_portal" ON proposals;
CREATE POLICY "proposals_portal" ON proposals FOR SELECT USING (
  client_id = portal_client_id() AND is_client_visible = true
);

DROP POLICY IF EXISTS "contracts_portal_read" ON contracts;
CREATE POLICY "contracts_portal_read" ON contracts FOR SELECT USING (
  client_id = portal_client_id() AND is_client_visible = true
);

-- In-app signing is no longer used; contracts are uploaded documents.
DROP POLICY IF EXISTS "contracts_portal_sign" ON contracts;
