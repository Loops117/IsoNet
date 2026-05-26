do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'vendor_account_status'
  ) then
    create type public.vendor_account_status as enum (
      'pending_review',
      'active',
      'needs_updates',
      'suspended'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'vendor_subscription_status'
  ) then
    create type public.vendor_subscription_status as enum (
      'inactive',
      'trialing',
      'active',
      'past_due',
      'canceled'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'vendor_review_status'
  ) then
    create type public.vendor_review_status as enum (
      'published',
      'hidden'
    );
  end if;
end
$$;

create table if not exists public.vendor_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  owner_name text not null,
  company_name text not null,
  website_url text,
  address text,
  phone_number text,
  email text not null,
  account_status public.vendor_account_status not null default 'pending_review',
  badge_url text,
  average_rating numeric(3,2) not null default 0,
  review_count integer not null default 0,
  start_date timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists vendor_profiles_email_unique
  on public.vendor_profiles (lower(email));

drop trigger if exists set_vendor_profiles_updated_at on public.vendor_profiles;
create trigger set_vendor_profiles_updated_at
before update on public.vendor_profiles
for each row
execute function public.set_updated_at();

create table if not exists public.vendor_social_links (
  id uuid primary key default gen_random_uuid(),
  vendor_user_id uuid not null references public.vendor_profiles (user_id) on delete cascade,
  platform text not null,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists vendor_social_links_vendor_user_id_idx
  on public.vendor_social_links (vendor_user_id, sort_order);

drop trigger if exists set_vendor_social_links_updated_at on public.vendor_social_links;
create trigger set_vendor_social_links_updated_at
before update on public.vendor_social_links
for each row
execute function public.set_updated_at();

create table if not exists public.vendor_subscriptions (
  vendor_user_id uuid primary key references public.vendor_profiles (user_id) on delete cascade,
  tier_name text not null default 'Application',
  status public.vendor_subscription_status not null default 'inactive',
  started_at timestamptz not null default timezone('utc', now()),
  renews_at timestamptz,
  canceled_at timestamptz,
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_vendor_subscriptions_updated_at on public.vendor_subscriptions;
create trigger set_vendor_subscriptions_updated_at
before update on public.vendor_subscriptions
for each row
execute function public.set_updated_at();

create table if not exists public.vendor_reviews (
  id uuid primary key default gen_random_uuid(),
  vendor_user_id uuid not null references public.vendor_profiles (user_id) on delete cascade,
  reviewer_name text not null,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text,
  review_status public.vendor_review_status not null default 'published',
  published_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists vendor_reviews_vendor_user_id_idx
  on public.vendor_reviews (vendor_user_id, published_at desc);

drop trigger if exists set_vendor_reviews_updated_at on public.vendor_reviews;
create trigger set_vendor_reviews_updated_at
before update on public.vendor_reviews
for each row
execute function public.set_updated_at();

create or replace function public.refresh_vendor_review_stats(target_vendor_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  published_average numeric(3,2);
  published_count integer;
begin
  select
    coalesce(round(avg(rating)::numeric, 2), 0),
    count(*)
  into published_average, published_count
  from public.vendor_reviews
  where vendor_user_id = target_vendor_user_id
    and review_status = 'published';

  update public.vendor_profiles
  set average_rating = published_average,
      review_count = published_count
  where user_id = target_vendor_user_id;
end;
$$;

create or replace function public.handle_vendor_review_stat_refresh()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_vendor_review_stats(coalesce(new.vendor_user_id, old.vendor_user_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists refresh_vendor_review_stats_after_change on public.vendor_reviews;
create trigger refresh_vendor_review_stats_after_change
after insert or update or delete on public.vendor_reviews
for each row
execute function public.handle_vendor_review_stat_refresh();

create or replace function public.handle_new_vendor_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  social_link jsonb;
  social_links jsonb := coalesce(new.raw_user_meta_data -> 'social_links', '[]'::jsonb);
  vendor_email text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'company_email'), ''),
    nullif(trim(new.email), '')
  );
begin
  if coalesce(new.raw_user_meta_data ->> 'account_role', '') <> 'vendor' then
    return new;
  end if;

  insert into public.vendor_profiles (
    user_id,
    owner_name,
    company_name,
    website_url,
    address,
    phone_number,
    email,
    account_status,
    badge_url,
    start_date
  )
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'owner_name'), ''), 'Vendor Owner'),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'company_name'), ''), 'Vendor Company'),
    nullif(trim(new.raw_user_meta_data ->> 'website_url'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'address'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'phone_number'), ''),
    coalesce(vendor_email, 'pending-email@example.com'),
    'pending_review',
    nullif(trim(new.raw_user_meta_data ->> 'badge_url'), ''),
    timezone('utc', now())
  )
  on conflict (user_id) do update
  set owner_name = excluded.owner_name,
      company_name = excluded.company_name,
      website_url = excluded.website_url,
      address = excluded.address,
      phone_number = excluded.phone_number,
      email = excluded.email,
      badge_url = excluded.badge_url;

  delete from public.vendor_social_links
  where vendor_user_id = new.id;

  for social_link in
    select value
    from jsonb_array_elements(social_links)
  loop
    if coalesce(nullif(trim(social_link ->> 'url'), ''), '') <> '' then
      insert into public.vendor_social_links (
        vendor_user_id,
        platform,
        url,
        sort_order
      )
      values (
        new.id,
        coalesce(nullif(trim(social_link ->> 'platform'), ''), 'Social'),
        trim(social_link ->> 'url'),
        coalesce((social_link ->> 'sort_order')::integer, 0)
      );
    end if;
  end loop;

  insert into public.vendor_subscriptions (
    vendor_user_id,
    tier_name,
    status,
    started_at
  )
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'subscription_tier'), ''), 'Application'),
    'inactive',
    timezone('utc', now())
  )
  on conflict (vendor_user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_vendor_portal_user_after_signup on auth.users;
create trigger create_vendor_portal_user_after_signup
after insert on auth.users
for each row
execute function public.handle_new_vendor_user();

alter table public.vendor_profiles enable row level security;
alter table public.vendor_social_links enable row level security;
alter table public.vendor_subscriptions enable row level security;
alter table public.vendor_reviews enable row level security;

drop policy if exists "vendor_profiles_select_self_or_admin" on public.vendor_profiles;
create policy "vendor_profiles_select_self_or_admin"
on public.vendor_profiles
for select
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin_portal_user()
);

