-- Agency tools can be billed one-off or on multi-year terms, not only monthly/yearly.

ALTER TABLE agency_subscriptions
  DROP CONSTRAINT IF EXISTS agency_subscriptions_billing_cycle_check;

ALTER TABLE agency_subscriptions
  ADD CONSTRAINT agency_subscriptions_billing_cycle_check
  CHECK (billing_cycle IN (
    'one_off',
    'monthly',
    'quarterly',
    'yearly',
    'months_24',
    'months_36',
    'months_48',
    'months_60'
  ));
