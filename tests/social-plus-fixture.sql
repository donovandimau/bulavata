create schema auth; create schema bulavata;
create role anon nologin; create role authenticated nologin;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table bulavata.profiles(id uuid primary key, handle text unique, display_name text, pronouns text, bio text, avatar_emoji text, room_theme text, room_accent text, room_css text, room_song text, human_verified boolean default false, created_at timestamptz default now());
create table bulavata.friendships(id bigserial primary key, requester uuid, addressee uuid, status text, created_at timestamptz default now());
create table bulavata.moments(id bigint generated always as identity primary key, author uuid references bulavata.profiles(id), body text, media_url text, caption text, created_at timestamptz default now(), luv_count int default 0);
alter table bulavata.moments enable row level security;
create policy m_ins on bulavata.moments for insert with check (author=(select auth.uid()));
create table bulavata.pulses(id bigint generated always as identity primary key, author uuid, mood text, text text, created_at timestamptz default now(), luv_count int default 0);
create table bulavata.wall_posts(id bigint generated always as identity primary key, wall_owner uuid, author uuid, body text, ink text, created_at timestamptz default now(), hidden boolean default false, luv_count int default 0);
create table bulavata.luv(id bigint generated always as identity primary key, giver uuid, target_kind text, target_id bigint, target_profile uuid, created_at timestamptz default now());
create table bulavata.crews(id bigint generated always as identity primary key, name text, owner uuid);
create table bulavata.crew_members(crew_id bigint, member uuid, joined_at timestamptz default now());
create table bulavata.top_friends(owner uuid, friend uuid, slot int);
create function bulavata.are_friends(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from bulavata.friendships f where f.status='accepted' and ((f.requester=a and f.addressee=b) or (f.requester=b and f.addressee=a))) $$;
create function bulavata.my_circle() returns table(id uuid) language sql stable security definer set search_path='' as $$ select case when f.requester=(select auth.uid()) then f.addressee else f.requester end from bulavata.friendships f where f.status='accepted' and ((select auth.uid()) in (f.requester,f.addressee)) $$;
create function bulavata.visible_to_me(a uuid) returns boolean language sql stable security definer set search_path='' as $$ select a=(select auth.uid()) or bulavata.are_friends((select auth.uid()),a) $$;
create policy m_read on bulavata.moments for select using (bulavata.visible_to_me(author));
create view public.bv_moments with (security_invoker=true) as select id,author,body,media_url,caption,created_at from bulavata.moments;
grant usage on schema public, bulavata to anon, authenticated;
grant select, insert on public.bv_moments to authenticated; grant select, insert on bulavata.moments to authenticated;
insert into bulavata.profiles(id,handle,display_name,avatar_emoji,room_accent) values
 ('11111111-1111-1111-1111-111111111111','ana','Ana','🌺','#4FA8D8'),
 ('22222222-2222-2222-2222-222222222222','bo','Bo','🥥','#2A9D8F'),
 ('33333333-3333-3333-3333-333333333333','cy','Cy','🐚','#E76F51');
insert into bulavata.friendships(requester,addressee,status) values ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','accepted');
insert into bulavata.crews(name,owner) values ('Koro A','11111111-1111-1111-1111-111111111111');
insert into bulavata.crew_members values (1,'11111111-1111-1111-1111-111111111111'),(1,'22222222-2222-2222-2222-222222222222');
