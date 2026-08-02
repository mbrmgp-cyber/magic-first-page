drop policy if exists "varadhi listings owner insert" on storage.objects;
create policy "varadhi listings owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'varadhi-listings' and owner = auth.uid());

drop policy if exists "varadhi listings owner select" on storage.objects;
create policy "varadhi listings owner select" on storage.objects for select to authenticated
  using (bucket_id = 'varadhi-listings' and owner = auth.uid());

drop policy if exists "varadhi listings owner update" on storage.objects;
create policy "varadhi listings owner update" on storage.objects for update to authenticated
  using (bucket_id = 'varadhi-listings' and owner = auth.uid());

drop policy if exists "varadhi listings owner delete" on storage.objects;
create policy "varadhi listings owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'varadhi-listings' and owner = auth.uid());