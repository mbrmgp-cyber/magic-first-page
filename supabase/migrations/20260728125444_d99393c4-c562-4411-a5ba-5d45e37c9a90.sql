insert into public.user_roles (user_id, role)
select u.id, 'varadhi_admin'::app_role from auth.users u
where lower(u.email) in ('mbrvaradhi@yahoo.com','mbrproduct@gmail.com')
on conflict (user_id, role) do nothing;