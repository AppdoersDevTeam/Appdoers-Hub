-- Store typed Supabase project names on each login instead of Hub project IDs.

ALTER TABLE supabase_accounts
  ADD COLUMN IF NOT EXISTS project_names TEXT[] NOT NULL DEFAULT '{}';

DROP TABLE IF EXISTS supabase_account_projects;
