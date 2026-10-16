drop policy if exists "Org admin can upload member photos" on storage.objects;
drop policy if exists "Org admin can update member photos" on storage.objects;
drop policy if exists "Org admin can delete member photos" on storage.objects;

create policy "Org admin can upload member photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'member-photos'
  and split_part(name, '/', 1) = 'admin'
  and split_part(name, '/', 2) ~ '^[0-9a-fA-F-]{36}$'
  and can_edit_org((split_part(name, '/', 2))::uuid)
);

create policy "Org admin can update member photos"
on storage.objects for update to authenticated
using (
  bucket_id = 'member-photos'
  and split_part(name, '/', 1) = 'admin'
  and split_part(name, '/', 2) ~ '^[0-9a-fA-F-]{36}$'
  and can_edit_org((split_part(name, '/', 2))::uuid)
);

create policy "Org admin can delete member photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'member-photos'
  and split_part(name, '/', 1) = 'admin'
  and split_part(name, '/', 2) ~ '^[0-9a-fA-F-]{36}$'
  and can_edit_org((split_part(name, '/', 2))::uuid)
);