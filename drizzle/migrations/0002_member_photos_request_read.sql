drop policy if exists "member_photos_request_read" on storage.objects;
create policy "member_photos_request_read"
on storage.objects for select to authenticated
using (
  bucket_id = 'member-photos'
  and split_part(name, '/', 1) = 'public-requests'
  and split_part(name, '/', 2) ~ '^[0-9a-fA-F-]{36}$'
  and (
    public.is_org_admin((split_part(name, '/', 2))::uuid)
    or public.is_org_member((split_part(name, '/', 2))::uuid)
    or public.is_org_committee((split_part(name, '/', 2))::uuid)
    or exists (
      select 1 from public.members m
      where m.photo_url = objects.name and m.user_id = auth.uid()
    )
  )
);