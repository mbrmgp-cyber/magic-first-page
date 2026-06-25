DROP POLICY IF EXISTS "Loan proofs: org reviewers can read" ON storage.objects;
CREATE POLICY "Loan proofs: org reviewers can read" ON storage.objects
FOR SELECT USING (
  bucket_id = 'loan-proofs' AND EXISTS (
    SELECT 1 FROM public.member_loan_requests r
    LEFT JOIN public.members m ON m.id = r.member_id
    WHERE (
      r.proof_url LIKE '%' || objects.name || '%'
      OR r.signature_data_url LIKE '%' || objects.name || '%'
      OR r.surety_signature_url LIKE '%' || objects.name || '%'
    ) AND (
      EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = r.org_id AND o.admin_user_id = auth.uid())
      OR public.get_committee_role(auth.uid(), r.org_id) IS NOT NULL
    )
  )
);

-- Allow a named surety to read the borrower's signature/proof while reviewing the request
DROP POLICY IF EXISTS "Loan proofs: named surety can read" ON storage.objects;
CREATE POLICY "Loan proofs: named surety can read" ON storage.objects
FOR SELECT USING (
  bucket_id = 'loan-proofs' AND EXISTS (
    SELECT 1 FROM public.member_loan_requests r
    JOIN public.members sm ON sm.id = r.surety_member_id
    WHERE sm.user_id = auth.uid()
    AND (
      r.proof_url LIKE '%' || objects.name || '%'
      OR r.signature_data_url LIKE '%' || objects.name || '%'
      OR r.surety_signature_url LIKE '%' || objects.name || '%'
    )
  )
);