-- Tie each typed Supabase project name to a Hub client.

CREATE TABLE IF NOT EXISTS supabase_account_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES supabase_accounts(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS supabase_account_projects_account_id_idx
  ON supabase_account_projects (account_id);

CREATE INDEX IF NOT EXISTS supabase_account_projects_client_id_idx
  ON supabase_account_projects (client_id);

ALTER TABLE supabase_account_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supabase_account_projects_team" ON supabase_account_projects;
CREATE POLICY "supabase_account_projects_team" ON supabase_account_projects FOR ALL USING (is_team_member());

INSERT INTO supabase_account_projects (account_id, project_name)
SELECT a.id, trim(n)
FROM supabase_accounts a
CROSS JOIN LATERAL unnest(COALESCE(a.project_names, '{}'::text[])) AS n
WHERE trim(n) <> '';

ALTER TABLE supabase_accounts DROP COLUMN IF EXISTS project_names;
