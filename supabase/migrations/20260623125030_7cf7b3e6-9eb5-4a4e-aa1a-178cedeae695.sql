
-- Multi-currency wallet accounts
CREATE TABLE public.wallet_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  wallet_type wallet_type NOT NULL DEFAULT 'bank',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_accounts TO authenticated;
GRANT ALL ON public.wallet_accounts TO service_role;

ALTER TABLE public.wallet_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_accounts_select_members_or_admins"
ON public.wallet_accounts FOR SELECT TO authenticated
USING (
  public.can_edit_accounts(org_id)
  OR public.is_approved_member(auth.uid(), org_id)
);

CREATE POLICY "wallet_accounts_insert_admins"
ON public.wallet_accounts FOR INSERT TO authenticated
WITH CHECK (public.can_edit_accounts(org_id));

CREATE POLICY "wallet_accounts_update_admins"
ON public.wallet_accounts FOR UPDATE TO authenticated
USING (public.can_edit_accounts(org_id))
WITH CHECK (public.can_edit_accounts(org_id));

CREATE POLICY "wallet_accounts_delete_admins"
ON public.wallet_accounts FOR DELETE TO authenticated
USING (public.can_edit_accounts(org_id));

CREATE TRIGGER trg_wallet_accounts_updated_at
BEFORE UPDATE ON public.wallet_accounts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Add currency & exchange rate to income/expenses
ALTER TABLE public.org_income
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS exchange_rate numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS base_amount numeric,
  ADD COLUMN IF NOT EXISTS wallet_account_id uuid REFERENCES public.wallet_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.org_expenses
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS exchange_rate numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS base_amount numeric,
  ADD COLUMN IF NOT EXISTS wallet_account_id uuid REFERENCES public.wallet_accounts(id) ON DELETE SET NULL;

-- Backfill base_amount where null
UPDATE public.org_income SET base_amount = amount WHERE base_amount IS NULL;
UPDATE public.org_expenses SET base_amount = amount WHERE base_amount IS NULL;
