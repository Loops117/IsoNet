alter table public.vendor_profiles
  add column if not exists about_us_html text;

drop policy if exists "vendor_social_links_public_directory_read" on public.vendor_social_links;
create policy "vendor_social_links_public_directory_read"
on public.vendor_social_links
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.vendor_profiles vp
    where vp.user_id = vendor_user_id
      and vp.account_status in ('approved', 'in_good_standing', 'needs_updates')
  )
);
