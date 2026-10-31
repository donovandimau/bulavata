-- Sota Kece — Koro messaging upgrade.
-- Vanish mode (messages expire; set per Koro by its owner), broadcast Koro (only the owner posts,
-- everyone reacts), replies, reactions on messages, a pinned message, and soft delete.
-- Runs after 20261031140000_sota_social_plus.sql (it reuses bulavata.reactions).

set search_path = '';

do $$ begin
  if to_regclass('bulavata.reactions') is null then
    raise exception 'Run 20261031140000_sota_social_plus.sql first (bulavata.reactions is missing).';
  end if;
end $$;

alter table bulavata.crews
  add column if not exists vanish_seconds integer check (vanish_seconds is null or vanish_seconds between 60 and 2592000),
  add column if not exists broadcast boolean not null default false,
  add column if not exists pinned_message bigint;

alter table bulavata.crew_messages
  add column if not exists expires_at timestamptz,
  add column if not exists reply_to bigint references bulavata.crew_messages(id) on delete set null,
  add column if not exists deleted boolean not null default false,
  add column if not exists kind text not null default 'text' check (kind in ('text','system'));
create index if not exists crew_messages_expiry on bulavata.crew_messages(expires_at) where expires_at is not null;

-- reactions may now target a Koro message
alter table bulavata.reactions drop constraint if exists reactions_target_kind_check;
alter table bulavata.reactions add constraint reactions_target_kind_check
  check (target_kind in ('moment','pulse','wall','comment','story','message'));

-- teach the shared visibility helpers about Koro messages
create or replace function bulavata.target_author(p_kind text, p_id bigint)
returns uuid language sql stable security definer set search_path = '' as $$
  select case p_kind
    when 'moment'  then (select m.author from bulavata.moments m where m.id = p_id)
    when 'pulse'   then (select p.author from bulavata.pulses p where p.id = p_id)
    when 'wall'    then (select w.wall_owner from bulavata.wall_posts w where w.id = p_id)
    when 'comment' then (select c.author from bulavata.comments c where c.id = p_id)
    when 'story'   then (select s.author from bulavata.stories s where s.id = p_id)
    when 'message' then (select x.author from bulavata.crew_messages x where x.id = p_id)
  end;
$$;

create or replace function bulavata.can_see_target(p_kind text, p_id bigint)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare a uuid; aud text; crew bigint; begin
  if p_kind = 'moment' then
    select author, audience into a, aud from bulavata.moments where id = p_id;
    return found and bulavata.can_see_moment(a, aud);
  elsif p_kind = 'story' then
    select author, audience into a, aud from bulavata.stories where id = p_id;
    return found and bulavata.can_see_moment(a, aud);
  elsif p_kind = 'message' then
    select crew_id into crew from bulavata.crew_messages where id = p_id and not deleted and (expires_at is null or expires_at > now());
    return found and bulavata.in_crew(crew);
  else
    a := bulavata.target_author(p_kind, p_id);
    return a is not null and (a = (select auth.uid()) or bulavata.are_friends((select auth.uid()), a));
  end if;
end $$;

-- ---------------------------------------------------------------- policies: broadcast + vanish respected at the table
create or replace function bulavata.crew_owner(p_crew bigint)
returns uuid language sql stable security definer set search_path = '' as $$
  select c.owner from bulavata.crews c where c.id = p_crew;
$$;
create or replace function bulavata.crew_can_post(p_crew bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from bulavata.crews c where c.id = p_crew
                 and (not c.broadcast or c.owner = (select auth.uid())))
     and bulavata.in_crew(p_crew);
$$;

drop policy if exists cx_ins on bulavata.crew_messages;
create policy cx_ins on bulavata.crew_messages for insert
  with check (author = (select auth.uid()) and kind = 'text' and bulavata.crew_can_post(crew_id));
drop policy if exists cx_read on bulavata.crew_messages;
create policy cx_read on bulavata.crew_messages for select
  using (bulavata.in_crew(crew_id) and (expires_at is null or expires_at > now()));

-- stamp the expiry from the Koro's vanish setting at send time
create or replace function bulavata.crew_message_expiry()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v integer; begin
  select vanish_seconds into v from bulavata.crews where id = new.crew_id;
  if v is not null and new.expires_at is null then new.expires_at := now() + make_interval(secs => v); end if;
  return new;
end $$;
drop trigger if exists crew_message_expiry on bulavata.crew_messages;
create trigger crew_message_expiry before insert on bulavata.crew_messages
  for each row execute function bulavata.crew_message_expiry();

