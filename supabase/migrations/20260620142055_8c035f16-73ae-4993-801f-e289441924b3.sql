
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_gov_registered boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS registration_certificate_url text,
  ADD COLUMN IF NOT EXISTS pan_card_url text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_ifsc text,
  ADD COLUMN IF NOT EXISTS admin_name text,
  ADD COLUMN IF NOT EXISTS admin_designation text,
  ADD COLUMN IF NOT EXISTS admin_aadhaar_url text;
