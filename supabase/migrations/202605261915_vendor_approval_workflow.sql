alter type public.vendor_account_status add value if not exists 'not_approved';
alter type public.vendor_account_status add value if not exists 'approved';
alter type public.vendor_account_status add value if not exists 'in_good_standing';

update public.vendor_profiles
set account_status = 'not_approved'
where account_status = 'pending_review';

alter table public.vendor_profiles
  alter column account_status set default 'not_approved';

alter table public.vendor_profiles
  add column if not exists company_logo_url text;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'vendor_dispute_status'
  ) then
    create type public.vendor_dispute_status as enum (
      'open',
      'under_review',
      'resolved',
      'dismissed'
    );
  end if;
end
$$;

create table if not exists public.vendor_admin_notes (
  id uuid primary key default gen_random_uuid(),
  vendor_user_id uuid not null references public.vendor_profiles (user_id) on delete cascade,
  author_email text not null,
  note_body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists vendor_admin_notes_vendor_user_id_idx
  on public.vendor_admin_notes (vendor_user_id, created_at desc);

create table if not exists public.vendor_review_disputes (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.vendor_reviews (id) on delete cascade,
  vendor_user_id uuid not null references public.vendor_profiles (user_id) on delete cascade,
  submitted_by_user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null,
  detail text not null,
  dispute_status public.vendor_dispute_status not null default 'open',
  admin_resolution_note text,
  resolved_by_email text,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists vendor_review_disputes_vendor_user_id_idx
  on public.vendor_review_disputes (vendor_user_id, created_at desc);

create index if not exists vendor_review_disputes_review_id_idx
  on public.vendor_review_disputes (review_id, created_at desc);

drop trigger if exists set_vendor_review_disputes_updated_at on public.vendor_review_disputes;
create trigger set_vendor_review_disputes_updated_at
before update on public.vendor_review_disputes
for each row
execute function public.set_updated_at();

create or replace function public.handle_vendor_first_activity_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.review_status = 'published' then
    update public.vendor_profiles
    set account_status = 'in_good_standing'
    where user_id = new.vendor_user_id
      and account_status = 'approved';
  end if;

  return new;
end;
$$;

drop trigger if exists set_vendor_status_on_first_review on public.vendor_reviews;
create trigger set_vendor_status_on_first_review
after insert on public.vendor_reviews
for each row
execute function public.handle_vendor_first_activity_status();

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
    company_logo_url,
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
    'not_approved',
    nullif(trim(new.raw_user_meta_data ->> 'badge_url'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'company_logo_url'), ''),
    timezone('utc', now())
  )
  on conflict (user_id) do update
  set owner_name = excluded.owner_name,
      company_name = excluded.company_name,
      website_url = excluded.website_url,
      address = excluded.address,
      phone_number = excluded.phone_number,
      email = excluded.email,
      badge_url = excluded.badge_url,
      company_logo_url = excluded.company_logo_url;

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

alter table public.vendor_admin_notes enable row level security;
alter table public.vendor_review_disputes enable row level security;

drop policy if exists "vendor_admin_notes_admin_read" on public.vendor_admin_notes;
create policy "vendor_admin_notes_admin_read"
on public.vendor_admin_notes
for select
to authenticated
using (public.is_admin_portal_user());

drop policy if exists "vendor_admin_notes_admin_insert" on public.vendor_admin_notes;
create policy "vendor_admin_notes_admin_insert"
on public.vendor_admin_notes
for insert
to authenticated
with check (public.is_admin_portal_user());

drop policy if exists "vendor_review_disputes_vendor_or_admin_read" on public.vendor_review_disputes;
create policy "vendor_review_disputes_vendor_or_admin_read"
on public.vendor_review_disputes
for select
to authenticated
using (
  auth.uid() = vendor_user_id
  or public.is_admin_portal_user()
);

drop policy if exists "vendor_review_disputes_vendor_insert" on public.vendor_review_disputes;
create policy "vendor_review_disputes_vendor_insert"
on public.vendor_review_disputes
for insert
to authenticated
with check (
  auth.uid() = vendor_user_id
  and auth.uid() = submitted_by_user_id
);

drop policy if exists "vendor_review_disputes_admin_update" on public.vendor_review_disputes;
create policy "vendor_review_disputes_admin_update"
on public.vendor_review_disputes
for update
to authenticated
using (public.is_admin_portal_user())
with check (public.is_admin_portal_user());

insert into storage.buckets (id, name, public)
values ('vendor-assets', 'vendor-assets', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

drop policy if exists "vendor_assets_public_read" on storage.objects;
create policy "vendor_assets_public_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'vendor-assets');

drop policy if exists "vendor_assets_vendor_insert" on storage.objects;
create policy "vendor_assets_vendor_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'vendor-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "vendor_assets_vendor_update" on storage.objects;
create policy "vendor_assets_vendor_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'vendor-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'vendor-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "vendor_assets_vendor_delete" on storage.objects;
create policy "vendor_assets_vendor_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'vendor-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);
