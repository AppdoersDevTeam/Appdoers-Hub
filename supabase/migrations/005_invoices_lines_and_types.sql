-- Align invoices table with application code (inline line items, sent_at, extended types)

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS lines JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Backfill lines from legacy invoice_items rows where present
UPDATE invoices i
SET lines = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'description', ii.description,
        'quantity', ii.quantity,
        'unit_price', ii.unit_price,
        'amount', ii.amount,
        'time_entry_id', ii.time_entry_id
      )
      ORDER BY ii.sort_order, ii.id
    )
    FROM invoice_items ii
    WHERE ii.invoice_id = i.id
  ),
  '[]'::jsonb
)
WHERE i.lines = '[]'::jsonb
  AND EXISTS (SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = i.id);

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_type_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_type_check
  CHECK (type IN ('setup', 'monthly', 'adhoc', 'retainer', 'time_billing'));

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'void', 'cancelled'));
