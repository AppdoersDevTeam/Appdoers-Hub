-- Per-client Slack channel created from the Hub client page

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS slack_channel_id TEXT,
  ADD COLUMN IF NOT EXISTS slack_channel_name TEXT,
  ADD COLUMN IF NOT EXISTS slack_canvas_id TEXT;
