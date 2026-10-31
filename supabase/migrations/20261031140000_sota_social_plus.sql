-- Sota Kece — the standard social layer, built on the existing friends-only model.
-- Reactions, comments/threads, bookmarks, edit-with-history, reposts/quotes, polls,
-- close friends, 24h stories + notes + highlights, events with RSVP, memories.
-- Every read goes through SECURITY DEFINER functions that reuse bulavata.my_circle()
-- and bulavata.are_friends(), so nothing leaks past friends. No algorithm anywhere:
-- every list is newest-first.

set search_path = '';

-- ---------------------------------------------------------------- moments: audience, edits, reposts
alter table bulavata.moments
  add column if not exists audience text not null default 'friends' check (audience in ('friends','close')),
  add column if not exists edited_at timestamptz,
  add column if not exists edit_count integer not null default 0,
  add column if not exists repost_of bigint references bulavata.moments(id) on delete set null;

create table if not exists bulavata.moment_edits (
  id bigint generated always as identity primary key,
  moment_id bigint not null references bulavata.moments(id) on delete cascade,
  old_body text, old_media_url text,
  edited_at timestamptz not null default now()
);
alter table bulavata.moment_edits enable row level security;

-- ---------------------------------------------------------------- close friends
create table if not exists bulavata.close_friends (
  owner uuid not null references bulavata.profiles(id) on delete cascade,
  friend uuid not null references bulavata.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner, friend)
);
alter table bulavata.close_friends enable row level security;

