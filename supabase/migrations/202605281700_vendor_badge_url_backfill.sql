-- Assign stable public badge URLs for approved vendors (image may still be generated later).
update public.vendor_profiles
set badge_url = 'https://theisopodnetwork.com/badges/vendor/' || user_id::text
where badge_url is null
  and account_status in ('approved', 'in_good_standing', 'active');
