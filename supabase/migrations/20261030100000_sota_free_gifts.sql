-- Sota Kece: free gifting (no money). Friends only, 3 gifts per 24 hours, same rhythm as Uro.
-- Every gift is a row, so the table itself is the demand test. Applied to dimau-core-sydney 30 Oct 2026.

create table if not exists bulavata.gifts (
  id         bigint generated always as identity primary key,
  giver      uuid not null references bulavata.profiles(id) on delete cascade,
  receiver   uuid not null references bulavata.profiles(id) on delete cascade,
  gift       text not null check (gift in ('bilo','salusalu','lovo','bua','niu','drua','rugby','sigidrigi')),
  note       text check (note is null or char_length(note) <= 80),
  hidden     boolean not null default false,
  created_at timestamptz not null default now(),
  check (giver <> receiver)
);
create index if not exists gifts_receiver_idx on bulavata.gifts (receiver, created_at desc);
create index if not exists gifts_giver_idx    on bulavata.gifts (giver, created_at desc);

-- Locked: no direct reads or writes. Everything goes through the functions below.
alter table bulavata.gifts enable row level security;
revoke all on bulavata.gifts from anon, authenticated;

create or replace function bulavata.gift_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from bulavata.friendships f
    where f.status = 'accepted'
      and ((f.requester = a and f.addressee = b) or (f.requester = b and f.addressee = a)));
$$;

create or replace function bulavata.gifts_used(who uuid)
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from bulavata.gifts
  where giver = who and created_at > now() - interval '24 hours';
$$;

create or replace function public.bv_gifts_left()
returns int language sql stable security definer set search_path = '' as $$
  select greatest(0, 3 - bulavata.gifts_used((select auth.uid())));
$$;

create or replace function public.bv_gift_send(p_to uuid, p_gift text, p_note text default null)
returns int language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  used int;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  if p_to is null or p_to = me then raise exception 'SELF_GIFT'; end if;
  if not bulavata.gift_friends(me, p_to) then raise exception 'NOT_FRIENDS'; end if;
  -- one sender at a time, so two fast taps cannot beat the daily limit
  perform pg_advisory_xact_lock(hashtext('bv_gift:' || me::text));
  used := bulavata.gifts_used(me);
  if used >= 3 then raise exception 'OUT_OF_GIFTS'; end if;
  insert into bulavata.gifts (giver, receiver, gift, note)
  values (me, p_to, p_gift, nullif(btrim(left(coalesce(p_note, ''), 80)), ''));
  return greatest(0, 2 - used);
end $$;

create or replace function public.bv_gifts_for(p_owner uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  mine boolean;
  fr boolean;
begin
  if me is null or p_owner is null then return jsonb_build_object('visible', false); end if;
  mine := (me = p_owner);
  fr := bulavata.gift_friends(me, p_owner);
  if not mine and not fr then return jsonb_build_object('visible', false); end if;
  return jsonb_build_object(
    'visible',  true,
    'is_me',    mine,
    'can_send', fr and not mine,
    'left',     greatest(0, 3 - bulavata.gifts_used(me)),
    'counts',   coalesce((select jsonb_object_agg(gift, n) from (
                  select gift, count(*) n from bulavata.gifts
                  where receiver = p_owner and not hidden group by gift) s), '{}'::jsonb),
    'recent',   coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc, r.id desc) from (
                  select g.id, g.gift, g.note, g.created_at, p.handle, p.avatar_emoji
                  from bulavata.gifts g join bulavata.profiles p on p.id = g.giver
                  where g.receiver = p_owner and not g.hidden
                  order by g.created_at desc, g.id desc limit 12) r), '[]'::jsonb));
end $$;

create or replace function public.bv_gift_hide(p_id bigint)
returns boolean language sql security definer set search_path = '' as $$
  with u as (
    update bulavata.gifts set hidden = true
    where id = p_id and receiver = (select auth.uid()) returning 1)
  select exists (select 1 from u);
$$;

revoke all on function bulavata.gift_friends(uuid, uuid), bulavata.gifts_used(uuid) from public, anon, authenticated;
revoke all on function public.bv_gifts_left(), public.bv_gift_send(uuid, text, text),
  public.bv_gifts_for(uuid), public.bv_gift_hide(bigint) from public, anon;
grant execute on function public.bv_gifts_left(), public.bv_gift_send(uuid, text, text),
  public.bv_gifts_for(uuid), public.bv_gift_hide(bigint) to authenticated;

-- For Donovan: how gifting is doing, one row per day. Not exposed to the app.
create or replace view bulavata.gift_daily_stats as
  select date_trunc('day', created_at)::date as day,
         count(*)                    as gifts_sent,
         count(distinct giver)       as people_giving,
         count(distinct receiver)    as people_receiving,
         mode() within group (order by gift) as most_popular
  from bulavata.gifts group by 1 order by 1 desc;
revoke all on bulavata.gift_daily_stats from anon, authenticated;
