-- Cursor workflow support for external agent automation
CREATE TABLE IF NOT EXISTS cursor_api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  team_user_id UUID NOT NULL REFERENCES team_users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES team_users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS workflow_stage TEXT NOT NULL DEFAULT 'pm'
  CHECK (workflow_stage IN ('pm','designer','developer','qa','reviewer','done'));

ALTER TABLE cursor_api_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cursor_tokens_director_manage"
  ON cursor_api_tokens
  FOR ALL
  USING (is_director())
  WITH CHECK (is_director());
