ALTER TABLE public.member_loan_requests
  ADD COLUMN IF NOT EXISTS tenure_months int,
  ADD COLUMN IF NOT EXISTS signature_data_url text,
  ADD COLUMN IF NOT EXISTS proof_url text;