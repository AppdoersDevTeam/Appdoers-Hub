-- Allow proposals to be attached to a client, a lead, or both.

ALTER TABLE proposals
  ALTER COLUMN client_id DROP NOT NULL;

ALTER TABLE proposals
  DROP CONSTRAINT IF EXISTS proposals_client_or_lead_check;

ALTER TABLE proposals
  ADD CONSTRAINT proposals_client_or_lead_check
  CHECK (client_id IS NOT NULL OR lead_id IS NOT NULL);
