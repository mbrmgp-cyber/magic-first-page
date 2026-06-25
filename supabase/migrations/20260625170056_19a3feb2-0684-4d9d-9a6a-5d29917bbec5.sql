-- Members upload to a path that starts with their auth.uid()
CREATE POLICY "Loan proofs: owner can upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'loan-proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Loan proofs: owner can read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'loan-proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Loan proofs: owner can update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'loan-proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Org admins and committee read proofs of members in their org
CREATE POLICY "Loan proofs: org reviewers can read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'loan-proofs'
  AND EXISTS (
    SELECT 1
    FROM public.member_loan_requests r
    JOIN public.members m ON m.id = r.member_id
    WHERE (r.proof_url LIKE '%' || storage.objects.name || '%'
        OR r.signature_data_url LIKE '%' || storage.objects.name || '%')
      AND (
        EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = r.org_id AND o.admin_user_id = auth.uid())
        OR public.get_committee_role(auth.uid(), r.org_id) IS NOT NULL
      )
  )
);