create or replace function bulavata.can_see_moment(p_author uuid, p_audience text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_author = (select auth.uid())
      or (bulavata.are_friends((select auth.uid()), p_author)
          and (p_audience = 'friends'
               or exists (select 1 from bulavata.close_friends c
                          where c.owner = p_author and c.friend = (select auth.uid()))));
$$;

drop policy if exists m_read on bulavata.moments;
create policy m_read on bulavata.moments for select using (bulavata.can_see_moment(author, audience));

-- ---------------------------------------------------------------- reactions (unlimited, unlike Uro)
create table if not exists bulavata.reactions (
  id bigint generated always as identity primary key,
  giver uuid not null references bulavata.profiles(id) on delete cascade,
  target_kind text not null check (target_kind in ('moment','pulse','wall','comment','story')),
  target_id bigint not null,
  reaction text not null check (reaction in ('bula','vinaka','haha','wow','sad','fire')),
  created_at timestamptz not null default now(),
  unique (giver, target_kind, target_id)
);
alter table bulavata.reactions enable row level security;
create index if not exists reactions_target on bulavata.reactions(target_kind, target_id);

-- ---------------------------------------------------------------- comments / threads
create table if not exists bulavata.comments (
  id bigint generated always as identity primary key,
  target_kind text not null check (target_kind in ('moment','pulse','wall','story')),
  target_id bigint not null,
  author uuid not null references bulavata.profiles(id) on delete cascade,
  parent_id bigint references bulavata.comments(id) on delete cascade,
  body text not null check (length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  deleted boolean not null default false
);
alter table bulavata.comments enable row level security;
create index if not exists comments_target on bulavata.comments(target_kind, target_id, created_at);

-- ---------------------------------------------------------------- bookmarks (private, foldered)
create table if not exists bulavata.bookmarks (
  id bigint generated always as identity primary key,
  owner uuid not null references bulavata.profiles(id) on delete cascade,
  target_kind text not null check (target_kind in ('moment','pulse','wall')),
  target_id bigint not null,
  folder text not null default '',
  created_at timestamptz not null default now(),
  unique (owner, target_kind, target_id)
);
alter table bulavata.bookmarks enable row level security;

-- ---------------------------------------------------------------- polls
create table if not exists bulavata.polls (
  id bigint generated always as identity primary key,
  moment_id bigint not null unique references bulavata.moments(id) on delete cascade,
  question text not null check (length(question) between 1 and 200),
  options text[] not null check (array_length(options,1) between 2 and 4),
  closes_at timestamptz not null default now() + interval '24 hours'
);
create table if not exists bulavata.poll_votes (
  poll_id bigint not null references bulavata.polls(id) on delete cascade,
  voter uuid not null references bulavata.profiles(id) on delete cascade,
  choice integer not null check (choice between 0 and 3),
  created_at timestamptz not null default now(),
  primary key (poll_id, voter)
);
alter table bulavata.polls enable row level security;
alter table bulavata.poll_votes enable row level security;

-- ---------------------------------------------------------------- stories, notes, highlights
create table if not exists bulavata.stories (
  id bigint generated always as identity primary key,
  author uuid not null references bulavata.profiles(id) on delete cascade,
  kind text not null default 'story' check (kind in ('story','note')),
  body text check (length(body) <= 300),
  media_url text,
  audience text not null default 'friends' check (audience in ('friends','close')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  highlight_title text,            -- set = kept on the profile beyond 24h
  check (body is not null or media_url is not null)
);
create table if not exists bulavata.story_views (
  story_id bigint not null references bulavata.stories(id) on delete cascade,
  viewer uuid not null references bulavata.profiles(id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (story_id, viewer)
);
alter table bulavata.stories enable row level security;
alter table bulavata.story_views enable row level security;
create index if not exists stories_live on bulavata.stories(author, expires_at);

-- ---------------------------------------------------------------- events + RSVP
create table if not exists bulavata.events (
  id bigint generated always as identity primary key,
  host uuid not null references bulavata.profiles(id) on delete cascade,
  crew_id bigint references bulavata.crews(id) on delete set null,
  title text not null check (length(title) between 1 and 120),
  about text check (length(about) <= 2000),
  place text check (length(place) <= 200),
  starts_at timestamptz not null,
  ends_at timestamptz,
  audience text not null default 'friends' check (audience in ('friends','close','crew')),
  created_at timestamptz not null default now(),
  cancelled boolean not null default false
);
create table if not exists bulavata.event_rsvps (
  event_id bigint not null references bulavata.events(id) on delete cascade,
  person uuid not null references bulavata.profiles(id) on delete cascade,
  status text not null check (status in ('going','maybe','no')),
  updated_at timestamptz not null default now(),
  primary key (event_id, person)
);
alter table bulavata.events enable row level security;
alter table bulavata.event_rsvps enable row level security;

-- ================================================================ helpers
create or replace function bulavata.target_author(p_kind text, p_id bigint)
returns uuid language sql stable security definer set search_path = '' as $$
  select case p_kind
    when 'moment'  then (select m.author from bulavata.moments m where m.id = p_id)
    when 'pulse'   then (select p.author from bulavata.pulses p where p.id = p_id)
    when 'wall'    then (select w.wall_owner from bulavata.wall_posts w where w.id = p_id)
    when 'comment' then (select c.author from bulavata.comments c where c.id = p_id)
    when 'story'   then (select s.author from bulavata.stories s where s.id = p_id)
  end;
$$;

-- can the signed-in person see this target at all?
create or replace function bulavata.can_see_target(p_kind text, p_id bigint)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare a uuid; aud text; begin
  if p_kind = 'moment' then
    select author, audience into a, aud from bulavata.moments where id = p_id;
    return found and bulavata.can_see_moment(a, aud);
  elsif p_kind = 'story' then
    select author, audience into a, aud from bulavata.stories where id = p_id;
    return found and bulavata.can_see_moment(a, aud);
  else
    a := bulavata.target_author(p_kind, p_id);
    return a is not null and (a = (select auth.uid()) or bulavata.are_friends((select auth.uid()), a));
  end if;
end $$;

create or replace function bulavata.reaction_summary(p_kind text, p_id bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'counts', coalesce((select jsonb_object_agg(r.reaction, r.n)
                        from (select reaction, count(*) n from bulavata.reactions
                              where target_kind = p_kind and target_id = p_id group by reaction) r), '{}'::jsonb),
    'mine', (select reaction from bulavata.reactions
             where target_kind = p_kind and target_id = p_id and giver = (select auth.uid())));
$$;

-- ================================================================ reactions
create or replace function public.bv_react(p_kind text, p_id bigint, p_reaction text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'NOT_SIGNED_IN'; end if;
  if not bulavata.can_see_target(p_kind, p_id) then raise exception 'NOT_VISIBLE'; end if;
  if p_reaction is null or p_reaction = '' then
    delete from bulavata.reactions where giver = (select auth.uid()) and target_kind = p_kind and target_id = p_id;
  else
    insert into bulavata.reactions(giver, target_kind, target_id, reaction)
    values ((select auth.uid()), p_kind, p_id, p_reaction)
    on conflict (giver, target_kind, target_id) do update set reaction = excluded.reaction, created_at = now();
  end if;
  return bulavata.reaction_summary(p_kind, p_id);
end $$;

create or replace function public.bv_reactors(p_kind text, p_id bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when bulavata.can_see_target(p_kind, p_id) then coalesce((
    select jsonb_agg(jsonb_build_object('handle', p.handle, 'avatar_emoji', p.avatar_emoji, 'reaction', r.reaction) order by r.created_at desc)
    from bulavata.reactions r join bulavata.profiles p on p.id = r.giver
    where r.target_kind = p_kind and r.target_id = p_id), '[]'::jsonb) else '[]'::jsonb end;
$$;

-- ================================================================ comments / threads
create or replace function public.bv_comment(p_kind text, p_id bigint, p_body text, p_parent bigint default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c bulavata.comments; begin
  if (select auth.uid()) is null then raise exception 'NOT_SIGNED_IN'; end if;
  if not bulavata.can_see_target(p_kind, p_id) then raise exception 'NOT_VISIBLE'; end if;
  if p_parent is not null and not exists (select 1 from bulavata.comments
      where id = p_parent and target_kind = p_kind and target_id = p_id) then raise exception 'BAD_PARENT'; end if;
  insert into bulavata.comments(target_kind, target_id, author, parent_id, body)
  values (p_kind, p_id, (select auth.uid()), p_parent, p_body) returning * into c;
  return jsonb_build_object('id', c.id, 'created_at', c.created_at);
end $$;

create or replace function public.bv_comments(p_kind text, p_id bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when bulavata.can_see_target(p_kind, p_id) then coalesce((
    select jsonb_agg(jsonb_build_object('id', c.id, 'parent_id', c.parent_id, 'author', c.author,
      'handle', p.handle, 'avatar_emoji', p.avatar_emoji, 'accent', p.room_accent,
      'body', case when c.deleted then null else c.body end, 'deleted', c.deleted, 'created_at', c.created_at,
      'reactions', bulavata.reaction_summary('comment', c.id)) order by c.created_at asc)
    from bulavata.comments c join bulavata.profiles p on p.id = c.author
    where c.target_kind = p_kind and c.target_id = p_id), '[]'::jsonb) else '[]'::jsonb end;
$$;

create or replace function public.bv_comment_delete(p_id bigint)
returns void language sql security definer set search_path = '' as $$
  update bulavata.comments set deleted = true, body = '' where id = p_id
    and (author = (select auth.uid()) or bulavata.target_author(target_kind, target_id) = (select auth.uid()));
$$;

-- ================================================================ bookmarks
create or replace function public.bv_bookmark_toggle(p_kind text, p_id bigint, p_folder text default '')
returns boolean language plpgsql security definer set search_path = '' as $$
declare existed boolean; begin
  if (select auth.uid()) is null then raise exception 'NOT_SIGNED_IN'; end if;
  delete from bulavata.bookmarks where owner = (select auth.uid()) and target_kind = p_kind and target_id = p_id;
  existed := found;
  if existed then return false; end if;
  if not bulavata.can_see_target(p_kind, p_id) then raise exception 'NOT_VISIBLE'; end if;
  insert into bulavata.bookmarks(owner, target_kind, target_id, folder) values ((select auth.uid()), p_kind, p_id, coalesce(p_folder,''));
  return true;
end $$;

create or replace function public.bv_bookmarks()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'kind', b.target_kind, 'target_id', b.target_id,
      'folder', b.folder, 'saved_at', b.created_at,
      'body', case b.target_kind when 'moment' then (select m.body from bulavata.moments m where m.id = b.target_id)
                                 when 'pulse' then (select p.text from bulavata.pulses p where p.id = b.target_id)
                                 else (select w.body from bulavata.wall_posts w where w.id = b.target_id) end,
      'media_url', case b.target_kind when 'moment' then (select m.media_url from bulavata.moments m where m.id = b.target_id) end,
      'handle', (select p.handle from bulavata.profiles p where p.id = bulavata.target_author(b.target_kind, b.target_id)))
      order by b.created_at desc)
    from bulavata.bookmarks b where b.owner = (select auth.uid())), '[]'::jsonb);
$$;

-- ================================================================ edit post (1 hour, 5 edits, history kept)
create or replace function public.bv_moment_edit(p_id bigint, p_body text, p_media_url text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m bulavata.moments; begin
  select * into m from bulavata.moments where id = p_id and author = (select auth.uid());
  if not found then raise exception 'NOT_YOURS'; end if;
  if m.created_at < now() - interval '1 hour' then raise exception 'EDIT_WINDOW_CLOSED'; end if;
  if m.edit_count >= 5 then raise exception 'EDIT_LIMIT'; end if;
  if coalesce(p_body,'') = '' and coalesce(p_media_url,'') = '' then raise exception 'EMPTY'; end if;
  insert into bulavata.moment_edits(moment_id, old_body, old_media_url) values (m.id, m.body, m.media_url);
  update bulavata.moments set body = p_body, media_url = nullif(p_media_url,''), edited_at = now(), edit_count = edit_count + 1 where id = m.id;
  return jsonb_build_object('edit_count', m.edit_count + 1);
end $$;

create or replace function public.bv_moment_history(p_id bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when bulavata.can_see_target('moment', p_id) then coalesce((
    select jsonb_agg(jsonb_build_object('body', e.old_body, 'media_url', e.old_media_url, 'edited_at', e.edited_at) order by e.edited_at desc)
    from bulavata.moment_edits e where e.moment_id = p_id), '[]'::jsonb) else '[]'::jsonb end;
$$;

-- ================================================================ repost / quote
create or replace function public.bv_moment_repost(p_id bigint, p_quote text default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare new_id bigint; begin
  if (select auth.uid()) is null then raise exception 'NOT_SIGNED_IN'; end if;
  if not bulavata.can_see_target('moment', p_id) then raise exception 'NOT_VISIBLE'; end if;
  if p_quote is null and exists (select 1 from bulavata.moments where author = (select auth.uid()) and repost_of = p_id and body is null)
    then raise exception 'ALREADY_REPOSTED'; end if;
  insert into bulavata.moments(author, body, repost_of) values ((select auth.uid()), nullif(p_quote,''), p_id) returning id into new_id;
  return new_id;
end $$;

-- ================================================================ polls
create or replace function public.bv_poll_create(p_moment bigint, p_question text, p_options text[], p_hours integer default 24)
returns bigint language plpgsql security definer set search_path = '' as $$
declare pid bigint; begin
  if not exists (select 1 from bulavata.moments where id = p_moment and author = (select auth.uid())) then raise exception 'NOT_YOURS'; end if;
  insert into bulavata.polls(moment_id, question, options, closes_at)
  values (p_moment, p_question, p_options, now() + make_interval(hours => greatest(1, least(p_hours, 168)))) returning id into pid;
  return pid;
end $$;

create or replace function bulavata.poll_json(p_moment bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  select (select jsonb_build_object('id', p.id, 'question', p.question, 'options', to_jsonb(p.options), 'closes_at', p.closes_at,
            'closed', p.closes_at < now(),
            'total', (select count(*) from bulavata.poll_votes v where v.poll_id = p.id),
            'counts', (select coalesce(jsonb_agg(coalesce(n,0) order by i), '[]'::jsonb) from generate_series(0, array_length(p.options,1)-1) i
                       left join (select choice, count(*) n from bulavata.poll_votes where poll_id = p.id group by choice) c on c.choice = i),
            'mine', (select choice from bulavata.poll_votes v where v.poll_id = p.id and v.voter = (select auth.uid())))
          from bulavata.polls p where p.moment_id = p_moment);
$$;

create or replace function public.bv_poll_vote(p_poll bigint, p_choice integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare mid bigint; begin
  select moment_id into mid from bulavata.polls where id = p_poll and closes_at > now();
  if not found then raise exception 'POLL_CLOSED'; end if;
  if not bulavata.can_see_target('moment', mid) then raise exception 'NOT_VISIBLE'; end if;
  insert into bulavata.poll_votes(poll_id, voter, choice) values (p_poll, (select auth.uid()), p_choice)
  on conflict (poll_id, voter) do update set choice = excluded.choice, created_at = now();
  return bulavata.poll_json(mid);
end $$;

-- ================================================================ close friends
create or replace function public.bv_close_friend_set(p_friend uuid, p_on boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_on then
    if not bulavata.are_friends((select auth.uid()), p_friend) then raise exception 'NOT_FRIENDS'; end if;
    insert into bulavata.close_friends(owner, friend) values ((select auth.uid()), p_friend) on conflict do nothing;
  else
    delete from bulavata.close_friends where owner = (select auth.uid()) and friend = p_friend;
  end if;
end $$;

create or replace function public.bv_close_friends()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'handle', p.handle, 'display_name', p.display_name, 'avatar_emoji', p.avatar_emoji) order by p.handle)
    from bulavata.close_friends c join bulavata.profiles p on p.id = c.friend where c.owner = (select auth.uid())), '[]'::jsonb);
$$;

-- ================================================================ stories / notes / highlights
create or replace function public.bv_story_post(p_body text, p_media_url text default null, p_kind text default 'story', p_audience text default 'friends')
returns bigint language plpgsql security definer set search_path = '' as $$
declare sid bigint; begin
  if (select auth.uid()) is null then raise exception 'NOT_SIGNED_IN'; end if;
  if p_kind = 'note' then  -- one live note at a time, like Instagram Notes
    delete from bulavata.stories where author = (select auth.uid()) and kind = 'note' and highlight_title is null;
  end if;
  insert into bulavata.stories(author, kind, body, media_url, audience)
  values ((select auth.uid()), p_kind, nullif(p_body,''), nullif(p_media_url,''), p_audience) returning id into sid;
  return sid;
end $$;

-- live stories and notes from me + my circle, grouped per person, newest person first
create or replace function public.bv_stories()
returns jsonb language sql stable security definer set search_path = '' as $$
  with live as (
    select s.* from bulavata.stories s
    where s.expires_at > now()
      and (s.author = (select auth.uid()) or s.author in (select c.id from bulavata.my_circle() c))
      and bulavata.can_see_moment(s.author, s.audience))
  select coalesce((select jsonb_agg(person order by (person->>'latest') desc) from (
    select jsonb_build_object('author', l.author, 'handle', p.handle, 'display_name', p.display_name,
      'avatar_emoji', p.avatar_emoji, 'accent', p.room_accent, 'is_me', l.author = (select auth.uid()),
      'latest', max(l.created_at),
      'all_seen', bool_and(exists (select 1 from bulavata.story_views v where v.story_id = l.id and v.viewer = (select auth.uid()))),
      'note', (select jsonb_build_object('id', n.id, 'body', n.body, 'created_at', n.created_at) from live n
               where n.author = l.author and n.kind = 'note' order by n.created_at desc limit 1),
      'items', (select jsonb_agg(jsonb_build_object('id', i.id, 'body', i.body, 'media_url', i.media_url, 'audience', i.audience,
                  'created_at', i.created_at, 'expires_at', i.expires_at,
                  'seen', exists (select 1 from bulavata.story_views v where v.story_id = i.id and v.viewer = (select auth.uid())),
                  'views', case when i.author = (select auth.uid()) then (select count(*) from bulavata.story_views v where v.story_id = i.id) end,
                  'reactions', bulavata.reaction_summary('story', i.id)) order by i.created_at)
                from live i where i.author = l.author and i.kind = 'story')) person
    from live l join bulavata.profiles p on p.id = l.author group by l.author, p.handle, p.display_name, p.avatar_emoji, p.room_accent) x), '[]'::jsonb);
$$;

create or replace function public.bv_story_seen(p_id bigint)
returns void language sql security definer set search_path = '' as $$
  insert into bulavata.story_views(story_id, viewer) select p_id, (select auth.uid())
  where bulavata.can_see_target('story', p_id) on conflict do nothing;
$$;

create or replace function public.bv_story_delete(p_id bigint)
returns void language sql security definer set search_path = '' as $$
  delete from bulavata.stories where id = p_id and author = (select auth.uid());
$$;

create or replace function public.bv_story_highlight(p_id bigint, p_title text)
returns void language sql security definer set search_path = '' as $$
  update bulavata.stories set highlight_title = nullif(p_title,'') where id = p_id and author = (select auth.uid());
$$;

create or replace function public.bv_highlights(p_owner uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'title', s.highlight_title, 'body', s.body, 'media_url', s.media_url, 'created_at', s.created_at) order by s.created_at desc)
    from bulavata.stories s where s.author = p_owner and s.highlight_title is not null and bulavata.can_see_moment(s.author, s.audience)), '[]'::jsonb);
$$;

-- ================================================================ memories ("on this day")
create or replace function public.bv_memories()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'body', m.body, 'media_url', m.media_url, 'created_at', m.created_at,
      'years_ago', extract(year from now())::int - extract(year from m.created_at)::int) order by m.created_at desc)
    from bulavata.moments m where m.author = (select auth.uid())
      and m.created_at < now() - interval '300 days'
      and to_char(m.created_at, 'MM-DD') = to_char(now(), 'MM-DD')), '[]'::jsonb);
