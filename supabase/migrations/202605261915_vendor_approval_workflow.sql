alter type public.vendor_account_status add value if not exists 'not_approved';
alter type public.vendor_account_status add value if not exists 'approved';
alter type public.vendor_account_status add value if not exists 'in_good_standing';
