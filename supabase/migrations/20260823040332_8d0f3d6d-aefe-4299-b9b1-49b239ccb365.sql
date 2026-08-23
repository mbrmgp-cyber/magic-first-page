create table if not exists public.translation_memory (
  id uuid primary key default gen_random_uuid(),
  lang text not null,
  source_hash text not null,
  source_text text not null,
  translated_text text not null,
  created_at timestamptz not null default now(),
  unique (lang, source_hash)
);

grant select on public.translation_memory to anon, authenticated;
grant all on public.translation_memory to service_role;

alter table public.translation_memory enable row level security;

drop policy if exists tm_public_read on public.translation_memory;
create policy tm_public_read on public.translation_memory
  for select to anon, authenticated using (true);

create index if not exists translation_memory_lang_idx on public.translation_memory (lang);