-- ============================================================
-- Appdoers Hub — Initial Schema
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TEAM USERS
-- ============================================================
CREATE TABLE team_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('director', 'account_manager', 'developer', 'designer')),
  hourly_rate DECIMAL(10,2),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  logo_url TEXT,
  industry TEXT,
  website TEXT,
  location TEXT,
  subscription_plan TEXT DEFAULT 'none' CHECK (subscription_plan IN ('launch','growth','growth_annual','scale','founders_special','community','none')),
  subscription_start_date DATE,
  subscription_end_date DATE,
  monthly_fee DECIMAL(10,2) DEFAULT 0,
  setup_fee DECIMAL(10,2) DEFAULT 0,
  payment_terms INTEGER DEFAULT 14,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','churned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLIENT CONTACTS
-- ============================================================
CREATE TABLE client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT,
  is_primary BOOLEAN DEFAULT false,
  has_portal_access BOOLEAN DEFAULT false,
  portal_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  source TEXT DEFAULT 'word_of_mouth' CHECK (source IN ('word_of_mouth','referral','website','social','cold_outreach','other')),
  referral_name TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','proposal_sent','negotiating','won','lost')),
  estimated_value DECIMAL(10,2),
  estimated_setup_fee DECIMAL(10,2),
  estimated_monthly DECIMAL(10,2),
  assigned_to UUID REFERENCES team_users(id),
  next_action TEXT,
  next_action_date DATE,
  lost_reason TEXT CHECK (lost_reason IN ('price','timing','competitor','no_response','out_of_scope','other')),
  lost_notes TEXT,
  converted_client_id UUID REFERENCES clients(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES team_users(id),
  type TEXT DEFAULT 'general' CHECK (type IN ('general','call','meeting','email','decision','internal')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'web' CHECK (type IN ('web','ecommerce','community','custom')),
  current_phase TEXT DEFAULT 'discovery' CHECK (current_phase IN ('discovery','design','development','review_qa','launch','maintenance')),
  client_status TEXT DEFAULT 'new' CHECK (client_status IN ('new','in_progress','awaiting_appdoers','awaiting_client','completed','on_hold')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','on_hold','completed','cancelled')),
  start_date DATE,
  target_launch_date DATE,
  actual_launch_date DATE,
  estimated_hours DECIMAL(10,2),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('discovery','design','development','review_qa','launch','maintenance')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
  assigned_to UUID REFERENCES team_users(id),
  estimated_hours DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_user_id UUID NOT NULL REFERENCES team_users(id) ON DELETE CASCADE,
  role TEXT,
  UNIQUE(project_id, team_user_id)
);

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'feature' CHECK (type IN ('feature','bug','revision','content','design','admin')),
  priority TEXT DEFAULT 'p2' CHECK (priority IN ('p0','p1','p2','p3')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','awaiting_review','closed')),
  assigned_to UUID REFERENCES team_users(id),
  due_date DATE,
  created_by UUID REFERENCES team_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TIME TRACKING
-- ============================================================
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id),
  team_user_id UUID NOT NULL REFERENCES team_users(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  hours DECIMAL(5,2) NOT NULL,
  description TEXT,
  is_billable BOOLEAN DEFAULT true,
  is_invoiced BOOLEAN DEFAULT false,
  invoice_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SERVICE CATALOG
-- ============================================================
CREATE TABLE service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'plan' CHECK (type IN ('plan','addon')),
  plan_key TEXT,
  setup_fee DECIMAL(10,2) DEFAULT 0,
  monthly_fee DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROPOSALS
-- ============================================================
CREATE TABLE proposal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan_key TEXT,
  description TEXT,
  sections JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id),
  project_id UUID REFERENCES projects(id),
  template_id UUID REFERENCES proposal_templates(id),
  title TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  parent_proposal_id UUID REFERENCES proposals(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','approved','declined','expired')),
  sections JSONB NOT NULL DEFAULT '[]',
  total_setup DECIMAL(10,2) DEFAULT 0,
  total_monthly DECIMAL(10,2) DEFAULT 0,
  sent_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by_name TEXT,
  approved_ip TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES team_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONTRACTS
-- ============================================================
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES proposals(id),
  project_id UUID REFERENCES projects(id),
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','signed','superseded')),
  content JSONB NOT NULL DEFAULT '{}',
  signed_at TIMESTAMPTZ,
  signed_by_name TEXT,
  signed_by_email TEXT,
  signed_ip TEXT,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES team_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE SEQUENCE invoice_number_seq START 1;

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE DEFAULT ('APD-' || LPAD(nextval('invoice_number_seq')::TEXT, 4, '0')),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  type TEXT DEFAULT 'adhoc' CHECK (type IN ('setup','monthly','adhoc')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue','void')),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  subtotal DECIMAL(10,2) DEFAULT 0,
  gst_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  payment_reference TEXT,
  paid_at DATE,
  notes TEXT,
  created_by UUID REFERENCES team_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  time_entry_id UUID REFERENCES time_entries(id),
  sort_order INTEGER DEFAULT 0
);

-- ============================================================
-- FILES
-- ============================================================
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  size INTEGER,
  mime_type TEXT,
  folder TEXT DEFAULT 'misc' CHECK (folder IN ('briefs','proposals','contracts','assets','deliverables','invoices','misc')),
  is_client_visible BOOLEAN DEFAULT false,
  uploaded_by UUID REFERENCES team_users(id),
  uploaded_by_client_contact_id UUID REFERENCES client_contacts(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTES + ACTIVITY LOG
-- ============================================================
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('client','lead','project','invoice','proposal')),
  entity_id UUID NOT NULL,
  author_id UUID NOT NULL REFERENCES team_users(id),
  type TEXT DEFAULT 'general' CHECK (type IN ('general','call','meeting','email','decision','internal')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  client_id UUID REFERENCES clients(id),
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  performed_by UUID REFERENCES team_users(id),
  performed_by_client_contact_id UUID REFERENCES client_contacts(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOMAIN & HOSTING TRACKER
-- ============================================================
CREATE TABLE client_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  domain_name TEXT NOT NULL,
  registrar TEXT,
  expiry_date DATE,
  auto_renew BOOLEAN DEFAULT true,
  hosting_provider TEXT,
  vercel_project_name TEXT,
  ssl_status TEXT DEFAULT 'active' CHECK (ssl_status IN ('active','expiring','expired','none')),
  tech_stack JSONB DEFAULT '[]',
  dns_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CREDENTIALS VAULT
-- ============================================================
CREATE TABLE client_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  username TEXT,
  password_encrypted TEXT,
  url TEXT,
  notes TEXT,
  created_by UUID REFERENCES team_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MONTHLY RECAPS
-- ============================================================
CREATE TABLE monthly_recaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  intro_text TEXT,
  work_completed JSONB DEFAULT '[]',
  performance_notes TEXT,
  coming_next TEXT,
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  sent_by UUID REFERENCES team_users(id),
  created_by UUID REFERENCES team_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, project_id, month, year)
);

-- ============================================================
-- SLACK NOTIFICATIONS LOG
-- ============================================================
CREATE TABLE slack_notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SETTINGS
-- ============================================================
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE team_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_recaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_notifications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is a team member
CREATE OR REPLACE FUNCTION is_team_member()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_users WHERE id = auth.uid() AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: check if user is a director
CREATE OR REPLACE FUNCTION is_director()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_users WHERE id = auth.uid() AND role = 'director' AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: get client_id for a portal user
CREATE OR REPLACE FUNCTION portal_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM client_contacts WHERE portal_user_id = auth.uid() AND has_portal_access = true LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: check if user is a portal user
CREATE OR REPLACE FUNCTION is_portal_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM client_contacts WHERE portal_user_id = auth.uid() AND has_portal_access = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Team users: team members can read all, directors can write
CREATE POLICY "team_users_read" ON team_users FOR SELECT USING (is_team_member());
CREATE POLICY "team_users_insert" ON team_users FOR INSERT WITH CHECK (is_director());
CREATE POLICY "team_users_update" ON team_users FOR UPDATE USING (is_director() OR auth.uid() = id);

-- Clients: team members can read/write
CREATE POLICY "clients_team_all" ON clients FOR ALL USING (is_team_member());
-- Portal users can only see their own client
CREATE POLICY "clients_portal_read" ON clients FOR SELECT USING (id = portal_client_id());

-- Client contacts: team members full access; portal users see their own client's contacts
CREATE POLICY "client_contacts_team" ON client_contacts FOR ALL USING (is_team_member());
CREATE POLICY "client_contacts_portal" ON client_contacts FOR SELECT USING (client_id = portal_client_id());

-- Leads: team only
CREATE POLICY "leads_team" ON leads FOR ALL USING (is_team_member());
CREATE POLICY "lead_notes_team" ON lead_notes FOR ALL USING (is_team_member());

-- Projects: team full; portal sees own client's projects
CREATE POLICY "projects_team" ON projects FOR ALL USING (is_team_member());
CREATE POLICY "projects_portal" ON projects FOR SELECT USING (client_id = portal_client_id());
CREATE POLICY "project_phases_team" ON project_phases FOR ALL USING (is_team_member());
CREATE POLICY "project_members_team" ON project_members FOR ALL USING (is_team_member());

-- Tasks: team only (never shown to portal)
CREATE POLICY "tasks_team" ON tasks FOR ALL USING (is_team_member());

-- Time entries: team only
CREATE POLICY "time_entries_team" ON time_entries FOR ALL USING (is_team_member());

-- Service catalog: team read; directors write
CREATE POLICY "service_catalog_team_read" ON service_catalog FOR SELECT USING (is_team_member());
CREATE POLICY "service_catalog_director_write" ON service_catalog FOR INSERT WITH CHECK (is_director());
CREATE POLICY "service_catalog_director_update" ON service_catalog FOR UPDATE USING (is_director());
CREATE POLICY "service_catalog_director_delete" ON service_catalog FOR DELETE USING (is_director());

-- Proposal templates: team read; directors write
CREATE POLICY "proposal_templates_team_read" ON proposal_templates FOR SELECT USING (is_team_member());
CREATE POLICY "proposal_templates_director_write" ON proposal_templates FOR ALL USING (is_director());

-- Proposals: team full; portal sees own client's sent/approved/declined
CREATE POLICY "proposals_team" ON proposals FOR ALL USING (is_team_member());
CREATE POLICY "proposals_portal" ON proposals FOR SELECT USING (
  client_id = portal_client_id() AND status IN ('sent','approved','declined','expired')
);

-- Contracts: team full; portal sees own client's sent/signed
CREATE POLICY "contracts_team" ON contracts FOR ALL USING (is_team_member());
CREATE POLICY "contracts_portal_read" ON contracts FOR SELECT USING (
  client_id = portal_client_id() AND status IN ('sent','signed')
);
-- Portal can update to sign a contract
CREATE POLICY "contracts_portal_sign" ON contracts FOR UPDATE USING (
  client_id = portal_client_id() AND status = 'sent'
);

-- Invoices: team full; portal sees own (not draft or void)
CREATE POLICY "invoices_team" ON invoices FOR ALL USING (is_team_member());
CREATE POLICY "invoices_portal" ON invoices FOR SELECT USING (
  client_id = portal_client_id() AND status NOT IN ('draft','void')
);
CREATE POLICY "invoice_items_team" ON invoice_items FOR ALL USING (is_team_member());
CREATE POLICY "invoice_items_portal" ON invoice_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM invoices WHERE id = invoice_id AND client_id = portal_client_id() AND status NOT IN ('draft','void'))
);

-- Files: team full; portal sees client-visible files for own client
CREATE POLICY "files_team" ON files FOR ALL USING (is_team_member());
CREATE POLICY "files_portal_read" ON files FOR SELECT USING (
  client_id = portal_client_id() AND is_client_visible = true
);
-- Portal can insert files (their own uploads)
CREATE POLICY "files_portal_insert" ON files FOR INSERT WITH CHECK (
  client_id = portal_client_id()
);

-- Notes: team only — never accessible to portal
CREATE POLICY "notes_team" ON notes FOR ALL USING (is_team_member());

-- Activity log: team full; portal sees own client's entries
CREATE POLICY "activity_log_team" ON activity_log FOR ALL USING (is_team_member());

-- Domains: team only
CREATE POLICY "client_domains_team" ON client_domains FOR ALL USING (is_team_member());

-- Credentials: directors only
CREATE POLICY "credentials_director" ON client_credentials FOR ALL USING (is_director());

-- Monthly recaps: team full; portal sees sent recaps for own client
CREATE POLICY "monthly_recaps_team" ON monthly_recaps FOR ALL USING (is_team_member());
CREATE POLICY "monthly_recaps_portal" ON monthly_recaps FOR SELECT USING (
  client_id = portal_client_id() AND is_sent = true
);

-- Slack log: team only
CREATE POLICY "slack_log_team" ON slack_notifications_log FOR ALL USING (is_team_member());

-- Settings: directors only
CREATE POLICY "settings_director" ON settings FOR ALL USING (is_director());
CREATE POLICY "settings_team_read" ON settings FOR SELECT USING (is_team_member());

-- ============================================================
-- SEED DATA
-- ============================================================

-- Default settings
INSERT INTO settings (key, value) VALUES
  ('company', '{"name": "Appdoers", "email": "hello@appdoers.co.nz", "phone": "", "address": "", "website": "https://appdoers.co.nz", "logo_url": ""}'),
  ('billing', '{"gst_rate": 0.15, "default_payment_terms": 14, "invoice_prefix": "APD-", "bank_name": "", "bank_account": "", "bank_reference_prefix": "INV"}'),
  ('slack', '{"webhook_url": "", "enabled": false}');

-- Service catalog — all 5 Appdoers plans
INSERT INTO service_catalog (name, description, type, plan_key, setup_fee, monthly_fee, sort_order) VALUES
  ('The Launch Tier', 'Passive tech management, static architecture, mobile-first design, essential SEO, 72-hour email support', 'plan', 'launch', 599.00, 79.00, 1),
  ('The Growth Tier', 'Everything in Launch + headless CMS, code-locked layouts, monthly analytics, 48-hour priority support', 'plan', 'growth', 599.00, 99.00, 2),
  ('The Growth Tier (12-month)', 'Everything in Growth with discounted setup fee on 12-month commitment', 'plan', 'growth_annual', 299.00, 99.00, 3),
  ('The Scale Tier', 'Everything in Growth + Stripe/Shopify integration, 3D elements, user management, 24-hour VIP support', 'plan', 'scale', 0.00, 149.00, 4),
  ('The Founders Special', 'Scale Tier at early-client discount — all Scale features at reduced monthly rate', 'plan', 'founders_special', 0.00, 99.00, 5),
  ('The Community Tier', 'Sermon sync, secure giving, admin dashboards, member portal — free for nonprofits', 'plan', 'community', 0.00, 0.00, 6);

-- Proposal templates (5) — sections stored as JSONB
INSERT INTO proposal_templates (name, plan_key, description, sections) VALUES
  ('The Launch Tier Proposal', 'launch', 'For trades, cafés, and local services', '[
    {"id": "cover", "title": "Cover Page", "content": "**Appdoers**\n\nWeb Development at the Speed of Ambition\n\nPrepared for: [CLIENT NAME]\nDate: [DATE]"},
    {"id": "executive_summary", "title": "Executive Summary", "content": "We will design and build a high-performance, mobile-first website for [CLIENT NAME] that drives real business results. Our Launch Tier delivers everything your business needs to establish a strong online presence — professionally designed, passively managed, and built to last."},
    {"id": "about", "title": "About Appdoers", "content": "Appdoers is a New Zealand-based digital agency specialising in web development at the speed of ambition. We build engineering-grade websites for local businesses who deserve more than a template.\n\n**Fabiano Da Silva** — Strategist, vision, business development\n**Sara Da Silva** — Engineer, Next.js architecture, AI integration"},
    {"id": "goals", "title": "Understanding Your Goals", "content": "Based on our conversation, here is our understanding of what you need:\n\n- [Goal 1]\n- [Goal 2]\n- [Goal 3]\n\nThis proposal addresses each of these directly."},
    {"id": "scope", "title": "Scope of Work", "content": "**Included:**\n- Mobile-first responsive design\n- Static site architecture (fast & secure)\n- Essential SEO & Google Business setup\n- 100% passive tech management (we handle all updates)\n- 72-hour email support SLA\n\n**Not included:**\n- E-commerce functionality\n- CMS / client content editing\n- Custom integrations"},
    {"id": "timeline", "title": "Project Timeline", "content": "| Phase | Duration |\n|-------|----------|\n| Discovery | 1 week |\n| Design | 1-2 weeks |\n| Development | 2-3 weeks |\n| Review & QA | 1 week |\n| Launch | 1 day |\n\n**Estimated total: 5-7 weeks from project kickoff**"},
    {"id": "investment", "title": "Investment", "content": ""},
    {"id": "why", "title": "Why Appdoers", "content": "- Engineering-grade reliability — not a template, not a page builder\n- Mobile-first by default — not an afterthought\n- Ongoing support included — we are your tech team\n- New Zealand based — we understand your market"},
    {"id": "next_steps", "title": "Next Steps", "content": "1. Review and approve this proposal\n2. Sign the service agreement\n3. Pay the setup fee to begin\n4. Complete the project brief form\n5. Kick-off call scheduled within 48 hours\n\nThis proposal is valid for 30 days from the date above."},
    {"id": "terms", "title": "Terms & Conditions", "content": "**Payment:** Setup fee due on project commencement. Monthly retainer billed on the 1st of each month.\n**Revisions:** Two rounds of revisions included in the design and development phases.\n**Intellectual Property:** Full ownership of the completed website transfers to the client upon receipt of all payments.\n**Termination:** Either party may terminate with 30 days written notice.\n**Governing Law:** New Zealand"}
  ]'),
  ('The Growth Tier Proposal', 'growth', 'For content creators, blogs, and growing brands', '[
    {"id": "cover", "title": "Cover Page", "content": "**Appdoers**\n\nWeb Development at the Speed of Ambition\n\nPrepared for: [CLIENT NAME]\nDate: [DATE]"},
    {"id": "executive_summary", "title": "Executive Summary", "content": "We will build a high-performance website for [CLIENT NAME] with a powerful headless CMS for full content control. The Growth Tier is designed for brands that publish, grow, and need their website to keep up."},
    {"id": "about", "title": "About Appdoers", "content": "Appdoers is a New Zealand-based digital agency specialising in web development at the speed of ambition.\n\n**Fabiano Da Silva** — Strategist\n**Sara Da Silva** — Engineer, Next.js, WebGL, AI integration"},
    {"id": "goals", "title": "Understanding Your Goals", "content": "- [Goal 1]\n- [Goal 2]\n- [Goal 3]"},
    {"id": "scope", "title": "Scope of Work", "content": "**Included:**\n- Everything in Launch Tier\n- Headless CMS (you control your content)\n- Code-locked layouts (design stays consistent)\n- Monthly analytics & performance reports\n- Priority 48-hour support SLA\n\n**Not included:**\n- E-commerce / payment processing\n- Custom app integrations"},
    {"id": "timeline", "title": "Project Timeline", "content": "| Phase | Duration |\n|-------|----------|\n| Discovery | 1 week |\n| Design | 2 weeks |\n| Development | 3-4 weeks |\n| Review & QA | 1 week |\n| Launch | 1 day |\n\n**Estimated total: 7-9 weeks**"},
    {"id": "investment", "title": "Investment", "content": ""},
    {"id": "why", "title": "Why Appdoers", "content": "- True CMS control — publish and update without touching code\n- Analytics built in — see what is working\n- One of only 25 Growth spots available\n- Engineering-grade performance"},
    {"id": "next_steps", "title": "Next Steps", "content": "1. Approve this proposal\n2. Sign service agreement\n3. Pay setup fee\n4. Complete project brief\n5. Kick-off call within 48 hours"},
    {"id": "terms", "title": "Terms & Conditions", "content": "**Payment:** Setup fee on commencement. Monthly on the 1st.\n**Revisions:** Two rounds included.\n**IP:** Transfers to client on full payment.\n**Termination:** 30 days written notice.\n**Governing Law:** New Zealand"}
  ]'),
  ('The Scale Tier Proposal', 'scale', 'For e-commerce and complex digital builds', '[
    {"id": "cover", "title": "Cover Page", "content": "**Appdoers**\n\nWeb Development at the Speed of Ambition\n\nPrepared for: [CLIENT NAME]\nDate: [DATE]"},
    {"id": "executive_summary", "title": "Executive Summary", "content": "We will build a fully-featured digital ecosystem for [CLIENT NAME] — including Stripe or Shopify integration, interactive 3D elements, and a user management system. The Scale Tier is for businesses ready to transact online at scale."},
    {"id": "about", "title": "About Appdoers", "content": "Appdoers — New Zealand digital agency.\n\n**Fabiano Da Silva** — Strategist\n**Sara Da Silva** — Engineer, e-commerce, WebGL, AI"},
    {"id": "goals", "title": "Understanding Your Goals", "content": "- [Goal 1]\n- [Goal 2]\n- [Goal 3]"},
    {"id": "scope", "title": "Scope of Work", "content": "**Included:**\n- Everything in Growth Tier\n- Stripe or Shopify store integration\n- Interactive 3D product/brand elements\n- User login/signup system\n- VIP 24-hour support SLA\n- 12-month contract (setup fee waived)\n\n**Not included:**\n- Third-party API integrations beyond Stripe/Shopify\n- Custom mobile apps"},
    {"id": "timeline", "title": "Project Timeline", "content": "| Phase | Duration |\n|-------|----------|\n| Discovery | 1-2 weeks |\n| Design | 2-3 weeks |\n| Development | 4-6 weeks |\n| Review & QA | 1-2 weeks |\n| Launch | 1 day |\n\n**Estimated total: 9-14 weeks**"},
    {"id": "investment", "title": "Investment", "content": ""},
    {"id": "why", "title": "Why Appdoers", "content": "- E-commerce built on engineering-grade infrastructure\n- 3D/WebGL capabilities — very few NZ agencies offer this\n- Setup fee waived on 12-month commitment\n- VIP 24-hour support"},
    {"id": "next_steps", "title": "Next Steps", "content": "1. Approve this proposal\n2. Sign 12-month service agreement\n3. Complete project brief\n4. Kick-off call within 24 hours"},
    {"id": "terms", "title": "Terms & Conditions", "content": "**Payment:** Monthly on the 1st. 12-month minimum commitment. Setup fee waived.\n**Revisions:** Three rounds included.\n**IP:** Transfers on full payment.\n**Termination:** 12-month minimum — early termination fee applies.\n**Governing Law:** New Zealand"}
  ]'),
  ('The Founders Special Proposal', 'founders_special', 'Scale Tier features at early-client discount', '[
    {"id": "cover", "title": "Cover Page", "content": "**Appdoers**\n\nWeb Development at the Speed of Ambition\n\n*Founders Special — Exclusive Early-Client Rate*\n\nPrepared for: [CLIENT NAME]\nDate: [DATE]"},
    {"id": "executive_summary", "title": "Executive Summary", "content": "As one of Appdoers'' founding clients, [CLIENT NAME] is being offered the full Scale Tier — our most comprehensive package — at an exclusive discounted rate of $99/month. This rate is locked in for the life of your contract."},
    {"id": "about", "title": "About Appdoers", "content": "Appdoers — New Zealand digital agency.\n\n**Fabiano Da Silva** — Strategist\n**Sara Da Silva** — Engineer"},
    {"id": "goals", "title": "Understanding Your Goals", "content": "- [Goal 1]\n- [Goal 2]\n- [Goal 3]"},
    {"id": "scope", "title": "Scope of Work", "content": "**Full Scale Tier included:**\n- Everything in Growth Tier\n- Stripe or Shopify integration\n- Interactive 3D elements\n- User management system\n- VIP 24-hour support SLA\n- Setup fee waived\n\nThis is the same scope as our $149/month Scale Tier — offered at $99/month exclusively for founding clients."},
    {"id": "timeline", "title": "Project Timeline", "content": "| Phase | Duration |\n|-------|----------|\n| Discovery | 1-2 weeks |\n| Design | 2-3 weeks |\n| Development | 4-6 weeks |\n| Review & QA | 1-2 weeks |\n| Launch | 1 day |"},
    {"id": "investment", "title": "Investment", "content": ""},
    {"id": "why", "title": "Why Appdoers", "content": "- Full Scale Tier features at a founders'' discount\n- Rate locked in — never increases while on this plan\n- Engineering-grade build\n- Supporting a New Zealand startup"},
    {"id": "next_steps", "title": "Next Steps", "content": "1. Approve this proposal\n2. Sign 12-month service agreement\n3. Complete project brief\n4. Kick-off call within 24 hours\n\nThis Founders Special offer expires [DATE + 14 days]."},
    {"id": "terms", "title": "Terms & Conditions", "content": "**Payment:** $99/month on the 1st. 12-month minimum. Setup fee waived.\n**Rate Lock:** $99/month rate guaranteed for duration of contract.\n**Revisions:** Three rounds included.\n**IP:** Transfers on full payment.\n**Termination:** 12-month minimum applies.\n**Governing Law:** New Zealand"}
  ]'),
  ('The Community Tier Proposal', 'community', 'For nonprofits and churches', '[
    {"id": "cover", "title": "Cover Page", "content": "**Appdoers**\n\nDigital Tools for Community\n\nPrepared for: [ORGANISATION NAME]\nDate: [DATE]"},
    {"id": "executive_summary", "title": "Executive Summary", "content": "Appdoers is committed to serving New Zealand''s nonprofit and faith communities. We will build [ORGANISATION NAME] a fully-featured community platform — completely free — including sermon management, secure giving, event management, and member portals."},
    {"id": "about", "title": "About Appdoers", "content": "Appdoers is a New Zealand-based digital agency. Our Community Tier is our commitment to giving back — nonprofits and churches receive the same engineering-grade quality as our paying clients, at no cost.\n\n**Fabiano Da Silva** — Strategist\n**Sara Da Silva** — Engineer"},
    {"id": "goals", "title": "Understanding Your Goals", "content": "- [Goal 1]\n- [Goal 2]\n- [Goal 3]"},
    {"id": "scope", "title": "Scope of Work", "content": "**Included at no cost:**\n- YouTube sermon sync (automatically pulls latest sermons)\n- Secure online giving via Stripe\n- Admin dashboard for staff\n- Member portal (events, prayer requests, newsletter)\n- Mobile-first design\n- Ongoing hosting and maintenance\n\n**12-month commitment required**"},
    {"id": "timeline", "title": "Project Timeline", "content": "| Phase | Duration |\n|-------|----------|\n| Discovery | 1 week |\n| Design | 2 weeks |\n| Development | 3-4 weeks |\n| Review & QA | 1 week |\n| Launch | 1 day |"},
    {"id": "investment", "title": "Investment", "content": "**Setup Fee: $0**\n**Monthly: $0**\n\nThis service is provided free of charge to qualifying nonprofits and churches registered in New Zealand. A 12-month commitment is required to ensure we can plan and resource your project appropriately."},
    {"id": "why", "title": "Why Appdoers", "content": "- Purpose-built features for faith communities\n- Zero cost — our contribution to the community\n- Engineering-grade quality\n- New Zealand built and supported"},
    {"id": "next_steps", "title": "Next Steps", "content": "1. Approve this proposal\n2. Sign 12-month community agreement\n3. Provide charity/nonprofit registration number\n4. Complete project brief\n5. Kick-off call within 48 hours"},
    {"id": "terms", "title": "Terms & Conditions", "content": "**Eligibility:** Registered New Zealand charity or nonprofit.\n**Commitment:** 12-month minimum.\n**Revisions:** Two rounds included.\n**IP:** Transfers to organisation on completion.\n**Termination:** 30 days written notice after 12-month period.\n**Governing Law:** New Zealand"}
  ]');
