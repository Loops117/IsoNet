alter table public.badge_global_settings
  add column if not exists vendor_badges_live boolean not null default false;
