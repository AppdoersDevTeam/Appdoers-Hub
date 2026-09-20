-- Internal library for documents, templates, and workflows (team-only).

CREATE TABLE IF NOT EXISTS hub_library_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('document', 'template', 'workflow')),
  title TEXT NOT NULL,
  summary TEXT,
  body TEXT NOT NULL DEFAULT '',
  link_url TEXT,
  created_by UUID REFERENCES team_users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES team_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hub_library_items_kind_idx
  ON hub_library_items (kind);

CREATE INDEX IF NOT EXISTS hub_library_items_updated_at_idx
  ON hub_library_items (updated_at DESC);

ALTER TABLE hub_library_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hub_library_items_team" ON hub_library_items;
CREATE POLICY "hub_library_items_team" ON hub_library_items
  FOR ALL USING (is_team_member());
