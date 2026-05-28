create table if not exists public.forum_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  actor_user_id uuid not null references auth.users (id) on delete cascade,
  thread_id uuid not null references public.forum_threads (id) on delete cascade,
  reply_id uuid references public.forum_replies (id) on delete cascade,
  kind text not null,
  thread_title text not null,
  preview text not null,
  created_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz,
  constraint forum_notifications_kind_check check (
    kind in ('thread_reply', 'participated_reply', 'mention')
  )
);

create unique index if not exists forum_notifications_recipient_reply_idx
  on public.forum_notifications (recipient_user_id, reply_id)
  where reply_id is not null;

create unique index if not exists forum_notifications_recipient_thread_idx
  on public.forum_notifications (recipient_user_id, thread_id)
  where reply_id is null;

create index if not exists forum_notifications_recipient_created_idx
  on public.forum_notifications (recipient_user_id, created_at desc);

create index if not exists forum_notifications_recipient_unread_idx
  on public.forum_notifications (recipient_user_id)
  where read_at is null;

alter table public.forum_notifications enable row level security;

drop policy if exists "forum_notifications_recipient_read" on public.forum_notifications;
create policy "forum_notifications_recipient_read"
on public.forum_notifications
for select
to authenticated
using (recipient_user_id = auth.uid());

drop policy if exists "forum_notifications_recipient_update" on public.forum_notifications;
create policy "forum_notifications_recipient_update"
on public.forum_notifications
for update
to authenticated
using (recipient_user_id = auth.uid())
with check (recipient_user_id = auth.uid());

create or replace function public.normalize_forum_mention_token(value text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(coalesce(value, ''), '[^a-z0-9]+', '', 'g'));
$$;

create or replace function public.resolve_forum_mention_user_id(mention text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  with token as (
    select public.normalize_forum_mention_token(mention) as normalized
  )
  select vp.user_id
  from public.vendor_profiles vp
  cross join token
  where token.normalized <> ''
    and (
      public.normalize_forum_mention_token(vp.company_name) = token.normalized
      or public.normalize_forum_mention_token(vp.owner_name) = token.normalized
      or public.normalize_forum_mention_token(
        trim(concat_ws(' ', vp.first_name, vp.last_name))
      ) = token.normalized
      or lower(trim(vp.company_name)) = lower(trim(mention))
      or lower(trim(vp.owner_name)) = lower(trim(mention))
    )
  limit 1;
$$;

create or replace function public.create_forum_notifications_for_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  thread_row public.forum_threads%rowtype;
  participant_user_id uuid;
  mention_match text[];
  mention_user_id uuid;
  notification_kind text;
begin
  select *
  into thread_row
  from public.forum_threads
  where id = new.thread_id;

  if not found then
    return new;
  end if;

  if thread_row.author_user_id is distinct from new.author_user_id then
    insert into public.forum_notifications (
      recipient_user_id,
      actor_user_id,
      thread_id,
      reply_id,
      kind,
      thread_title,
      preview
    )
    values (
      thread_row.author_user_id,
      new.author_user_id,
      thread_row.id,
      new.id,
      'thread_reply',
      thread_row.title,
      left(new.body, 240)
    )
    on conflict (recipient_user_id, reply_id) where reply_id is not null do update
    set
      kind = excluded.kind,
      preview = excluded.preview,
      thread_title = excluded.thread_title,
      actor_user_id = excluded.actor_user_id,
      read_at = null;
  end if;

  for participant_user_id in
    select distinct participant_id
    from (
      select thread_row.author_user_id as participant_id
      union
      select fr.author_user_id
      from public.forum_replies fr
      where fr.thread_id = new.thread_id
    ) participants
    where participant_id is distinct from new.author_user_id
      and participant_id is distinct from thread_row.author_user_id
  loop
    insert into public.forum_notifications (
      recipient_user_id,
      actor_user_id,
      thread_id,
      reply_id,
      kind,
      thread_title,
      preview
    )
    values (
      participant_user_id,
      new.author_user_id,
      thread_row.id,
      new.id,
      'participated_reply',
      thread_row.title,
      left(new.body, 240)
    )
    on conflict (recipient_user_id, reply_id) where reply_id is not null do nothing;
  end loop;

  for mention_match in
    select regexp_matches(new.body, '@([A-Za-z0-9][A-Za-z0-9 _.&''-]{0,60})', 'g')
  loop
    mention_user_id := public.resolve_forum_mention_user_id(mention_match[1]);

    if mention_user_id is null then
      continue;
    end if;

    if mention_user_id = new.author_user_id then
      continue;
    end if;

    insert into public.forum_notifications (
      recipient_user_id,
      actor_user_id,
      thread_id,
      reply_id,
      kind,
      thread_title,
      preview
    )
    values (
      mention_user_id,
      new.author_user_id,
      thread_row.id,
      new.id,
      'mention',
      thread_row.title,
      left(new.body, 240)
    )
    on conflict (recipient_user_id, reply_id) where reply_id is not null do update
    set
      kind = 'mention',
      preview = excluded.preview,
      thread_title = excluded.thread_title,
      actor_user_id = excluded.actor_user_id,
      read_at = null;
  end loop;

  return new;
end;
$$;

drop trigger if exists forum_replies_create_notifications on public.forum_replies;
create trigger forum_replies_create_notifications
after insert on public.forum_replies
for each row
execute function public.create_forum_notifications_for_reply();

create or replace function public.create_forum_notifications_for_thread()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mention_match text[];
  mention_user_id uuid;
begin
  for mention_match in
    select regexp_matches(new.body, '@([A-Za-z0-9][A-Za-z0-9 _.&''-]{0,60})', 'g')
  loop
    mention_user_id := public.resolve_forum_mention_user_id(mention_match[1]);

    if mention_user_id is null or mention_user_id = new.author_user_id then
      continue;
    end if;

    insert into public.forum_notifications (
      recipient_user_id,
      actor_user_id,
      thread_id,
      reply_id,
      kind,
      thread_title,
      preview
    )
    values (
      mention_user_id,
      new.author_user_id,
      new.id,
      null,
      'mention',
      new.title,
      left(new.body, 240)
    )
    on conflict (recipient_user_id, thread_id) where reply_id is null do update
    set
      kind = 'mention',
      preview = excluded.preview,
      thread_title = excluded.thread_title,
      actor_user_id = excluded.actor_user_id,
      read_at = null;
  end loop;

  return new;
end;
$$;

drop trigger if exists forum_threads_create_notifications on public.forum_threads;
create trigger forum_threads_create_notifications
after insert on public.forum_threads
for each row
execute function public.create_forum_notifications_for_thread();
