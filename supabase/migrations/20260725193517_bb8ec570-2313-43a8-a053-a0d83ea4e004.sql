
-- Sequence for receipt numbers
CREATE SEQUENCE IF NOT EXISTS public.subscription_receipt_seq;

CREATE TABLE public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL UNIQUE,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ NOT NULL,
  paid_on TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_method TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'paid',
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_payments_org ON public.subscription_payments(org_id, paid_on DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_payments TO authenticated;
GRANT ALL ON public.subscription_payments TO service_role;
GRANT USAGE ON SEQUENCE public.subscription_receipt_seq TO authenticated, service_role;

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- Super Admin: full access
CREATE POLICY "mbr_admin full access to payments"
ON public.subscription_payments FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'mbr_admin'))
WITH CHECK (public.has_role(auth.uid(), 'mbr_admin'));

-- Org admin: read own org
CREATE POLICY "org admin reads own org payments"
ON public.subscription_payments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = subscription_payments.org_id
      AND o.admin_user_id = auth.uid()
  )
);

-- Committee members: read own org
CREATE POLICY "committee reads own org payments"
ON public.subscription_payments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.user_id = auth.uid()
      AND m.org_id = subscription_payments.org_id
      AND m.status = 'approved'
  )
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_subscription_payments_updated_at
BEFORE UPDATE ON public.subscription_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate receipt number if not provided
CREATE OR REPLACE FUNCTION public.set_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
    NEW.receipt_number := 'RCPT-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.subscription_receipt_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_subscription_payments_set_receipt
BEFORE INSERT ON public.subscription_payments
FOR EACH ROW EXECUTE FUNCTION public.set_receipt_number();
