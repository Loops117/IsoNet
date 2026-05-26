create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists admin_users_email_unique
  on public.admin_users (lower(email));

drop trigger if exists set_admin_users_updated_at on public.admin_users;
create trigger set_admin_users_updated_at
before update on public.admin_users
for each row
execute function public.set_updated_at();

create or replace function public.is_admin_portal_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and is_active = true
  );
$$;

alter table public.admin_users enable row level security;

drop policy if exists "admin_users_select_self_or_admin" on public.admin_users;
create policy "admin_users_select_self_or_admin"
on public.admin_users
for select
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin_portal_user()
);

create table if not exists public.site_homepage_panels (
  id text primary key,
  eyebrow text not null,
  title text not null,
  compact text not null,
  description text not null,
  points jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint site_homepage_panels_points_is_array
    check (jsonb_typeof(points) = 'array'),
  constraint site_homepage_panels_id_valid
    check (id in ('why-isonet', 'directory', 'reviews', 'standards'))
);

drop trigger if exists set_site_homepage_panels_updated_at on public.site_homepage_panels;
create trigger set_site_homepage_panels_updated_at
before update on public.site_homepage_panels
for each row
execute function public.set_updated_at();

alter table public.site_homepage_panels enable row level security;

drop policy if exists "site_homepage_panels_public_read" on public.site_homepage_panels;
create policy "site_homepage_panels_public_read"
on public.site_homepage_panels
for select
to anon, authenticated
using (true);

drop policy if exists "site_homepage_panels_admin_insert" on public.site_homepage_panels;
create policy "site_homepage_panels_admin_insert"
on public.site_homepage_panels
for insert
to authenticated
with check (public.is_admin_portal_user());

drop policy if exists "site_homepage_panels_admin_update" on public.site_homepage_panels;
create policy "site_homepage_panels_admin_update"
on public.site_homepage_panels
for update
to authenticated
using (public.is_admin_portal_user())
with check (public.is_admin_portal_user());

drop policy if exists "site_homepage_panels_admin_delete" on public.site_homepage_panels;
create policy "site_homepage_panels_admin_delete"
on public.site_homepage_panels
for delete
to authenticated
using (public.is_admin_portal_user());

insert into public.site_homepage_panels (
  id,
  eyebrow,
  title,
  compact,
  description,
  points,
  sort_order
)
values
  (
    'why-isonet',
    'Why IsoNet',
    'The hobby deserves a recognizable standard.',
    'A public trust signal for vendors and hobbyists alike.',
    'Reliable vendors should be easier to find, and poor practices should be easier to identify. IsoNet is being structured to support both goals through clear standards, documented feedback, and a public trust signal customers can understand at a glance.',
    '["Create a visible standard customers can rely on.","Reward vendors who consistently operate responsibly.","Make accountability part of the hobby''s normal expectations."]'::jsonb,
    1
  ),
  (
    'directory',
    'Directory',
    'Find vendors the community can trust.',
    'A public list of sellers that meet the network standard.',
    'IsoNet will maintain a public list of approved vendors who agree to follow shared standards for listings, shipping, communication, and issue resolution.',
    '["Publicly list vendors in good standing.","Help hobbyists compare sellers with more confidence.","Give trusted vendors a clearer mark of credibility."]'::jsonb,
    2
  ),
  (
    'reviews',
    'Reviews',
    'Give hobbyists one place to verify a seller.',
    'Centralized reviews and pattern tracking for customer safety.',
    'Reviews, documented experiences, and pattern tracking will help customers make informed decisions and help vendors protect their reputation through consistent service.',
    '["Centralize review visibility for buyers.","Identify recurring issues before they become widespread.","Preserve fair reputations through documented experiences."]'::jsonb,
    3
  ),
  (
    'standards',
    'Standards',
    'Raise the baseline for the hobby.',
    'Formal expectations around care, honesty, and service.',
    'The network is being built to formalize expectations around care, ethics, honesty in listings, and the customer experience so reputable vendors can stand apart.',
    '["Set clear standards for conduct and communication.","Support ethical sales and more consistent care expectations.","Separate dependable vendors from low-effort operators."]'::jsonb,
    4
  )
on conflict (id) do nothing;
