
-- varadhi-proofs: owner-only
CREATE POLICY "vp_proofs_own_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'varadhi-proofs' AND owner = auth.uid());
CREATE POLICY "vp_proofs_own_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'varadhi-proofs' AND owner = auth.uid());
CREATE POLICY "vp_proofs_own_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'varadhi-proofs' AND owner = auth.uid());
CREATE POLICY "vp_proofs_own_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'varadhi-proofs' AND owner = auth.uid());

-- varadhi-listings: owner write, all authenticated read
CREATE POLICY "vl_listings_read" ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id = 'varadhi-listings');
CREATE POLICY "vl_listings_own_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'varadhi-listings' AND owner = auth.uid());
CREATE POLICY "vl_listings_own_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'varadhi-listings' AND owner = auth.uid());
CREATE POLICY "vl_listings_own_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'varadhi-listings' AND owner = auth.uid());
