
CREATE POLICY "Authenticated can read media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'media');

CREATE POLICY "Users upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'media' AND owner = auth.uid());

CREATE POLICY "Users delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'media' AND owner = auth.uid());
