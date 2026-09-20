-- Track which subscription/domain renewal Slack reminders have already been sent.

CREATE TABLE IF NOT EXISTS renewal_alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL CHECK (item_type IN ('subscription', 'domain')),
  item_id UUID NOT NULL,
  milestone TEXT NOT NULL CHECK (milestone IN ('month', 'week', 'day')),
  due_date DATE NOT NULL,
  sent_on DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_type, item_id, milestone, due_date)
);

CREATE INDEX IF NOT EXISTS renewal_alert_log_item_idx
  ON renewal_alert_log (item_type, item_id);

ALTER TABLE renewal_alert_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "renewal_alert_log_team" ON renewal_alert_log;
CREATE POLICY "renewal_alert_log_team" ON renewal_alert_log FOR ALL USING (is_team_member());
