create table if not exists public.vendor_admin_activity (
  id uuid primary key default gen_random_uuid(),
  vendor_user_id uuid not null references public.vendor_profiles (user_id) on delete cascade,
  activity_type text not null,
  actor_email text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists vendor_admin_activity_vendor_user_id_idx
  on public.vendor_admin_activity (vendor_user_id, created_at desc);

alter table public.vendor_admin_activity enable row level security;

drop policy if exists "vendor_admin_activity_admin_read" on public.vendor_admin_activity;
create policy "vendor_admin_activity_admin_read"
on public.vendor_admin_activity
for select
to authenticated
using (public.is_admin_portal_user());

drop policy if exists "vendor_admin_activity_admin_insert" on public.vendor_admin_activity;
create policy "vendor_admin_activity_admin_insert"
on public.vendor_admin_activity
for insert
to authenticated
with check (public.is_admin_portal_user());