$$;

-- ================================================================ events
create or replace function public.bv_event_create(p_title text, p_starts_at timestamptz, p_ends_at timestamptz default null,
  p_place text default null, p_about text default null, p_audience text default 'friends', p_crew bigint default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare eid bigint; begin
  if (select auth.uid()) is null then raise exception 'NOT_SIGNED_IN'; end if;
  if p_crew is not null and not exists (select 1 from bulavata.crew_members cm where cm.crew_id = p_crew and cm.member = (select auth.uid()))
    then raise exception 'NOT_IN_CREW'; end if;
  insert into bulavata.events(host, crew_id, title, about, place, starts_at, ends_at, audience)
  values ((select auth.uid()), p_crew, p_title, nullif(p_about,''), nullif(p_place,''), p_starts_at, p_ends_at, case when p_crew is not null then 'crew' else p_audience end)
  returning id into eid;
  insert into bulavata.event_rsvps(event_id, person, status) values (eid, (select auth.uid()), 'going');
  return eid;
end $$;

create or replace function bulavata.can_see_event(e bulavata.events)
returns boolean language sql stable security definer set search_path = '' as $$
  select e.host = (select auth.uid())
     or (e.audience = 'crew' and exists (select 1 from bulavata.crew_members cm where cm.crew_id = e.crew_id and cm.member = (select auth.uid())))
     or (e.audience <> 'crew' and bulavata.can_see_moment(e.host, e.audience));
$$;

create or replace function public.bv_events(p_past boolean default false)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'title', e.title, 'about', e.about, 'place', e.place,
      'starts_at', e.starts_at, 'ends_at', e.ends_at, 'audience', e.audience, 'cancelled', e.cancelled, 'crew_id', e.crew_id,
      'is_host', e.host = (select auth.uid()), 'host_handle', p.handle, 'host_emoji', p.avatar_emoji,
      'mine', (select r.status from bulavata.event_rsvps r where r.event_id = e.id and r.person = (select auth.uid())),
      'going', (select count(*) from bulavata.event_rsvps r where r.event_id = e.id and r.status = 'going'),
      'maybe', (select count(*) from bulavata.event_rsvps r where r.event_id = e.id and r.status = 'maybe'),
      'people', (select coalesce(jsonb_agg(jsonb_build_object('handle', pp.handle, 'avatar_emoji', pp.avatar_emoji, 'status', r.status) order by r.updated_at), '[]'::jsonb)
                 from bulavata.event_rsvps r join bulavata.profiles pp on pp.id = r.person where r.event_id = e.id and r.status <> 'no'))
      order by e.starts_at asc)
    from bulavata.events e join bulavata.profiles p on p.id = e.host
    where bulavata.can_see_event(e)
      and ((not p_past and coalesce(e.ends_at, e.starts_at + interval '3 hours') > now() - interval '1 hour')
        or (p_past and coalesce(e.ends_at, e.starts_at + interval '3 hours') <= now() - interval '1 hour'))), '[]'::jsonb);
