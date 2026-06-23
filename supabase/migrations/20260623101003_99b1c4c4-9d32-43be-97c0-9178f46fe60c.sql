
-- Wallet enum for the 3 society wallets
CREATE TYPE public.wallet_type AS ENUM ('bank', 'accountant', 'president');

CREATE TYPE public.income_type AS ENUM ('registration_fee', 'donation', 'other');
CREATE TYPE public.expense_type AS ENUM ('charity', 'office', 'meeting', 'misc');

-- INCOME / DONATION RECEIPTS
CREATE TABLE public.org_income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  payer_name text NOT NULL,
  payer_phone text,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  income_type public.income_type NOT NULL,
  wallet public.wallet_type NOT NULL DEFAULT 'bank',
  receipt_no text,
  remarks text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_income TO authenticated;
GRANT ALL ON public.org_income TO service_role;
ALTER TABLE public.org_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "income_select_org" ON public.org_income FOR SELECT TO authenticated
  USING (public.can_edit_accounts(org_id) OR public.is_approved_member(auth.uid(), org_id));
CREATE POLICY "income_insert" ON public.org_income FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_accounts(org_id));
CREATE POLICY "income_update" ON public.org_income FOR UPDATE TO authenticated
  USING (public.can_edit_accounts(org_id)) WITH CHECK (public.can_edit_accounts(org_id));
CREATE POLICY "income_delete" ON public.org_income FOR DELETE TO authenticated
  USING (public.can_edit_accounts(org_id));

CREATE TRIGGER trg_org_income_touch BEFORE UPDATE ON public.org_income
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_org_income_org_date ON public.org_income(org_id, entry_date DESC);

-- EXPENSES
CREATE TABLE public.org_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  recipient_name text NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  expense_type public.expense_type NOT NULL,
  wallet public.wallet_type NOT NULL DEFAULT 'bank',
  remarks text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_expenses TO authenticated;
GRANT ALL ON public.org_expenses TO service_role;
ALTER TABLE public.org_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exp_select_org" ON public.org_expenses FOR SELECT TO authenticated
  USING (public.can_edit_accounts(org_id) OR public.is_approved_member(auth.uid(), org_id));
CREATE POLICY "exp_insert" ON public.org_expenses FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_accounts(org_id));
CREATE POLICY "exp_update" ON public.org_expenses FOR UPDATE TO authenticated
  USING (public.can_edit_accounts(org_id)) WITH CHECK (public.can_edit_accounts(org_id));
CREATE POLICY "exp_delete" ON public.org_expenses FOR DELETE TO authenticated
  USING (public.can_edit_accounts(org_id));

CREATE TRIGGER trg_org_expenses_touch BEFORE UPDATE ON public.org_expenses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_org_expenses_org_date ON public.org_expenses(org_id, entry_date DESC);
