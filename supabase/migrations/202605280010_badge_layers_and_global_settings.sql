alter table public.vendor_profiles
  add column if not exists badge_tier smallint not null default 1;

create table if not exists public.badge_layer_assets (
  id uuid primary key default gen_random_uuid(),
  layer_type text not null check (layer_type in ('base', 'tier', 'month', 'year')),
  display_name text not null,
  storage_path text not null unique,
  tier_number smallint check (tier_number between 1 and 5),
  month_number smallint check (month_number between 1 and 12),
  year_number integer check (year_number between 2000 and 2100),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint badge_layer_assets_tier_assignment
    check ((layer_type <> 'tier') or tier_number is not null),
  constraint badge_layer_assets_month_assignment
    check ((layer_type <> 'month') or month_number is not null),
  constraint badge_layer_assets_year_assignment
    check ((layer_type <> 'year') or year_number is not null),
  constraint badge_layer_assets_base_assignment
    check ((layer_type <> 'base') or (tier_number is null and month_number is null and year_number is null))
);

create index if not exists badge_layer_assets_lookup_idx
  on public.badge_layer_assets (layer_type, tier_number, month_number, year_number, is_active);

drop trigger if exists set_badge_layer_assets_updated_at on public.badge_layer_assets;
create trigger set_badge_layer_assets_updated_at
before update on public.badge_layer_assets
for each row
execute function public.set_updated_at();

create table if not exists public.badge_global_settings (
  id text primary key default 'default',
  base_asset_id uuid references public.badge_layer_assets (id) on delete set null,
  default_homepage_tier smallint not null default 1 check (default_homepage_tier between 1 and 5),
  default_homepage_month smallint not null default 1 check (default_homepage_month between 1 and 12),
  default_homepage_year integer not null default extract(year from timezone('utc', now()))::integer,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_badge_global_settings_updated_at on public.badge_global_settings;
create trigger set_badge_global_settings_updated_at
before update on public.badge_global_settings
for each row
execute function public.set_updated_at();

insert into public.badge_global_settings (id)
values ('default')
on conflict (id) do nothing;

alter table public.badge_layer_assets enable row level security;
alter table public.badge_global_settings enable row level security;

drop policy if exists "badge_layer_assets_public_read" on public.badge_layer_assets;
create policy "badge_layer_assets_public_read"
on public.badge_layer_assets
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "badge_layer_assets_admin_insert" on public.badge_layer_assets;
create policy "badge_layer_assets_admin_insert"
on public.badge_layer_assets
for insert
to authenticated
with check (public.is_admin_portal_user());

drop policy if exists "badge_layer_assets_admin_update" on public.badge_layer_assets;
create policy "badge_layer_assets_admin_update"
on public.badge_layer_assets
for update
to authenticated
using (public.is_admin_portal_user())
with check (public.is_admin_portal_user());

drop policy if exists "badge_layer_assets_admin_delete" on public.badge_layer_assets;
create policy "badge_layer_assets_admin_delete"
on public.badge_layer_assets
for delete
to authenticated
using (public.is_admin_portal_user());

drop policy if exists "badge_global_settings_public_read" on public.badge_global_settings;
create policy "badge_global_settings_public_read"
on public.badge_global_settings
for select
to anon, authenticated
using (true);

drop policy if exists "badge_global_settings_admin_update" on public.badge_global_settings;
create policy "badge_global_settings_admin_update"
on public.badge_global_settings
for update
to authenticated
using (public.is_admin_portal_user())
with check (public.is_admin_portal_user());

insert into storage.buckets (id, name, public)
values ('badge-assets', 'badge-assets', true)
on conflict (id) do update
set public = true;
