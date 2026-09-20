-- Nested Supabase logins under an agency subscription, each linked to Hub projects.

CREATE TABLE IF NOT EXISTS supabase_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES agency_subscriptions(id) ON DELETE CASCADE,
  login_email TEXT NOT NULL,
  project_slot_limit INTEGER NOT NULL DEFAULT 2 CHECK (project_slot_limit >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS supabase_accounts_subscription_email_lower
  ON supabase_accounts (subscription_id, lower(login_email));

CREATE INDEX IF NOT EXISTS supabase_accounts_subscription_id_idx
  ON supabase_accounts (subscription_id);

CREATE TABLE IF NOT EXISTS supabase_account_projects (
  account_id UUID NOT NULL REFERENCES supabase_accounts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, project_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS supabase_account_projects_project_id_key
  ON supabase_account_projects (project_id);

ALTER TABLE supabase_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supabase_account_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supabase_accounts_team" ON supabase_accounts;
CREATE POLICY "supabase_accounts_team" ON supabase_accounts FOR ALL USING (is_team_member());

DROP POLICY IF EXISTS "supabase_account_projects_team" ON supabase_account_projects;
CREATE POLICY "supabase_account_projects_team" ON supabase_account_projects FOR ALL USING (is_team_member());
