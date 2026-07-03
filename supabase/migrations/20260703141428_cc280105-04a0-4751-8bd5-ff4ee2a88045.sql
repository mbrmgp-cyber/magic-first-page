
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS membership_receipt_url text;

-- Storage policies for member-receipts bucket
CREATE POLICY "member-receipts read own or admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'member-receipts' AND (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.membership_receipt_url = storage.objects.name
        AND (m.user_id = auth.uid() OR public.can_edit_org(m.org_id))
    )
  )
);

CREATE POLICY "member-receipts insert authenticated"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'member-receipts');

CREATE POLICY "member-receipts insert anon (register)"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'member-receipts');

CREATE POLICY "member-receipts update by admin"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'member-receipts' AND EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.membership_receipt_url = storage.objects.name
      AND public.can_edit_org(m.org_id)
  )
);

CREATE POLICY "member-receipts delete by admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'member-receipts' AND EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.membership_receipt_url = storage.objects.name
      AND public.can_edit_org(m.org_id)
  )
);
