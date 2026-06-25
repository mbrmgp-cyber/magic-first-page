
ALTER TABLE public.member_loan_requests
  ADD COLUMN IF NOT EXISTS surety_status text NOT NULL DEFAULT 'not_required'
    CHECK (surety_status IN ('not_required','awaiting','accepted','declined')),
  ADD COLUMN IF NOT EXISTS surety_signature_url text,
  ADD COLUMN IF NOT EXISTS surety_responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS surety_decline_reason text;

-- Backfill: if a surety is linked but no status set, mark awaiting
UPDATE public.member_loan_requests
   SET surety_status = 'awaiting'
 WHERE surety_member_id IS NOT NULL
   AND surety_status = 'not_required';

-- Allow the named surety member to view requests addressed to them
DROP POLICY IF EXISTS "Surety can view requests addressed to them" ON public.member_loan_requests;
CREATE POLICY "Surety can view requests addressed to them"
  ON public.member_loan_requests
  FOR SELECT
  TO authenticated
  USING (
    surety_member_id IN (
      SELECT id FROM public.members
       WHERE user_id = auth.uid() AND status = 'approved'
    )
  );

-- Allow the named surety to update their consent fields on their requests
DROP POLICY IF EXISTS "Surety can respond to their requests" ON public.member_loan_requests;
CREATE POLICY "Surety can respond to their requests"
  ON public.member_loan_requests
  FOR UPDATE
  TO authenticated
  USING (
    surety_member_id IN (
      SELECT id FROM public.members
       WHERE user_id = auth.uid() AND status = 'approved'
    )
    AND surety_status = 'awaiting'
  )
  WITH CHECK (
    surety_member_id IN (
      SELECT id FROM public.members
       WHERE user_id = auth.uid() AND status = 'approved'
    )
  );