$$;

create or replace function public.bv_event_rsvp(p_event bigint, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare e bulavata.events; begin
  select * into e from bulavata.events where id = p_event;
  if not found or not bulavata.can_see_event(e) then raise exception 'NOT_VISIBLE'; end if;
  insert into bulavata.event_rsvps(event_id, person, status) values (p_event, (select auth.uid()), p_status)
  on conflict (event_id, person) do update set status = excluded.status, updated_at = now();
end $$;

create or replace function public.bv_event_cancel(p_event bigint)
returns void language sql security definer set search_path = '' as $$
  update bulavata.events set cancelled = true where id = p_event and host = (select auth.uid());
$$;

-- ================================================================ the richer feed (v2) — same order rule: newest first, friends only
create or replace function public.bv_moments_feed2(lim integer default 60)
returns jsonb language sql stable security definer set search_path = '' as $$
  with page as (
    select m.* from bulavata.moments m
    where (m.author = (select auth.uid()) or m.author in (select c.id from bulavata.my_circle() c))
      and bulavata.can_see_moment(m.author, m.audience)
    order by m.created_at desc limit lim)
  select coalesce((select jsonb_agg(jsonb_build_object(
      'id', x.id, 'author', x.author, 'handle', pr.handle, 'display_name', pr.display_name, 'avatar_emoji', pr.avatar_emoji,
      'accent', pr.room_accent, 'body', x.body, 'media_url', x.media_url, 'caption', x.caption, 'created_at', x.created_at,
      'audience', x.audience, 'edited_at', x.edited_at, 'edit_count', x.edit_count,
      'luv_count', x.luv_count,
      'i_luvd', exists (select 1 from bulavata.luv l where l.giver = (select auth.uid()) and l.target_kind = 'moment' and l.target_id = x.id),
      'reactions', bulavata.reaction_summary('moment', x.id),
      'comment_count', (select count(*) from bulavata.comments c where c.target_kind = 'moment' and c.target_id = x.id and not c.deleted),
      'bookmarked', exists (select 1 from bulavata.bookmarks b where b.owner = (select auth.uid()) and b.target_kind = 'moment' and b.target_id = x.id),
      'repost_count', (select count(*) from bulavata.moments r where r.repost_of = x.id),
      'poll', bulavata.poll_json(x.id),
      'repost', (select jsonb_build_object('id', o.id, 'body', o.body, 'media_url', o.media_url, 'created_at', o.created_at,
                   'handle', op.handle, 'display_name', op.display_name, 'avatar_emoji', op.avatar_emoji, 'accent', op.room_accent,
                   'visible', bulavata.can_see_moment(o.author, o.audience))
                 from bulavata.moments o join bulavata.profiles op on op.id = o.author where o.id = x.repost_of)
    ) order by x.created_at desc)
    from page x join bulavata.profiles pr on pr.id = x.author), '[]'::jsonb);
$$;

-- bv_room: respect close-friends audience on the moments shown in a room, and add highlights
create or replace function public.bv_room(p_handle text)
returns jsonb language plpgsql stable security definer set search_path to 'bulavata', 'public' as $$
declare o bulavata.profiles%rowtype; vis boolean; begin
  select * into o from bulavata.profiles where handle = p_handle;
  if not found then return jsonb_build_object('found', false); end if;
  vis := (o.id = auth.uid()) or bulavata.are_friends(auth.uid(), o.id);
  return jsonb_build_object(
    'found', true, 'is_me', o.id = auth.uid(), 'visible', vis,
    'profile', jsonb_build_object('id',o.id,'handle',o.handle,'display_name',o.display_name,
      'pronouns',o.pronouns,'bio',o.bio,'avatar_emoji',o.avatar_emoji,'room_theme',o.room_theme,
      'room_accent',o.room_accent,'room_css',o.room_css,'room_song',o.room_song,
      'human_verified',o.human_verified,'created_at',o.created_at),
    'friend_status', coalesce((select f.status from bulavata.friendships f
       where (f.requester=auth.uid() and f.addressee=o.id) or (f.requester=o.id and f.addressee=auth.uid())
       limit 1), 'none'),
    'is_close', exists (select 1 from bulavata.close_friends c where c.owner = auth.uid() and c.friend = o.id),
    'highlights', case when vis then public.bv_highlights(o.id) else '[]'::jsonb end,
    'top', case when vis then coalesce((select jsonb_agg(jsonb_build_object('slot',t.slot,'handle',p2.handle,
             'display_name',p2.display_name,'avatar_emoji',p2.avatar_emoji) order by t.slot)
           from bulavata.top_friends t join bulavata.profiles p2 on p2.id=t.friend
           where t.owner=o.id), '[]'::jsonb) else '[]'::jsonb end,
    'wall', case when vis then coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'body',w.body,'ink',w.ink,
             'handle',p3.handle,'avatar_emoji',p3.avatar_emoji,'created_at',w.created_at,
             'reactions', bulavata.reaction_summary('wall', w.id),
             'comment_count', (select count(*) from bulavata.comments c where c.target_kind='wall' and c.target_id=w.id and not c.deleted)) order by w.created_at desc)
           from (select * from bulavata.wall_posts where wall_owner=o.id order by created_at desc limit 40) w
           join bulavata.profiles p3 on p3.id=w.author), '[]'::jsonb) else '[]'::jsonb end,
    'moments', case when vis then coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'body',m.body,
             'media_url',m.media_url,'caption',m.caption,'created_at',m.created_at,'audience',m.audience,'edited_at',m.edited_at,
             'reactions', bulavata.reaction_summary('moment', m.id),
             'comment_count', (select count(*) from bulavata.comments c where c.target_kind='moment' and c.target_id=m.id and not c.deleted)) order by m.created_at desc)
           from (select * from bulavata.moments where author=o.id and bulavata.can_see_moment(author, audience) order by created_at desc limit 30) m), '[]'::jsonb) else '[]'::jsonb end
  );
