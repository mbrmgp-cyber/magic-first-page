
CREATE POLICY "Authenticated can view milestone photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'milestone-photos');

CREATE POLICY "Authenticated can upload milestone photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'milestone-photos' AND owner = auth.uid());

CREATE POLICY "Owners can update their milestone photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'milestone-photos' AND owner = auth.uid());

CREATE POLICY "Owners can delete their milestone photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'milestone-photos' AND owner = auth.uid());
