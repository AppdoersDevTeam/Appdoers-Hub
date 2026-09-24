-- Restrict settings SELECT so Slack webhook URLs are director-only.
-- Team members can still read company / outbound_links for the dashboard.
DROP POLICY IF EXISTS "settings_team_read" ON settings;

CREATE POLICY "settings_team_read_non_secret"
  ON settings
  FOR SELECT
  USING (
    is_team_member()
    AND key <> 'slack_channels'
  );

-- In-app notifications for assign / mention / signed / overdue.
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_user_id UUID NOT NULL REFERENCES team_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  entity_type TEXT,
  entity_id UUID,
  href TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications (team_user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON notifications (team_user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_own_select"
  ON notifications FOR SELECT
  USING (auth.uid() = team_user_id AND is_team_member());

CREATE POLICY "notifications_own_update"
  ON notifications FOR UPDATE
  USING (auth.uid() = team_user_id AND is_team_member())
  WITH CHECK (auth.uid() = team_user_id AND is_team_member());