end; $$;

-- grants: everything is reached through the functions above
grant execute on function
  public.bv_react(text,bigint,text), public.bv_reactors(text,bigint),
  public.bv_comment(text,bigint,text,bigint), public.bv_comments(text,bigint), public.bv_comment_delete(bigint),
  public.bv_bookmark_toggle(text,bigint,text), public.bv_bookmarks(),
  public.bv_moment_edit(bigint,text,text), public.bv_moment_history(bigint), public.bv_moment_repost(bigint,text),
  public.bv_poll_create(bigint,text,text[],integer), public.bv_poll_vote(bigint,integer),
  public.bv_close_friend_set(uuid,boolean), public.bv_close_friends(),
  public.bv_story_post(text,text,text,text), public.bv_stories(), public.bv_story_seen(bigint), public.bv_story_delete(bigint),
  public.bv_story_highlight(bigint,text), public.bv_highlights(uuid), public.bv_memories(),
  public.bv_event_create(text,timestamptz,timestamptz,text,text,text,bigint), public.bv_events(boolean),
  public.bv_event_rsvp(bigint,text), public.bv_event_cancel(bigint), public.bv_moments_feed2(integer), public.bv_room(text)
  to authenticated;
revoke execute on function
  public.bv_react(text,bigint,text), public.bv_reactors(text,bigint),
  public.bv_comment(text,bigint,text,bigint), public.bv_comments(text,bigint), public.bv_comment_delete(bigint),
  public.bv_bookmark_toggle(text,bigint,text), public.bv_bookmarks(),
  public.bv_moment_edit(bigint,text,text), public.bv_moment_history(bigint), public.bv_moment_repost(bigint,text),
  public.bv_poll_create(bigint,text,text[],integer), public.bv_poll_vote(bigint,integer),
  public.bv_close_friend_set(uuid,boolean), public.bv_close_friends(),
  public.bv_story_post(text,text,text,text), public.bv_stories(), public.bv_story_seen(bigint), public.bv_story_delete(bigint),
  public.bv_story_highlight(bigint,text), public.bv_highlights(uuid), public.bv_memories(),
  public.bv_event_create(text,timestamptz,timestamptz,text,text,text,bigint), public.bv_events(boolean),
  public.bv_event_rsvp(bigint,text), public.bv_event_cancel(bigint), public.bv_moments_feed2(integer),
  bulavata.can_see_moment(uuid,text), bulavata.can_see_target(text,bigint), bulavata.target_author(text,bigint),
  bulavata.reaction_summary(text,bigint), bulavata.poll_json(bigint), bulavata.can_see_event(bulavata.events)
  from public, anon;

-- expose audience on the existing write path (the app inserts into bv_moments directly)
create or replace view public.bv_moments with (security_invoker = true) as
  select id, author, body, media_url, caption, created_at, audience, repost_of from bulavata.moments;
