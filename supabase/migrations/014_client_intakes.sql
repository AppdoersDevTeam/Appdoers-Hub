-- Client kickoff intake: shareable public form + applied brand kit

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS brand_kit JSONB;

CREATE TABLE IF NOT EXISTS client_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  share_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'submitted', 'updated', 'locked')),
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ,
  last_submitted_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  created_by UUID REFERENCES team_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_intakes_client_id_idx ON client_intakes (client_id);
CREATE INDEX IF NOT EXISTS client_intakes_status_idx ON client_intakes (client_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS client_intakes_one_active
  ON client_intakes (client_id)
  WHERE status <> 'locked';

ALTER TABLE client_intakes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_intakes_team" ON client_intakes;
CREATE POLICY "client_intakes_team" ON client_intakes
  FOR ALL USING (is_team_member());
