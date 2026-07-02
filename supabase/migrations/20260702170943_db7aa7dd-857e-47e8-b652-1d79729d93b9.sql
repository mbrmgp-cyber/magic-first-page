
DROP POLICY IF EXISTS "chit-receipts member insert" ON storage.objects;
CREATE POLICY "chit-receipts member insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chit-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "chit-receipts self read" ON storage.objects;
CREATE POLICY "chit-receipts self read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chit-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "chit-receipts admin read" ON storage.objects;
CREATE POLICY "chit-receipts admin read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chit-receipts' AND EXISTS (
  SELECT 1 FROM public.auction_payments p
  WHERE public.can_edit_org(p.org_id) AND p.receipt_url IS NOT NULL AND p.receipt_url LIKE '%' || storage.objects.name
));
