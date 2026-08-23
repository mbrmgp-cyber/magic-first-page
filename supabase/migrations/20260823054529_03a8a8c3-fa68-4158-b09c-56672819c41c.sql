UPDATE public.platform_super_admin_seed SET email = 'mbrplatform@gmail.com' WHERE lower(email) = 'mbrproduct@gmail.com';
INSERT INTO public.platform_super_admin_seed (email, role) VALUES
  ('mbrplatform@gmail.com', 'varadhi_admin'),
  ('mbrplatform@gmail.com', 'mbr_admin')
ON CONFLICT (email) DO NOTHING;