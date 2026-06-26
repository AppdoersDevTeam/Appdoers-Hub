-- Sync service catalog with appdoers.co.nz pricing (12/24/48 month variants)
-- Source: lib/pricing/appdoers-pricing.ts (mirrors website siteContent.ts)

ALTER TABLE service_catalog
  ADD COLUMN IF NOT EXISTS contract_months INTEGER,
  ADD COLUMN IF NOT EXISTS min_upfront DECIMAL(10,2);

ALTER TABLE service_catalog DROP CONSTRAINT IF EXISTS service_catalog_contract_months_check;
ALTER TABLE service_catalog ADD CONSTRAINT service_catalog_contract_months_check
  CHECK (contract_months IS NULL OR contract_months IN (12, 24, 48));

-- Retire all existing catalog entries
UPDATE service_catalog SET is_active = false;

-- ─── Website plans (6 entries) ───────────────────────────────────────────────

INSERT INTO service_catalog (name, description, type, plan_key, setup_fee, monthly_fee, min_upfront, contract_months, sort_order) VALUES
  (
    'Basic Website (12 months)',
    'Public website with unlimited pages, domain/hosting/security, Google setup, YouTube video catalogue, contact form, and 3 design feedback rounds. Fixed content; changes on request. 12-month plan at default min upfront ($799): $165.13/mo total ($1,499 setup).',
    'plan', 'basic', 1499.00, 165.13, 799.00, 12, 1
  ),
  (
    'Basic Website (24 months)',
    'Same Basic Website scope on a 24-month contract. Lower plan rate vs 12 months. Default min upfront ($799): $127.07/mo total ($1,499 setup).',
    'plan', 'basic', 1499.00, 127.07, 799.00, 24, 2
  ),
  (
    'Basic Website (48 months)',
    'Same Basic Website scope on a 48-month contract. Includes free Basic email (5GB, up to 5 people). Default min upfront ($799): $103.58/mo total ($1,499 setup).',
    'plan', 'basic', 1499.00, 103.58, 799.00, 48, 3
  ),
  (
    'Full Website (12 months)',
    'Everything in Basic plus private team area, member-only portal, events/newsletters/prayer requests, directory, rosters, groups, login management, and online donations. 12-month plan at default min upfront ($1,199): $349/mo total ($2,999 setup).',
    'plan', 'full', 2999.00, 349.00, 1199.00, 12, 4
  ),
  (
    'Full Website (24 months)',
    'Same Full Website scope on a 24-month contract. Lower plan rate vs 12 months. Default min upfront ($1,199): $254.10/mo total ($2,999 setup).',
    'plan', 'full', 2999.00, 254.10, 1199.00, 24, 5
  ),
  (
    'Full Website (48 months)',
    'Same Full Website scope on a 48-month contract. Includes free Standard email (20GB, up to 5 people). Default min upfront ($1,199): $196.70/mo total ($2,999 setup).',
    'plan', 'full', 2999.00, 196.70, 1199.00, 48, 6
  );

-- ─── Email add-ons (9 entries) ───────────────────────────────────────────────

INSERT INTO service_catalog (name, description, type, plan_key, setup_fee, monthly_fee, min_upfront, contract_months, sort_order) VALUES
  (
    'Basic Email (12 months)',
    '5GB per mailbox. $3/mailbox/mo on 12-month contract (must match website plan length). Up to 30 mailboxes.',
    'addon', 'basic_email', 0.00, 3.00, NULL, 12, 10
  ),
  (
    'Basic Email (24 months)',
    '5GB per mailbox. $2.50/mailbox/mo on 24-month contract (must match website plan length). Up to 30 mailboxes.',
    'addon', 'basic_email', 0.00, 2.50, NULL, 24, 11
  ),
  (
    'Basic Email (48 months)',
    '5GB per mailbox. $2/mailbox/mo on 48-month contract. Free on 48-month Basic Website plans (up to 5 people). Up to 30 mailboxes.',
    'addon', 'basic_email', 0.00, 2.00, NULL, 48, 12
  ),
  (
    'Standard Email (12 months)',
    '20GB per mailbox. $6.50/mailbox/mo on 12-month contract (must match website plan length). Up to 30 mailboxes.',
    'addon', 'standard_email', 0.00, 6.50, NULL, 12, 13
  ),
  (
    'Standard Email (24 months)',
    '20GB per mailbox. $6/mailbox/mo on 24-month contract (must match website plan length). Up to 30 mailboxes.',
    'addon', 'standard_email', 0.00, 6.00, NULL, 24, 14
  ),
  (
    'Standard Email (48 months)',
    '20GB per mailbox. $5.50/mailbox/mo on 48-month contract. Free on 48-month Full Website plans (up to 5 people). Up to 30 mailboxes.',
    'addon', 'standard_email', 0.00, 5.50, NULL, 48, 15
  ),
  (
    'Premium Email (12 months)',
    '50GB per mailbox. $12.50/mailbox/mo on 12-month contract (must match website plan length). Up to 30 mailboxes.',
    'addon', 'premium_email', 0.00, 12.50, NULL, 12, 16
  ),
  (
    'Premium Email (24 months)',
    '50GB per mailbox. $11.50/mailbox/mo on 24-month contract (must match website plan length). Up to 30 mailboxes.',
    'addon', 'premium_email', 0.00, 11.50, NULL, 24, 17
  ),
  (
    'Premium Email (48 months)',
    '50GB per mailbox. $10.50/mailbox/mo on 48-month contract (must match website plan length). Up to 30 mailboxes.',
    'addon', 'premium_email', 0.00, 10.50, NULL, 48, 18
  );

