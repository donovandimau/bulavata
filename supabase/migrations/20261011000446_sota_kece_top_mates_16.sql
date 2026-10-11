-- Sota Kece keeps the canonical Bula Vata schema and all existing friendships.
-- Change only the slot ceiling; uniqueness and ownership policies stay intact.
alter table bulavata.top_friends
  drop constraint if exists top_friends_slot_check;
alter table bulavata.top_friends
  add constraint top_friends_slot_check check (slot between 1 and 16);

-- Owners can unpin and swap ranks atomically, including adjacent empty seats.
-- Invoker rights retain the table's existing ownership RLS.
create or replace function public.bv_manage_top(p_slot integer,p_action text)
returns void language plpgsql security invoker
set search_path=bulavata,public,pg_temp as $$
declare
  actor uuid:=auth.uid();
  other_slot integer;
  mate uuid;
  other_mate uuid;
begin
  if actor is null then raise exception 'Sign in to manage your mates'; end if;
  if p_slot not between 1 and 16 or p_slot is null then raise exception 'Invalid mate slot'; end if;
  if p_action not in ('up','down','remove') or p_action is null then raise exception 'Invalid mate action'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  select friend into mate from bulavata.top_friends where owner=actor and slot=p_slot for update;
  if mate is null then raise exception 'That mate slot is empty'; end if;
  if p_action='remove' then
    delete from bulavata.top_friends where owner=actor and slot=p_slot;
    return;
  end if;
  other_slot:=p_slot+case when p_action='up' then -1 else 1 end;
  if other_slot not between 1 and 16 then return; end if;
  select friend into other_mate from bulavata.top_friends where owner=actor and slot=other_slot for update;
  delete from bulavata.top_friends where owner=actor and slot in (p_slot,other_slot);
  insert into bulavata.top_friends(owner,friend,slot) values(actor,mate,other_slot);
  if other_mate is not null then
    insert into bulavata.top_friends(owner,friend,slot) values(actor,other_mate,p_slot);
  end if;
end;
$$;
revoke all on function public.bv_manage_top(integer,text) from public,anon;
grant execute on function public.bv_manage_top(integer,text) to authenticated;
