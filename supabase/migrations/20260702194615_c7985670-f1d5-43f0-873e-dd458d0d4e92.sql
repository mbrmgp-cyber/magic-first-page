
create table if not exists public.auction_month_archives (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  auction_id uuid not null references public.auction_sessions(id) on delete cascade,
  group_name text not null,
  month_no integer not null,
  chit_value numeric not null default 0,
  total_months integer not null default 0,
  commission_pct numeric not null default 0,
  participants jsonb not null default '[]'::jsonb,
  bids jsonb not null default '[]'::jsonb,
  consents jsonb not null default '{}'::jsonb,
  winner jsonb,
  turn_start timestamptz,
  turn_end timestamptz,
  closed_at timestamptz not null default now(),
  archived_by uuid,
  created_at timestamptz not null default now(),
  unique (auction_id, month_no)
);

grant select, insert, update, delete on public.auction_month_archives to authenticated;
grant all on public.auction_month_archives to service_role;

create index if not exists auction_month_archives_org_idx
  on public.auction_month_archives (org_id, group_name, month_no);

alter table public.auction_month_archives enable row level security;

drop policy if exists "archives_read" on public.auction_month_archives;
create policy "archives_read"
  on public.auction_month_archives
  for select
  to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.org_id = auction_month_archives.org_id
        and m.user_id = auth.uid()
    )
    or exists (
      select 1 from public.organizations o
      where o.id = auction_month_archives.org_id
        and o.admin_user_id = auth.uid()
    )
  );

drop policy if exists "archives_write" on public.auction_month_archives;
create policy "archives_write"
  on public.auction_month_archives
  for all
  to authenticated
  using (public.can_edit_org(auction_month_archives.org_id))
  with check (public.can_edit_org(auction_month_archives.org_id));
