alter table public.forum_categories
  add column if not exists is_visible boolean not null default true,
  add column if not exists view_audience text not null default 'public',
  add column if not exists post_audience text not null default 'vendor';

alter table public.forum_categories
  drop constraint if exists forum_categories_view_audience_check;

alter table public.forum_categories
  add constraint forum_categories_view_audience_check check (
    view_audience in ('public', 'authenticated', 'vendor')
  );

alter table public.forum_categories
  drop constraint if exists forum_categories_post_audience_check;

alter table public.forum_categories
  add constraint forum_categories_post_audience_check check (
    post_audience in ('authenticated', 'vendor')
  );

create or replace function public.can_view_forum_category(p_category_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.forum_categories c
    where c.id = p_category_id
      and c.is_visible
      and (
        c.view_audience = 'public'
        or (c.view_audience = 'authenticated' and auth.uid() is not null)
        or (c.view_audience = 'vendor' and public.is_forum_vendor())
      )
  );
$$;

create or replace function public.can_post_in_forum_category(p_category_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.forum_categories c
    where c.id = p_category_id
      and c.is_visible
      and public.can_view_forum_category(c.id)
      and auth.uid() is not null
      and (
        (c.post_audience = 'vendor' and public.is_forum_vendor())
        or c.post_audience = 'authenticated'
      )
  );
$$;

drop policy if exists "forum_categories_public_read" on public.forum_categories;
create policy "forum_categories_visible_read"
on public.forum_categories
for select
to anon, authenticated
using (
  is_visible
  and (
    view_audience = 'public'
    or (view_audience = 'authenticated' and auth.uid() is not null)
    or (view_audience = 'vendor' and public.is_forum_vendor())
  )
);

drop policy if exists "forum_categories_admin_manage" on public.forum_categories;
create policy "forum_categories_admin_manage"
on public.forum_categories
for all
to authenticated
using (public.is_admin_portal_user())
with check (public.is_admin_portal_user());

drop policy if exists "forum_threads_public_read" on public.forum_threads;
create policy "forum_threads_visible_read"
on public.forum_threads
for select
to anon, authenticated
using (public.can_view_forum_category(category_id));

drop policy if exists "forum_threads_vendor_insert" on public.forum_threads;
create policy "forum_threads_post_insert"
on public.forum_threads
for insert
to authenticated
with check (
  auth.uid() = author_user_id
  and public.can_post_in_forum_category(category_id)
);

drop policy if exists "forum_threads_author_update" on public.forum_threads;
create policy "forum_threads_author_update"
on public.forum_threads
for update
to authenticated
using (
  auth.uid() = author_user_id
  and public.can_post_in_forum_category(category_id)
)
with check (
  auth.uid() = author_user_id
  and public.can_post_in_forum_category(category_id)
);

drop policy if exists "forum_replies_public_read" on public.forum_replies;
create policy "forum_replies_visible_read"
on public.forum_replies
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.forum_threads t
    where t.id = thread_id
      and public.can_view_forum_category(t.category_id)
  )
);

drop policy if exists "forum_replies_vendor_insert" on public.forum_replies;
create policy "forum_replies_post_insert"
on public.forum_replies
for insert
to authenticated
with check (
  auth.uid() = author_user_id
  and exists (
    select 1
    from public.forum_threads t
    where t.id = thread_id
      and public.can_post_in_forum_category(t.category_id)
  )
);

drop policy if exists "forum_replies_author_update" on public.forum_replies;
create policy "forum_replies_author_update"
on public.forum_replies
for update
to authenticated
using (
  auth.uid() = author_user_id
  and exists (
    select 1
    from public.forum_threads t
    where t.id = thread_id
      and public.can_post_in_forum_category(t.category_id)
  )
)
with check (
  auth.uid() = author_user_id
  and exists (
    select 1
    from public.forum_threads t
    where t.id = thread_id
      and public.can_post_in_forum_category(t.category_id)
  )
);