-- ─── One-off add-ons (2 entries) ─────────────────────────────────────────────

INSERT INTO service_catalog (name, description, type, plan_key, setup_fee, monthly_fee, min_upfront, contract_months, sort_order) VALUES
  (
    'Online Donations Setup',
    'Stripe giving integration. Billed at $49/hr — usually about 3 hours (~$147).',
    'addon', 'donations_setup', 147.00, 0.00, NULL, NULL, 20
  ),
  (
    'Additional Work',
    'Extra design rounds, post-launch updates, and one-off requests outside your plan. Billed at $49 NZD/hour.',
    'addon', 'additional_work', 0.00, 0.00, NULL, NULL, 21
  );

-- ─── Proposal templates ──────────────────────────────────────────────────────

UPDATE proposal_templates SET is_active = false;

INSERT INTO proposal_templates (name, plan_key, description, sections) VALUES
  (
    'Basic Website Proposal',
    'basic',
    'Simple public website for churches, businesses, and organisations',
    '[
      {"id": "cover", "title": "Cover Page", "content": "**Appdoers**\n\nWebsites & Online Tools for New Zealand\n\nPrepared for: [CLIENT NAME]\nDate: [DATE]"},
      {"id": "executive_summary", "title": "Executive Summary", "content": "We will design and build a fast, easy-to-use Basic Website for [CLIENT NAME] — a professional public site with clear pricing, hosting and security included, and direct access to the Appdoers team."},
      {"id": "about", "title": "About Appdoers", "content": "Appdoers Limited is a New Zealand website company with teams in Ashburton and New Plymouth. We design, build, host, and support websites for clients across Aotearoa.\n\n**Fabiano Da Silva** — Founder, client strategy & scoping\n**Sara Da Silva** — Technical lead, design, build, hosting & support"},
      {"id": "goals", "title": "Understanding Your Goals", "content": "Based on our conversation:\n\n- [Goal 1]\n- [Goal 2]\n- [Goal 3]"},
      {"id": "scope", "title": "Scope of Work — Basic Website", "content": "**Included:**\n- Unlimited pages with mobile-first design\n- Domain, security & hosting managed by Appdoers\n- Basic Google setup\n- YouTube video catalogue on your site\n- Contact form\n- 3 design feedback rounds during build\n- Fixed content; changes requested through us\n- Ongoing hosting, security & maintenance\n- Free business email on 4-year plan (5GB, up to 5 people)\n\n**Not included:**\n- Member-only areas or team admin portal\n- Events, rosters, prayer requests, or directories\n- Online donations (available as add-on)\n- Logo design, photo editing, videos, ads, search campaigns, social media, or phone apps"},
      {"id": "timeline", "title": "Project Timeline", "content": "We aim to develop your site within **8 weeks** from project start.\n\n| Phase | What happens |\n|-------|-------------|\n| Listen | Discovery call about your organisation and goals |\n| Plan | Agree pages, features, timeline, and price |\n| Build & launch | Design, feedback rounds, QA, and go-live |\n| Support | Hosting, security, and maintenance ongoing |"},
      {"id": "investment", "title": "Investment", "content": ""},
      {"id": "why", "title": "Why Appdoers", "content": "- Built for New Zealand clients\n- Loads fast on phones\n- Clear monthly pricing — you always speak with the Appdoers team\n- You own your domain\n- Responsive support when you need changes"},
      {"id": "next_steps", "title": "Next Steps", "content": "1. Review and approve this proposal\n2. Sign the service agreement\n3. Pay setup fee within 7 days of signing\n4. Provide content ready to use\n5. Kick-off within 48 hours of payment\n\nThis proposal is valid for 30 days."},
      {"id": "terms", "title": "Terms & Conditions", "content": "**Setup fee:** $1,499 total ($799 minimum upfront; remainder spread across monthly payments).\n**Monthly:** Billed in advance after the 8-week build period (or within 7 days of early launch). You may pay monthly or annually.\n**Contract:** 12, 24, or 48 months — term runs from launch date. Open-ended terms are not offered.\n**Cancellation:** 30 days written notice; early exit requires paying remaining months at your monthly price.\n**Hourly rate:** $49/hr for work outside plan scope (extra design rounds, post-launch updates, donations setup).\n**Governing Law:** New Zealand"}
    ]'
  ),
  (
    'Full Website Proposal',
    'full',
    'Member areas, team tools, and admin features for active organisations',
    '[
      {"id": "cover", "title": "Cover Page", "content": "**Appdoers**\n\nWebsites & Online Tools for New Zealand\n\nPrepared for: [CLIENT NAME]\nDate: [DATE]"},
      {"id": "executive_summary", "title": "Executive Summary", "content": "We will build a Full Website for [CLIENT NAME] — including private team management, member-only areas, events, rosters, prayer requests, and the tools your organisation needs day to day."},
      {"id": "about", "title": "About Appdoers", "content": "Appdoers Limited is a New Zealand website company with teams in Ashburton and New Plymouth.\n\n**Fabiano Da Silva** — Founder, client strategy\n**Sara Da Silva** — Technical lead, design, build, hosting & support"},
      {"id": "goals", "title": "Understanding Your Goals", "content": "Based on our conversation:\n\n- [Goal 1]\n- [Goal 2]\n- [Goal 3]"},
      {"id": "scope", "title": "Scope of Work — Full Website", "content": "**Everything in Basic Website, plus:**\n- Private management area for your team\n- Member-only area (events, newsletters, prayer requests)\n- Directory for staff, members, and attendees\n- Rosters, groups, and login management\n- Online donations (setup billed at $49/hr, ~3 hours)\n- 3 design feedback rounds during build\n- Free business email on 4-year plan (20GB Standard, up to 5 people)\n\n**Not included:**\n- Logo design, photo editing, videos, ads, search campaigns, social media, or phone apps"},
      {"id": "timeline", "title": "Project Timeline", "content": "We aim to develop your site within **8 weeks** from project start.\n\n| Phase | What happens |\n|-------|-------------|\n| Listen | Discovery about your team, members, and workflows |\n| Plan | Agree features, timeline, and price before build |\n| Build & launch | Design, feedback, QA, and go-live |\n| Support | Hosting, security, maintenance, and plan tools |"},
      {"id": "investment", "title": "Investment", "content": ""},
      {"id": "why", "title": "Why Appdoers", "content": "- Purpose-built for churches and growing organisations\n- Member tools included — not bolted on later\n- NZ-based team with direct access\n- Engineering-grade hosting and security\n- Clear pricing with no surprises"},
      {"id": "next_steps", "title": "Next Steps", "content": "1. Review and approve this proposal\n2. Sign the service agreement\n3. Pay setup fee within 7 days of signing ($1,199 minimum upfront)\n4. Provide content and access details for integrations\n5. Kick-off within 48 hours\n\nThis proposal is valid for 30 days."},
      {"id": "terms", "title": "Terms & Conditions", "content": "**Setup fee:** $2,999 total ($1,199 minimum upfront; remainder spread across monthly payments).\n**Monthly:** Billed in advance after the 8-week build period (or within 7 days of early launch). You may pay monthly or annually.\n**Contract:** 12, 24, or 48 months from launch date. Open-ended terms are not offered.\n**Cancellation:** 30 days written notice; early exit requires paying remaining months at your monthly price.\n**Hourly rate:** $49/hr for work outside plan scope.\n**Governing Law:** New Zealand"}
    ]'
  );
