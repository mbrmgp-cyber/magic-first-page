
CREATE POLICY "Authenticated can upload org docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'org-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated can read own org docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'org-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated can update own org docs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'org-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated can delete own org docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'org-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
