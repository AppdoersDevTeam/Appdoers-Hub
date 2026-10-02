-- Website review rounds: team-built review forms (section screenshots) that clients
-- complete through a public token link. Templates are team-editable.

CREATE TABLE IF NOT EXISTS review_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES team_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES review_templates(id) ON DELETE CASCADE,
  page_name TEXT NOT NULL,
  section_name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'section' CHECK (kind IN ('section', 'content_request')),
  team_note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS review_template_items_template_idx ON review_template_items (template_id, sort_order);

CREATE TABLE IF NOT EXISTS website_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  template_id UUID REFERENCES review_templates(id) ON DELETE SET NULL,
  round_number INTEGER NOT NULL CHECK (round_number >= 1),
  title TEXT NOT NULL,
  staging_url TEXT,
  intro_note TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  share_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'in_progress', 'submitted', 'reopened', 'closed')),
  general_notes TEXT,
  submitted_by_name TEXT,
  owner_id UUID REFERENCES team_users(id) ON DELETE SET NULL,
  due_date DATE,
  client_due_date DATE,
  record_file_id UUID REFERENCES files(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  first_opened_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_by UUID REFERENCES team_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, round_number)
);

CREATE INDEX IF NOT EXISTS website_reviews_client_idx ON website_reviews (client_id, round_number DESC);
CREATE INDEX IF NOT EXISTS website_reviews_status_idx ON website_reviews (status);
CREATE INDEX IF NOT EXISTS website_reviews_owner_idx ON website_reviews (owner_id);

CREATE TABLE IF NOT EXISTS website_review_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES website_reviews(id) ON DELETE CASCADE,
  page_name TEXT NOT NULL,
  section_name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'section' CHECK (kind IN ('section', 'content_request')),
  team_note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  screenshot_path TEXT,
  screenshot_mobile_path TEXT,
  previous_screenshot_path TEXT,
  updated_since_last_round BOOLEAN NOT NULL DEFAULT false,
  previous_item_id UUID REFERENCES website_review_items(id) ON DELETE SET NULL,
  client_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (client_status IN ('pending', 'looks_good', 'changes', 'provided')),
  client_comment TEXT,
  pins JSONB NOT NULL DEFAULT '[]'::jsonb,
  client_attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS website_review_items_review_idx ON website_review_items (review_id, sort_order);

ALTER TABLE review_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_review_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_templates_team" ON review_templates;
CREATE POLICY "review_templates_team" ON review_templates FOR ALL USING (is_team_member());
DROP POLICY IF EXISTS "review_template_items_team" ON review_template_items;
CREATE POLICY "review_template_items_team" ON review_template_items FOR ALL USING (is_team_member());
DROP POLICY IF EXISTS "website_reviews_team" ON website_reviews;
CREATE POLICY "website_reviews_team" ON website_reviews FOR ALL USING (is_team_member());
DROP POLICY IF EXISTS "website_review_items_team" ON website_review_items;
CREATE POLICY "website_review_items_team" ON website_review_items FOR ALL USING (is_team_member());

-- Feedback-record PDFs live in their own file folder.
ALTER TABLE files DROP CONSTRAINT IF EXISTS files_folder_check;
ALTER TABLE files ADD CONSTRAINT files_folder_check
  CHECK (folder IN ('briefs','proposals','contracts','assets','deliverables','invoices','misc','website_reviews'));

-- Paid add-on offered when a client goes past the included feedback rounds.
INSERT INTO service_catalog (name, description, type, plan_key, setup_fee, monthly_fee, is_active, sort_order)
SELECT 'Extra feedback round', 'Additional website review round beyond the 3 included rounds.', 'addon', 'extra_feedback_round', 0, 0, true, 900
WHERE NOT EXISTS (SELECT 1 FROM service_catalog WHERE plan_key = 'extra_feedback_round');

-- Seed the Church website template (based on the standard Appdoers church build).
DO $$
DECLARE
  tpl UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM review_templates WHERE name = 'Church website') THEN
    RETURN;
  END IF;

  INSERT INTO review_templates (name, description, is_default)
  VALUES ('Church website', 'Standard Appdoers church site: home, about, sermons, events, ministries, I''m new, prayer, giving, contact.', true)
  RETURNING id INTO tpl;

  INSERT INTO review_template_items (template_id, page_name, section_name, kind, team_note, sort_order) VALUES
    (tpl, 'Home', 'Top banner', 'section', 'Is the church name, photo and welcome line right?', 10),
    (tpl, 'Home', 'Service times', 'section', 'Please check your Sunday service time and address.', 20),
    (tpl, 'Home', 'Life at the church', 'section', NULL, 30),
    (tpl, 'Home', 'Upcoming events', 'section', NULL, 40),
    (tpl, 'Home', 'Our vision', 'section', NULL, 50),
    (tpl, 'Home', 'Discover our heart', 'section', NULL, 60),
    (tpl, 'Home', 'Visiting us', 'section', NULL, 70),
    (tpl, 'Home', 'We support you', 'section', NULL, 80),
    (tpl, 'Home', 'Giving banner', 'section', NULL, 90),
    (tpl, 'About', 'Our DNA', 'section', NULL, 100),
    (tpl, 'About', 'Our story / established', 'section', NULL, 110),
    (tpl, 'About', 'Our vision', 'section', NULL, 120),
    (tpl, 'About', 'What we believe', 'section', 'Please check this matches your statement of faith.', 130),
    (tpl, 'About', 'Our history', 'section', NULL, 140),
    (tpl, 'About', 'Leadership', 'section', 'Are the names, roles and photos correct?', 150),
    (tpl, 'About', 'Leadership photos and bios', 'content_request', 'Please upload a photo and a short bio for each leader.', 160),
    (tpl, 'Sermons', 'Sermons header', 'section', NULL, 170),
    (tpl, 'Sermons', 'Watch & listen', 'section', 'Is this the right YouTube / podcast channel?', 180),
    (tpl, 'Events', 'Calendar', 'section', NULL, 190),
    (tpl, 'Events', 'Event highlights', 'section', NULL, 200),
    (tpl, 'Events', 'Events list', 'section', NULL, 210),
    (tpl, 'Ministries', 'Ministries overview', 'section', NULL, 220),
    (tpl, 'Ministries', 'Sunday service', 'section', NULL, 230),
    (tpl, 'Ministries', 'Ministry photos and descriptions', 'content_request', 'Please upload a photo and a few sentences for each ministry.', 240),
    (tpl, 'I''m New', 'Welcome', 'section', NULL, 250),
    (tpl, 'I''m New', 'We''re glad you''re here', 'section', NULL, 260),
    (tpl, 'I''m New', 'Welcome pack', 'section', NULL, 270),
    (tpl, 'I''m New', 'Frequently asked questions', 'section', 'Add or change any questions newcomers often ask.', 280),
    (tpl, 'Prayer', 'Prayer request', 'section', 'Who should prayer requests be emailed to?', 290),
    (tpl, 'Giving', 'Giving details', 'section', 'Please double-check the bank account and reference details.', 300),
    (tpl, 'Contact', 'Connect', 'section', 'Are the phone, email and address correct?', 310),
    (tpl, 'Contact', 'Get in touch form', 'section', 'Who should contact form messages go to?', 320),
    (tpl, 'Member area', 'Member login', 'section', NULL, 330),
    (tpl, 'Footer', 'Footer', 'section', 'Check the address, service times and links.', 340);
END $$;