-- ---------------------------------------------------------------- owner settings (writes a system line into the chat)
create or replace function public.bv_crew_settings(p_crew bigint, p_vanish_seconds integer, p_broadcast boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c bulavata.crews; line text; begin
  select * into c from bulavata.crews where id = p_crew and owner = (select auth.uid());
  if not found then raise exception 'NOT_OWNER'; end if;
  update bulavata.crews set vanish_seconds = p_vanish_seconds, broadcast = coalesce(p_broadcast, false) where id = p_crew;
  if c.vanish_seconds is distinct from p_vanish_seconds then
    line := case when p_vanish_seconds is null then 'Vanish mode off. Messages stay.'
                 else 'Vanish mode on. New messages disappear after ' ||
                      case when p_vanish_seconds < 3600 then (p_vanish_seconds/60)||' minute'||case when p_vanish_seconds/60=1 then '' else 's' end
                           when p_vanish_seconds < 86400 then (p_vanish_seconds/3600)||' hour'||case when p_vanish_seconds/3600=1 then '' else 's' end
                           else (p_vanish_seconds/86400)||' day'||case when p_vanish_seconds/86400=1 then '' else 's' end end || '.' end;
    insert into bulavata.crew_messages(crew_id, author, body, kind, expires_at) values (p_crew, (select auth.uid()), line, 'system', null);
  end if;
  if c.broadcast is distinct from coalesce(p_broadcast, false) then
    insert into bulavata.crew_messages(crew_id, author, body, kind, expires_at) values (p_crew, (select auth.uid()),
      case when p_broadcast then 'This is now a broadcast Koro. Only the owner posts; everyone can react and reply privately.' else 'Everyone can post again.' end, 'system', null);
  end if;
  return jsonb_build_object('vanish_seconds', p_vanish_seconds, 'broadcast', coalesce(p_broadcast,false));
end $$;

create or replace function public.bv_crew_pin(p_crew bigint, p_message bigint)
returns void language sql security definer set search_path = '' as $$
  update bulavata.crews set pinned_message = p_message where id = p_crew and owner = (select auth.uid())
    and (p_message is null or exists (select 1 from bulavata.crew_messages m where m.id = p_message and m.crew_id = p_crew));
$$;

create or replace function public.bv_crew_message_delete(p_id bigint)
returns void language sql security definer set search_path = '' as $$
  update bulavata.crew_messages set deleted = true, body = '' where id = p_id
    and (author = (select auth.uid()) or bulavata.crew_owner(crew_id) = (select auth.uid()));
$$;

-- ---------------------------------------------------------------- the room read: messages + people + reactions + replies, newest first
create or replace function public.bv_crew_messages2(p_crew bigint, lim integer default 80)
returns jsonb language sql stable security definer set search_path = '' as $$
  with ok as (select bulavata.in_crew(p_crew) as yes),
  page as (
    select m.* from bulavata.crew_messages m, ok
    where ok.yes and m.crew_id = p_crew and (m.expires_at is null or m.expires_at > now())
    order by m.created_at desc limit lim)
  select jsonb_build_object(
    'settings', (select jsonb_build_object('vanish_seconds', c.vanish_seconds, 'broadcast', c.broadcast, 'is_owner', c.owner = (select auth.uid()),
                   'can_post', bulavata.crew_can_post(p_crew), 'pinned', c.pinned_message)
                 from bulavata.crews c, ok where ok.yes and c.id = p_crew),
    'pinned', (select jsonb_build_object('id', pm.id, 'body', pm.body, 'handle', pp.handle)
               from bulavata.crews c join bulavata.crew_messages pm on pm.id = c.pinned_message join bulavata.profiles pp on pp.id = pm.author, ok
               where ok.yes and c.id = p_crew and not pm.deleted and (pm.expires_at is null or pm.expires_at > now())),
    'messages', coalesce((select jsonb_agg(jsonb_build_object(
        'id', x.id, 'author', x.author, 'handle', p.handle, 'display_name', p.display_name, 'avatar_emoji', p.avatar_emoji,
        'body', case when x.deleted then null else x.body end, 'deleted', x.deleted, 'kind', x.kind,
        'created_at', x.created_at, 'expires_at', x.expires_at,
        'reactions', bulavata.reaction_summary('message', x.id),
        'reply', (select jsonb_build_object('id', r.id, 'handle', rp.handle, 'body', case when r.deleted then null else left(r.body, 120) end)
                  from bulavata.crew_messages r join bulavata.profiles rp on rp.id = r.author where r.id = x.reply_to)
      ) order by x.created_at desc)
      from page x join bulavata.profiles p on p.id = x.author), '[]'::jsonb));
$$;

grant execute on function public.bv_crew_settings(bigint,integer,boolean), public.bv_crew_pin(bigint,bigint),
  public.bv_crew_message_delete(bigint), public.bv_crew_messages2(bigint,integer),
  bulavata.crew_can_post(bigint), bulavata.crew_owner(bigint) to authenticated; -- the policies run as the signed-in role
revoke execute on function public.bv_crew_settings(bigint,integer,boolean), public.bv_crew_pin(bigint,bigint),
  public.bv_crew_message_delete(bigint), public.bv_crew_messages2(bigint,integer),
  bulavata.crew_owner(bigint), bulavata.crew_can_post(bigint), bulavata.crew_message_expiry() from public, anon;

-- the app inserts through this view; expose reply_to so a reply can be sent the same way
create or replace view public.bv_crew_messages with (security_invoker = true) as
  select id, crew_id, author, body, created_at, reply_to from bulavata.crew_messages;

-- vanished messages are really deleted, every ten minutes
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'sota-koro-vanish-sweep';
    perform cron.schedule('sota-koro-vanish-sweep', '*/10 * * * *', $job$delete from bulavata.crew_messages where expires_at < now()$job$);
  end if;
end $$;
