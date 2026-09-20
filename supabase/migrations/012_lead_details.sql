-- Extra lead details and a clearer sales pipeline.

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

UPDATE leads SET status = 'in_conversation' WHERE status = 'qualified';
UPDATE leads SET status = 'contract_sent' WHERE status = 'negotiating';

ALTER TABLE leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN (
    'new',
    'contacted',
    'in_conversation',
    'proposal_sent',
    'contract_sent',
    'won',
    'lost'
  ));

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS company_size TEXT,
  ADD COLUMN IF NOT EXISTS contact_role TEXT,
  ADD COLUMN IF NOT EXISTS service_interest TEXT[],
  ADD COLUMN IF NOT EXISTS budget_notes TEXT,
  ADD COLUMN IF NOT EXISTS needed_by DATE,
  ADD COLUMN IF NOT EXISTS timeline_notes TEXT;

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_company_size_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_company_size_check
  CHECK (company_size IS NULL OR company_size IN ('solo', '2-10', '11-50', '51+'));
