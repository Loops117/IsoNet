create table if not exists public.forum_categories (
  id text primary key,
  title text not null,
  description text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_forum_categories_updated_at on public.forum_categories;
create trigger set_forum_categories_updated_at
before update on public.forum_categories
for each row
execute function public.set_updated_at();

create table if not exists public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  category_id text not null references public.forum_categories (id) on delete restrict,
  author_user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint forum_threads_title_not_empty check (char_length(trim(title)) > 0),
  constraint forum_threads_body_not_empty check (char_length(trim(body)) > 0)
);

create index if not exists forum_threads_category_id_idx
  on public.forum_threads (category_id, updated_at desc);

create index if not exists forum_threads_author_user_id_idx
  on public.forum_threads (author_user_id);

drop trigger if exists set_forum_threads_updated_at on public.forum_threads;
create trigger set_forum_threads_updated_at
before update on public.forum_threads
for each row
execute function public.set_updated_at();

create table if not exists public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads (id) on delete cascade,
  author_user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint forum_replies_body_not_empty check (char_length(trim(body)) > 0)
);

create index if not exists forum_replies_thread_id_idx
  on public.forum_replies (thread_id, created_at asc);

drop trigger if exists set_forum_replies_updated_at on public.forum_replies;
create trigger set_forum_replies_updated_at
before update on public.forum_replies
for each row
execute function public.set_updated_at();

create or replace function public.touch_forum_thread_on_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.forum_threads
  set updated_at = timezone('utc', now())
  where id = new.thread_id;

  return new;
end;
$$;

drop trigger if exists forum_replies_touch_thread on public.forum_replies;
create trigger forum_replies_touch_thread
after insert on public.forum_replies
for each row
execute function public.touch_forum_thread_on_reply();

create or replace function public.is_forum_vendor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vendor_profiles
    where user_id = auth.uid()
  );
$$;

alter table public.forum_categories enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_replies enable row level security;

drop policy if exists "forum_categories_public_read" on public.forum_categories;
create policy "forum_categories_public_read"
on public.forum_categories
for select
to anon, authenticated
using (true);

drop policy if exists "forum_threads_public_read" on public.forum_threads;
create policy "forum_threads_public_read"
on public.forum_threads
for select
to anon, authenticated
using (true);

drop policy if exists "forum_threads_vendor_insert" on public.forum_threads;
create policy "forum_threads_vendor_insert"
on public.forum_threads
for insert
to authenticated
with check (
  auth.uid() = author_user_id
  and public.is_forum_vendor()
);

drop policy if exists "forum_threads_author_update" on public.forum_threads;
create policy "forum_threads_author_update"
on public.forum_threads
for update
to authenticated
using (auth.uid() = author_user_id and public.is_forum_vendor())
with check (auth.uid() = author_user_id and public.is_forum_vendor());

drop policy if exists "forum_replies_public_read" on public.forum_replies;
create policy "forum_replies_public_read"
on public.forum_replies
for select
to anon, authenticated
using (true);

drop policy if exists "forum_replies_vendor_insert" on public.forum_replies;
create policy "forum_replies_vendor_insert"
on public.forum_replies
for insert
to authenticated
with check (
  auth.uid() = author_user_id
  and public.is_forum_vendor()
);

drop policy if exists "forum_replies_author_update" on public.forum_replies;
create policy "forum_replies_author_update"
on public.forum_replies
for update
to authenticated
using (auth.uid() = author_user_id and public.is_forum_vendor())
with check (auth.uid() = author_user_id and public.is_forum_vendor());

insert into public.forum_categories (id, title, description, sort_order)
values
  (
    'general',
    'General discussion',
    'Introduce yourself, share setups, and talk invert keeping with other hobbyists who care about doing it right.',
    1
  ),
  (
    'vendor-experiences',
    'Vendor experiences & reviews',
    'Discuss sellers, share documented experiences, and help others buy with more context—aligned with IsoNet accountability goals.',
    2
  ),
  (
    'care-husbandry',
    'Care & husbandry',
    'Species care, breeding, enclosure builds, and problem-solving—practical help from the community.',
    3
  ),
  (
    'standards',
    'Standards & accountability',
    'Questions about IsoNet expectations, the badge, standing, and what trustworthy selling should look like in the hobby.',
    4
  ),
  (
    'marketplace-watch',
    'Marketplace watch',
    'Spot questionable listings, labeling issues, and practices that hurt buyers—so patterns are visible before money changes hands.',
    5
  )
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());
