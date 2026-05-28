drop policy if exists "vendor_profiles_public_directory_read" on public.vendor_profiles;
create policy "vendor_profiles_public_directory_read"
on public.vendor_profiles
for select
to anon, authenticated
using (
  account_status in ('approved', 'in_good_standing', 'needs_updates')
);
