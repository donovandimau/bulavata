-- Hosted talanoa. No video tokens, payment data or wallet balances are stored here.
create table public.bv_circles (
  id uuid primary key default gen_random_uuid(),
  crew_id bigint not null references bulavata.crews(id) on delete cascade,
  host uuid not null references bulavata.profiles(id),
  title text not null check (char_length(trim(title)) between 1 and 80),
  topic text not null default '' check (char_length(topic) <= 500),
  capacity integer not null default 6 check (capacity between 4 and 6),
  status text not null default 'planned' check (status in ('planned','open','ended')),
  created_at timestamptz not null default now()
);
create index bv_circles_crew_created on public.bv_circles(crew_id,created_at desc);
create index bv_circles_host on public.bv_circles(host);
create table public.bv_circle_people (
  circle_id uuid not null references public.bv_circles(id) on delete cascade,
  member uuid not null references bulavata.profiles(id),
  seat integer check (seat between 1 and 6),
  requested boolean not null default false,
  comments_paused boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key(circle_id,member),
  unique(circle_id,seat)
);
create index bv_circle_people_member on public.bv_circle_people(member);
create table public.bv_circle_comments (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.bv_circles(id) on delete cascade,
  author uuid not null references bulavata.profiles(id),
  body text not null check (char_length(trim(body)) between 1 and 900),
  created_at timestamptz not null default now()
);
create index bv_circle_comments_circle_created on public.bv_circle_comments(circle_id,created_at desc);
create index bv_circle_comments_author on public.bv_circle_comments(author);
alter table public.bv_circles enable row level security;
alter table public.bv_circle_people enable row level security;
alter table public.bv_circle_comments enable row level security;
create policy circles_read on public.bv_circles for select to authenticated
  using (bulavata.in_crew(crew_id));
create policy circles_create on public.bv_circles for insert to authenticated
  with check (host=(select auth.uid()) and bulavata.in_crew(crew_id) and status='planned');
create policy circles_host_update on public.bv_circles for update to authenticated
  using (host=(select auth.uid()) and bulavata.in_crew(crew_id))
  with check (host=(select auth.uid()) and bulavata.in_crew(crew_id));
create policy people_read on public.bv_circle_people for select to authenticated
  using (exists(select 1 from public.bv_circles c where c.id=circle_id));
create policy people_join on public.bv_circle_people for insert to authenticated
  with check (member=(select auth.uid()) and exists(select 1 from public.bv_circles c where c.id=circle_id and c.status<>'ended'));
create policy people_update on public.bv_circle_people for update to authenticated
  using (exists(select 1 from public.bv_circles c where c.id=circle_id and (member=(select auth.uid()) or c.host=(select auth.uid()))))
  with check (exists(select 1 from public.bv_circles c where c.id=circle_id and (member=(select auth.uid()) or c.host=(select auth.uid()))));
create policy comments_read on public.bv_circle_comments for select to authenticated
  using (exists(select 1 from public.bv_circles c where c.id=circle_id));
create policy comments_write on public.bv_circle_comments for insert to authenticated
  with check (author=(select auth.uid()) and exists(select 1 from public.bv_circles c where c.id=circle_id and c.status='open')
    and exists(select 1 from public.bv_circle_people p where p.circle_id=bv_circle_comments.circle_id and p.member=(select auth.uid()) and not p.comments_paused));
create policy comments_moderate on public.bv_circle_comments for delete to authenticated
  using (exists(select 1 from public.bv_circles c where c.id=circle_id and (author=(select auth.uid()) or c.host=(select auth.uid()))));
grant select,insert on public.bv_circles,public.bv_circle_people,public.bv_circle_comments to authenticated;
grant update(title,topic,status) on public.bv_circles to authenticated;
grant update(seat,requested,comments_paused) on public.bv_circle_people to authenticated;
grant delete on public.bv_circle_comments to authenticated;
revoke all on public.bv_circles,public.bv_circle_people,public.bv_circle_comments from anon;

create function bulavata.circle_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.id::text,61011));
  if tg_op='INSERT' then new.created_at=now();
  elsif old.status='ended' then raise exception 'This circle has ended.';
  elsif new.status<>old.status and not ((old.status='planned' and new.status in ('open','ended')) or (old.status='open' and new.status='ended')) then
    raise exception 'Invalid circle transition.';
  end if;
  return new;
end $$;
create trigger circle_guard before insert or update on public.bv_circles for each row execute function bulavata.circle_guard();

create function bulavata.circle_people_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare c public.bv_circles;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.circle_id::text,61011));
  select * into c from public.bv_circles where id=new.circle_id;
  if c.id is null or c.status='ended' then raise exception 'This circle is unavailable.'; end if;
  if tg_op='INSERT' then
    new.joined_at=now();
    if new.comments_paused or (new.seat is not null and not(new.member=c.host and new.seat=1)) then raise exception 'Only the host assigns speaker seats.'; end if;
  elsif auth.uid()<>c.host and (new.seat is distinct from old.seat or new.comments_paused<>old.comments_paused) then
    raise exception 'Only the host can moderate.';
  end if;
  if new.member=c.host and (new.seat is distinct from 1 or new.comments_paused) then raise exception 'The host keeps seat one.'; end if;
  if new.member<>c.host and new.seat=1 then raise exception 'Seat one belongs to the host.'; end if;
  if new.seat>c.capacity then raise exception 'All speaker seats are filled.'; end if;
  if new.comments_paused and new.requested then new.requested=false; end if;
  if new.seat is not null then new.requested=false; end if;
  return new;
end $$;
create trigger circle_people_guard before insert or update on public.bv_circle_people for each row execute function bulavata.circle_people_guard();

create function bulavata.circle_comment_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.circle_id::text,61011));
  if not exists(select 1 from public.bv_circles where id=new.circle_id and status='open') then raise exception 'Comments open when the host opens the circle.'; end if;
  if exists(select 1 from public.bv_circle_comments where author=auth.uid() and circle_id=new.circle_id and created_at>clock_timestamp()-interval '2 seconds') then
    raise exception 'Give the conversation a moment before posting again.';
  end if;
  new.created_at=clock_timestamp();
  return new;
end $$;
create trigger circle_comment_guard before insert on public.bv_circle_comments for each row execute function bulavata.circle_comment_guard();

create function public.bv_circle_create(p_crew bigint,p_title text,p_topic text,p_capacity integer) returns uuid
language plpgsql security invoker set search_path='' as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to host a circle.'; end if;
  insert into public.bv_circles(crew_id,host,title,topic,capacity) values(p_crew,auth.uid(),trim(p_title),trim(p_topic),p_capacity) returning id into cid;
  insert into public.bv_circle_people(circle_id,member,seat) values(cid,auth.uid(),1);
  return cid;
end $$;
revoke all on function public.bv_circle_create(bigint,text,text,integer) from public,anon;
grant execute on function public.bv_circle_create(bigint,text,text,integer) to authenticated;
revoke all on function bulavata.circle_guard(),bulavata.circle_people_guard(),bulavata.circle_comment_guard() from public,anon,authenticated;
