create table if not exists public.vendor_statement_agreements (
  id uuid primary key default gen_random_uuid(),
  vendor_user_id uuid not null references public.vendor_profiles (user_id) on delete cascade,
  agreement_key text not null,
  agreement_title text not null,
  agreed_at timestamptz not null,
  statement_version text not null default '2026-05-27',
  created_at timestamptz not null default timezone('utc', now()),
  unique (vendor_user_id, agreement_key)
);

create index if not exists vendor_statement_agreements_vendor_user_id_idx
  on public.vendor_statement_agreements (vendor_user_id, agreed_at desc);

alter table public.vendor_statement_agreements enable row level security;

drop policy if exists "vendor_statement_agreements_select_self_or_admin"
  on public.vendor_statement_agreements;
create policy "vendor_statement_agreements_select_self_or_admin"
on public.vendor_statement_agreements
for select
to authenticated
using (
  vendor_user_id = auth.uid()
  or public.is_admin_portal_user()
);

drop policy if exists "vendor_statement_agreements_insert_self_or_admin"
  on public.vendor_statement_agreements;
create policy "vendor_statement_agreements_insert_self_or_admin"
on public.vendor_statement_agreements
for insert
to authenticated
with check (
  vendor_user_id = auth.uid()
  or public.is_admin_portal_user()
);

create or replace function public.handle_new_vendor_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  social_link jsonb;
  agreement jsonb;
  social_links jsonb := coalesce(new.raw_user_meta_data -> 'social_links', '[]'::jsonb);
  statement_agreements jsonb := coalesce(
    new.raw_user_meta_data -> 'statement_agreements',
    '[]'::jsonb
  );
  vendor_email text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'company_email'), ''),
    nullif(trim(new.email), '')
  );
  vendor_first_name text := nullif(trim(new.raw_user_meta_data ->> 'first_name'), '');
  vendor_last_name text := nullif(trim(new.raw_user_meta_data ->> 'last_name'), '');
  vendor_owner_name text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'owner_name'), ''),
    nullif(trim(concat_ws(' ', vendor_first_name, vendor_last_name)), ''),
    'Vendor Owner'
  );
  vendor_street_address text := nullif(trim(new.raw_user_meta_data ->> 'street_address'), '');
  vendor_address_line_2 text := nullif(trim(new.raw_user_meta_data ->> 'address_line_2'), '');
  vendor_city text := nullif(trim(new.raw_user_meta_data ->> 'city'), '');
  vendor_state_province text := nullif(trim(new.raw_user_meta_data ->> 'state_province'), '');
  vendor_postal_code text := nullif(trim(new.raw_user_meta_data ->> 'postal_code'), '');
  vendor_country text := nullif(trim(new.raw_user_meta_data ->> 'country'), '');
  vendor_address text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'address'), ''),
    nullif(
      trim(
        concat_ws(
          ', ',
          vendor_street_address,
          vendor_address_line_2,
          vendor_city,
          vendor_state_province,
          vendor_postal_code,
          vendor_country
        )
      ),
      ''
    )
  );
begin
  if coalesce(new.raw_user_meta_data ->> 'account_role', '') <> 'vendor' then
    return new;
  end if;

  insert into public.vendor_profiles (
    user_id,
    owner_name,
    first_name,
    last_name,
    company_name,
    website_url,
    address,
    street_address,
    address_line_2,
    city,
    state_province,
    postal_code,
    country,
    phone_number,
    email,
    account_status,
    badge_url,
    company_logo_url,
    start_date
  )
  values (
    new.id,
    vendor_owner_name,
    vendor_first_name,
    vendor_last_name,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'company_name'), ''), 'Vendor Company'),
    nullif(trim(new.raw_user_meta_data ->> 'website_url'), ''),
    vendor_address,
    vendor_street_address,
    vendor_address_line_2,
    vendor_city,
    vendor_state_province,
    vendor_postal_code,
    vendor_country,
    nullif(trim(new.raw_user_meta_data ->> 'phone_number'), ''),
    coalesce(vendor_email, 'pending-email@example.com'),
    'not_approved',
    nullif(trim(new.raw_user_meta_data ->> 'badge_url'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'company_logo_url'), ''),
    timezone('utc', now())
  )
  on conflict (user_id) do update
  set owner_name = excluded.owner_name,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      company_name = excluded.company_name,
      website_url = excluded.website_url,
      address = excluded.address,
      street_address = excluded.street_address,
      address_line_2 = excluded.address_line_2,
      city = excluded.city,
      state_province = excluded.state_province,
      postal_code = excluded.postal_code,
      country = excluded.country,
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

  delete from public.vendor_statement_agreements
  where vendor_user_id = new.id;

  for agreement in
    select value
    from jsonb_array_elements(statement_agreements)
  loop
    if coalesce(nullif(trim(agreement ->> 'key'), ''), '') <> '' then
      insert into public.vendor_statement_agreements (
        vendor_user_id,
        agreement_key,
        agreement_title,
        agreed_at,
        statement_version
      )
      values (
        new.id,
        trim(agreement ->> 'key'),
        coalesce(nullif(trim(agreement ->> 'title'), ''), trim(agreement ->> 'key')),
        coalesce(
          nullif(trim(agreement ->> 'agreed_at'), '')::timestamptz,
          timezone('utc', now())
        ),
        coalesce(
          nullif(trim(agreement ->> 'statement_version'), ''),
          '2026-05-27'
        )
      )
      on conflict (vendor_user_id, agreement_key) do update
      set agreement_title = excluded.agreement_title,
          agreed_at = excluded.agreed_at,
          statement_version = excluded.statement_version;
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
