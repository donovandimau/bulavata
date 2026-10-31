-- Sota Kece — Activity (notifications).
-- One row per thing that happened to you: a reaction, a reply, a mention,
-- a friend request or acceptance, a scrawl on your wall, an RSVP to your event.
-- Rows are written by triggers inside the database, so nothing on the client
-- can forge one, and nothing is ever sent to a person who could not already
-- see the thing itself (the triggers fire after the existing policies and
-- functions have already allowed the write). Newest first, friends only, no
-- algorithm. Pattern from open social feeds (socialens / Meadows); written fresh.

create table if not exists bulavata.notifications (
  id bigint generated always as identity primary key,
  recipient uuid not null references bulavata.profiles(id) on delete cascade,
  actor uuid not null references bulavata.profiles(id) on delete cascade,
  kind text not null check (kind in ('reaction','reply','mention','friend_request','friend_accepted','wall','rsvp')),
  target_kind text not null default '' ,
  target_id bigint not null default 0,
  snippet text not null default '' check (length(snippet) <= 140),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (recipient, actor, kind, target_kind, target_id)
);
alter table bulavata.notifications enable row level security;
create index if not exists notifications_inbox on bulavata.notifications(recipient, read_at, created_at desc);

drop policy if exists n_read on bulavata.notifications;
create policy n_read on bulavata.notifications for select using (recipient = (select auth.uid()));
grant select on bulavata.notifications to authenticated;

-- ---------------------------------------------------------------- writer
create or replace function bulavata.notify(p_recipient uuid, p_actor uuid, p_kind text, p_target_kind text, p_target_id bigint, p_snippet text)
returns void language sql security definer set search_path = '' as $$
  insert into bulavata.notifications(recipient, actor, kind, target_kind, target_id, snippet)
  select p_recipient, p_actor, p_kind, coalesce(p_target_kind, ''), coalesce(p_target_id, 0), left(coalesce(p_snippet, ''), 140)
  where p_recipient is not null and p_actor is not null and p_recipient <> p_actor
  on conflict (recipient, actor, kind, target_kind, target_id)
    do update set created_at = now(), read_at = null, snippet = excluded.snippet;
$$;

create or replace function bulavata.target_snippet(p_kind text, p_id bigint)
returns text language sql stable security definer set search_path = '' as $$
  select left(coalesce(case p_kind
    when 'moment'  then (select m.body from bulavata.moments m where m.id = p_id)
    when 'pulse'   then (select p.text from bulavata.pulses p where p.id = p_id)
    when 'wall'    then (select w.body from bulavata.wall_posts w where w.id = p_id)
    when 'comment' then (select c.body from bulavata.comments c where c.id = p_id)
    when 'story'   then (select s.body from bulavata.stories s where s.id = p_id)
  end, ''), 140);
$$;

-- ---------------------------------------------------------------- triggers
create or replace function bulavata.trg_notify_reaction() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform bulavata.notify(bulavata.target_author(new.target_kind, new.target_id), new.giver, 'reaction',
                          new.target_kind, new.target_id, new.reaction || '|' || bulavata.target_snippet(new.target_kind, new.target_id));
  return new;
end $$;
drop trigger if exists notify_reaction on bulavata.reactions;
create trigger notify_reaction after insert or update of reaction on bulavata.reactions
  for each row execute function bulavata.trg_notify_reaction();

