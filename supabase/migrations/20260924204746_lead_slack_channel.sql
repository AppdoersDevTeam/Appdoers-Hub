-- Per-lead Slack channel created from the Hub lead page

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS slack_channel_id TEXT,
  ADD COLUMN IF NOT EXISTS slack_channel_name TEXT,
  ADD COLUMN IF NOT EXISTS slack_canvas_id TEXT;
