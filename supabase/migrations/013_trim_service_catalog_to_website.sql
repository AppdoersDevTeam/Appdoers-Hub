-- Keep only Appdoers website catalog entries
-- Source of truth: appdoers.co.nz / lib/pricing/appdoers-pricing.ts
-- Removes leftover Launch/Growth/Scale/Founders/Community/Family & Friends rows.

DELETE FROM service_catalog
WHERE plan_key IS NULL
   OR plan_key NOT IN (
     'basic',
     'full',
     'basic_email',
     'standard_email',
     'premium_email',
     'donations_setup',
     'additional_work'
   );

UPDATE service_catalog
SET is_active = true
WHERE plan_key IN (
  'basic',
  'full',
  'basic_email',
  'standard_email',
  'premium_email',
  'donations_setup',
  'additional_work'
);