drop policy if exists "vendor_profiles_insert_self_or_admin" on public.vendor_profiles;
create policy "vendor_profiles_insert_self_or_admin"
on public.vendor_profiles
for insert
to authenticated
with check (
  auth.uid() = user_id
  or public.is_admin_portal_user()
);

drop policy if exists "vendor_profiles_update_self_or_admin" on public.vendor_profiles;
create policy "vendor_profiles_update_self_or_admin"
on public.vendor_profiles
for update
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin_portal_user()
)
with check (
  auth.uid() = user_id
  or public.is_admin_portal_user()
);

drop policy if exists "vendor_social_links_select_self_or_admin" on public.vendor_social_links;
create policy "vendor_social_links_select_self_or_admin"
on public.vendor_social_links
for select
to authenticated
using (
  auth.uid() = vendor_user_id
  or public.is_admin_portal_user()
);

drop policy if exists "vendor_social_links_insert_self_or_admin" on public.vendor_social_links;
create policy "vendor_social_links_insert_self_or_admin"
on public.vendor_social_links
for insert
to authenticated
with check (
  auth.uid() = vendor_user_id
  or public.is_admin_portal_user()
);

drop policy if exists "vendor_social_links_update_self_or_admin" on public.vendor_social_links;
create policy "vendor_social_links_update_self_or_admin"
on public.vendor_social_links
for update
to authenticated
using (
  auth.uid() = vendor_user_id
  or public.is_admin_portal_user()
)
with check (
  auth.uid() = vendor_user_id
  or public.is_admin_portal_user()
);

drop policy if exists "vendor_social_links_delete_self_or_admin" on public.vendor_social_links;
create policy "vendor_social_links_delete_self_or_admin"
on public.vendor_social_links
for delete
to authenticated
using (
  auth.uid() = vendor_user_id
  or public.is_admin_portal_user()
);

drop policy if exists "vendor_subscriptions_select_self_or_admin" on public.vendor_subscriptions;
create policy "vendor_subscriptions_select_self_or_admin"
on public.vendor_subscriptions
for select
to authenticated
using (
  auth.uid() = vendor_user_id
  or public.is_admin_portal_user()
);

drop policy if exists "vendor_subscriptions_admin_insert" on public.vendor_subscriptions;
create policy "vendor_subscriptions_admin_insert"
on public.vendor_subscriptions
for insert
to authenticated
with check (public.is_admin_portal_user());

drop policy if exists "vendor_subscriptions_admin_update" on public.vendor_subscriptions;
create policy "vendor_subscriptions_admin_update"
on public.vendor_subscriptions
for update
to authenticated
using (public.is_admin_portal_user())
with check (public.is_admin_portal_user());

drop policy if exists "vendor_reviews_public_or_owner_read" on public.vendor_reviews;
create policy "vendor_reviews_public_or_owner_read"
on public.vendor_reviews
for select
to anon, authenticated
using (
  review_status = 'published'
  or auth.uid() = vendor_user_id
  or public.is_admin_portal_user()
);

drop policy if exists "vendor_reviews_admin_insert" on public.vendor_reviews;
create policy "vendor_reviews_admin_insert"
on public.vendor_reviews
for insert
to authenticated
with check (public.is_admin_portal_user());

drop policy if exists "vendor_reviews_admin_update" on public.vendor_reviews;
create policy "vendor_reviews_admin_update"
on public.vendor_reviews
for update
to authenticated
using (public.is_admin_portal_user())
with check (public.is_admin_portal_user());

drop policy if exists "vendor_reviews_admin_delete" on public.vendor_reviews;
create policy "vendor_reviews_admin_delete"
on public.vendor_reviews
for delete
to authenticated
using (public.is_admin_portal_user());
