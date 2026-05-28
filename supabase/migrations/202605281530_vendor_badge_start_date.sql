alter table public.vendor_profiles
  add column if not exists badge_start_date timestamptz;

update public.vendor_profiles
set badge_start_date = coalesce(badge_start_date, start_date)
where account_status in ('approved', 'in_good_standing')
  and badge_start_date is null;
