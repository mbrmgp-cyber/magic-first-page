ALTER TABLE public.member_loans
  ADD COLUMN IF NOT EXISTS borrower_signature_url text,
  ADD COLUMN IF NOT EXISTS surety_signature_url text,
  ADD COLUMN IF NOT EXISTS surety_name text,
  ADD COLUMN IF NOT EXISTS surety_code text,
  ADD COLUMN IF NOT EXISTS surety_phone text;