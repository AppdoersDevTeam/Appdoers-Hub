-- Sync plans and services with appdoers.co.nz (Basic Website + Full Website model)

-- Migrate existing client subscription plans to new keys
UPDATE clients SET subscription_plan = CASE subscription_plan
  WHEN 'launch' THEN 'basic'
  WHEN 'growth' THEN 'basic'
  WHEN 'growth_annual' THEN 'basic'
  WHEN 'community' THEN 'basic'
  WHEN 'scale' THEN 'full'
  WHEN 'founders_special' THEN 'full'
  ELSE subscription_plan
END;

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_subscription_plan_check;
ALTER TABLE clients ADD CONSTRAINT clients_subscription_plan_check
  CHECK (subscription_plan IN ('basic', 'full', 'none'));

-- Retire legacy catalog entries
UPDATE service_catalog SET is_active = false;

-- Website plans (12-month default pricing from appdoers.co.nz)
INSERT INTO service_catalog (name, description, type, plan_key, setup_fee, monthly_fee, sort_order) VALUES
  (
    'Basic Website',
    'Public website with unlimited pages, domain/hosting/security, Google setup, YouTube video catalogue, contact form, and 3 design feedback rounds. Fixed content; changes on request. 12-month plan: $165.13/mo, $1,499 setup ($799 min upfront).',
    'plan',
    'basic',
    1499.00,
    165.13,
    1
  ),
  (
    'Full Website',
    'Everything in Basic plus private team area, member-only portal, events/newsletters/prayer requests, directory, rosters, groups, login management, and online donations. 12-month plan: $349/mo, $2,999 setup ($1,199 min upfront).',
    'plan',
    'full',
    2999.00,
    349.00,
    2
  );

-- Add-ons from pricing page
INSERT INTO service_catalog (name, description, type, plan_key, setup_fee, monthly_fee, sort_order) VALUES
  (
    'Basic Email',
    '5GB per mailbox. $3/mailbox/mo on 12-month contract (must match website plan length). Free on 48-month website plans (up to 5 people).',
    'addon',
    'basic_email',
    0.00,
    3.00,
    10
  ),
  (
    'Standard Email',
    '20GB per mailbox. $6.50/mailbox/mo on 12-month contract. Free on 48-month Full Website plans (up to 5 people).',
    'addon',
    'standard_email',
    0.00,
    6.50,
    11
  ),
  (
    'Premium Email',
    '50GB per mailbox. $12.50/mailbox/mo on 12-month contract.',
    'addon',
    'premium_email',
    0.00,
    12.50,
    12
  ),
  (
    'Online Donations Setup',
    'Stripe giving integration. Billed at $49/hr — usually about 3 hours (~$147).',
    'addon',
    'donations_setup',
    147.00,
    0.00,
    20
  ),
  (
    'Additional Work',
    'Extra design rounds, post-launch updates, and one-off requests outside your plan. Billed at $49 NZD/hour.',
    'addon',
    'additional_work',
    0.00,
    0.00,
    21
  );

-- Retire legacy proposal templates
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
      {"id": "scope", "title": "Scope of Work — Basic Website", "content": "**Included:**\n- Unlimited pages, mobile-first design\n- Domain, security & hosting managed by Appdoers\n- Basic Google setup\n- YouTube video catalogue on your site\n- Contact form\n- 3 design feedback rounds during build\n- Ongoing hosting, security & maintenance\n\n**Not included:**\n- Member-only areas or team admin portal\n- Events, rosters, prayer requests, or directories\n- Online donations (available as add-on)\n- Logo design, photo editing, videos, ads, or social media"},
      {"id": "timeline", "title": "Project Timeline", "content": "We aim to develop your site within **8 weeks** from project start.\n\n| Phase | What happens |\n|-------|-------------|\n| Listen | Discovery call about your organisation and goals |\n| Plan | Agree pages, features, timeline, and price |\n| Build & launch | Design, feedback rounds, QA, and go-live |\n| Support | Hosting, security, and maintenance ongoing |"},
      {"id": "investment", "title": "Investment", "content": ""},
      {"id": "why", "title": "Why Appdoers", "content": "- Built for New Zealand clients\n- Loads fast on phones\n- Clear monthly pricing — you always speak with the Appdoers team\n- You own your domain\n- Responsive support when you need changes"},
      {"id": "next_steps", "title": "Next Steps", "content": "1. Review and approve this proposal\n2. Sign the service agreement\n3. Pay setup fee within 7 days of signing\n4. Provide content ready to use\n5. Kick-off within 48 hours of payment\n\nThis proposal is valid for 30 days."},
      {"id": "terms", "title": "Terms & Conditions", "content": "**Setup fee:** $1,499 total ($799 minimum upfront; remainder spread across monthly payments).\n**Monthly:** Billed in advance after the 8-week build period (or within 7 days of early launch).\n**Contract:** 12, 24, or 48 months — term runs from launch date.\n**Cancellation:** 30 days written notice; early exit requires paying remaining months.\n**Hourly rate:** $49/hr for work outside plan scope.\n**Governing Law:** New Zealand"}
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
      {"id": "scope", "title": "Scope of Work — Full Website", "content": "**Everything in Basic Website, plus:**\n- Private management area for your team\n- Member-only area (events, newsletters, prayer requests)\n- Directory for staff, members, and attendees\n- Rosters, groups, and login management\n- Online donations (setup billed at $49/hr, ~3 hours)\n- 3 design feedback rounds during build\n\n**Not included:**\n- Logo design, photo editing, videos, ads, search campaigns, social media, or phone apps"},
      {"id": "timeline", "title": "Project Timeline", "content": "We aim to develop your site within **8 weeks** from project start.\n\n| Phase | What happens |\n|-------|-------------|\n| Listen | Discovery about your team, members, and workflows |\n| Plan | Agree features, timeline, and price before build |\n| Build & launch | Design, feedback, QA, and go-live |\n| Support | Hosting, security, maintenance, and plan tools |"},
      {"id": "investment", "title": "Investment", "content": ""},
      {"id": "why", "title": "Why Appdoers", "content": "- Purpose-built for churches and growing organisations\n- Member tools included — not bolted on later\n- NZ-based team with direct access\n- Engineering-grade hosting and security\n- Clear pricing with no surprises"},
      {"id": "next_steps", "title": "Next Steps", "content": "1. Review and approve this proposal\n2. Sign the service agreement\n3. Pay setup fee within 7 days of signing ($1,199 minimum upfront)\n4. Provide content and access details for integrations\n5. Kick-off within 48 hours\n\nThis proposal is valid for 30 days."},
      {"id": "terms", "title": "Terms & Conditions", "content": "**Setup fee:** $2,999 total ($1,199 minimum upfront; remainder spread across monthly payments).\n**Monthly:** Billed in advance after the 8-week build period.\n**Contract:** 12, 24, or 48 months from launch date.\n**Cancellation:** 30 days written notice; early exit requires paying remaining months.\n**Hourly rate:** $49/hr for work outside plan scope.\n**Governing Law:** New Zealand"}
    ]'
  );

UPDATE settings SET value = jsonb_set(value, '{website}', '"https://www.appdoers.co.nz"')
WHERE key = 'company';