create or replace function bulavata.trg_notify_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid; parent_author uuid; h text; mentioned uuid;
begin
  owner_id := bulavata.target_author(new.target_kind, new.target_id);
  perform bulavata.notify(owner_id, new.author, 'reply', new.target_kind, new.target_id, new.body);
  if new.parent_id is not null then
    select author into parent_author from bulavata.comments where id = new.parent_id;
    if parent_author is distinct from owner_id then
      perform bulavata.notify(parent_author, new.author, 'reply', 'comment', new.parent_id, new.body);
    end if;
  end if;
  -- @mentions: only friends of the author are told, and only once per comment.
  for h in select distinct lower(m[1]) from regexp_matches(new.body, '@([A-Za-z0-9_]{2,30})', 'g') m loop
    select id into mentioned from bulavata.profiles where lower(handle) = h;
    if mentioned is not null and mentioned not in (new.author, coalesce(owner_id, new.author), coalesce(parent_author, new.author))
       and bulavata.are_friends(new.author, mentioned) then
      perform bulavata.notify(mentioned, new.author, 'mention', 'comment', new.id, new.body);
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists notify_comment on bulavata.comments;
create trigger notify_comment after insert on bulavata.comments
  for each row execute function bulavata.trg_notify_comment();

create or replace function bulavata.trg_notify_friendship() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and coalesce(new.status, 'pending') = 'pending' then
    perform bulavata.notify(new.addressee, new.requester, 'friend_request', 'friendship', new.id, '');
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status is distinct from 'accepted' then
    perform bulavata.notify(new.requester, new.addressee, 'friend_accepted', 'friendship', new.id, '');
    -- the request itself is now answered
    update bulavata.notifications set read_at = coalesce(read_at, now())
      where recipient = new.addressee and kind = 'friend_request' and target_kind = 'friendship' and target_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists notify_friendship on bulavata.friendships;
create trigger notify_friendship after insert or update of status on bulavata.friendships
  for each row execute function bulavata.trg_notify_friendship();

create or replace function bulavata.trg_notify_wall() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform bulavata.notify(new.wall_owner, new.author, 'wall', 'wall', new.id, new.body);
  return new;
end $$;
drop trigger if exists notify_wall on bulavata.wall_posts;
create trigger notify_wall after insert on bulavata.wall_posts
  for each row execute function bulavata.trg_notify_wall();

create or replace function bulavata.trg_notify_rsvp() returns trigger
language plpgsql security definer set search_path = '' as $$
declare h uuid; t text;
begin
  select host, title into h, t from bulavata.events where id = new.event_id;
  perform bulavata.notify(h, new.person, 'rsvp', 'event', new.event_id, new.status || '|' || coalesce(t, ''));
  return new;
end $$;
drop trigger if exists notify_rsvp on bulavata.event_rsvps;
create trigger notify_rsvp after insert or update of status on bulavata.event_rsvps
  for each row execute function bulavata.trg_notify_rsvp();

-- ---------------------------------------------------------------- read side
create or replace function public.bv_activity(lim integer default 40)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', n.id, 'kind', n.kind, 'target_kind', n.target_kind, 'target_id', n.target_id,
      'snippet', n.snippet, 'created_at', n.created_at, 'read', n.read_at is not null,
      'actor', n.actor, 'handle', p.handle, 'display_name', p.display_name, 'avatar_emoji', p.avatar_emoji, 'accent', p.room_accent)
      order by n.created_at desc)
    from (select * from bulavata.notifications
          where recipient = (select auth.uid()) order by created_at desc limit greatest(1, least(coalesce(lim, 40), 200))) n
    join bulavata.profiles p on p.id = n.actor), '[]'::jsonb);
$$;

create or replace function public.bv_activity_unread()
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from bulavata.notifications where recipient = (select auth.uid()) and read_at is null;
$$;

create or replace function public.bv_activity_read(p_ids bigint[] default null)
returns integer language sql security definer set search_path = '' as $$
  with done as (
    update bulavata.notifications set read_at = now()
      where recipient = (select auth.uid()) and read_at is null and (p_ids is null or id = any(p_ids))
      returning 1)
  select count(*)::integer from done;
$$;

grant execute on function public.bv_activity(integer), public.bv_activity_unread(), public.bv_activity_read(bigint[]) to authenticated;
revoke execute on function public.bv_activity(integer), public.bv_activity_unread(), public.bv_activity_read(bigint[]) from anon;
