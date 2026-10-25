-- New device leases must negotiate afresh instead of replaying expired-device SDP.
begin;
create or replace function bulavata.call_rpc(p_action text,p_args jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=auth.uid();
  cid uuid:=nullif(p_args->>'call','')::uuid;
  crew bigint:=nullif(p_args->>'crew','')::bigint;
  device uuid:=nullif(p_args->>'device','')::uuid;
  target uuid:=nullif(p_args->>'target','')::uuid;
  r bulavata.call_rooms;
  person bulavata.call_people;
  req bulavata.call_callbacks;
  n integer;
  signal_id bigint;
  result jsonb;
  kind text:=p_args->>'kind';
  payload jsonb:=p_args->'payload';
  call_action text:=p_args->>'action';
begin
  if actor is null then raise exception 'Sign in to use calls.' using errcode='42501'; end if;
  -- Every state transition for a person is serialized across rooms and devices.
  perform pg_advisory_xact_lock(hashtextextended(actor::text,20261025));
  if p_action='start' then
    perform bulavata.call_require_crew(crew);
    if device is null or p_args->>'mode' not in ('audio','video') or p_args->>'mode' is null
      or (p_args->>'capacity')::integer not between 2 and 6 or p_args->>'capacity' is null then raise exception 'Invalid call settings.'; end if;
    perform pg_advisory_xact_lock(hashtextextended('crew:'||crew::text,20261025));
    perform bulavata.call_sweep();
    if exists(select 1 from bulavata.call_people p join bulavata.call_rooms a on a.id=p.call_id where p.member=actor and p.state in ('joined','waiting') and a.status<>'ended') then raise exception 'Leave your current call first.'; end if;
    if exists(select 1 from bulavata.call_rooms where crew_id=crew and status<>'ended') then raise exception 'This Koro already has an open call.'; end if;
    if (select count(*) from bulavata.call_rooms where host=actor and created_at>clock_timestamp()-interval '5 minutes')>=10 then raise exception 'Too many calls. Try again shortly.'; end if;
    if (select count(*) from bulavata.crew_members where crew_id=crew)>500 then raise exception 'Use a smaller Koro for native calls.'; end if;
    insert into bulavata.call_rooms(crew_id,host,mode,lobby,capacity)
      values(crew,actor,p_args->>'mode',coalesce((p_args->>'lobby')::boolean,false),(p_args->>'capacity')::integer) returning * into r;
    insert into bulavata.call_people(call_id,member,state,device_id,joined_at,last_seen)
      select r.id,m.member,case when m.member=actor then 'joined' else 'ringing' end,
        case when m.member=actor then device end,case when m.member=actor then clock_timestamp() end,
        case when m.member=actor then clock_timestamp() end from bulavata.crew_members m where m.crew_id=crew;
    return bulavata.call_snapshot(r.id);
  elsif p_action='list' then
    if crew is not null then perform bulavata.call_require_crew(crew); end if;
    perform bulavata.call_sweep();
    select coalesce(jsonb_agg(bulavata.call_summary(q.id) order by q.created_at desc),'[]'::jsonb) into result from (
      select a.id,a.created_at from bulavata.call_rooms a where (crew is null or a.crew_id=crew)
      and exists(select 1 from bulavata.crew_members m where m.crew_id=a.crew_id and m.member=actor)
      and a.created_at>=clock_timestamp()-interval '30 days' order by a.created_at desc limit 40) q;
    return result;
  elsif p_action in ('callback_request','callback_list','availability') then
    perform bulavata.call_require_crew(crew);
    if p_action='availability' then
      if p_args->>'available' is not null then
        if not exists(select 1 from bulavata.crews where id=crew and owner=actor) then raise exception 'Only the Koro owner changes availability.' using errcode='42501'; end if;
        insert into bulavata.call_availability(crew_id,available) values(crew,(p_args->>'available')::boolean)
          on conflict(crew_id) do update set available=excluded.available,updated_at=clock_timestamp();
      end if;
      return jsonb_build_object('available',coalesce((select available from bulavata.call_availability where crew_id=crew),false),'is_owner',exists(select 1 from bulavata.crews where id=crew and owner=actor));
    elsif p_action='callback_request' then
      if char_length(coalesce(p_args->>'note',''))>300 then raise exception 'Keep your callback note under 300 characters.'; end if;
      if exists(select 1 from bulavata.call_callbacks where crew_id=crew and requester=actor and state in ('queued','claimed')) then raise exception 'You already have a pending callback.'; end if;
      if (select count(*) from bulavata.call_callbacks where requester=actor and created_at>clock_timestamp()-interval '1 hour')>=5 then raise exception 'Too many callback requests. Try later.'; end if;
      insert into bulavata.call_callbacks(crew_id,requester,note) values(crew,actor,trim(coalesce(p_args->>'note',''))) returning * into req;
      return to_jsonb(req)||jsonb_build_object('requester_name',(select display_name from bulavata.profiles where id=actor));
    else
      perform bulavata.call_sweep();
      select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]'::jsonb) into result from (
        select cb.*,p.display_name requester_name from bulavata.call_callbacks cb join bulavata.profiles p on p.id=cb.requester
        where cb.crew_id=crew and (cb.requester=actor or exists(select 1 from bulavata.crews where id=crew and owner=actor))
        order by cb.created_at desc limit 100) q;
      return jsonb_build_object('available',coalesce((select available from bulavata.call_availability where crew_id=crew),false),'is_owner',exists(select 1 from bulavata.crews where id=crew and owner=actor),'requests',result);
    end if;
  elsif p_action='callback_act' then
    select * into req from bulavata.call_callbacks where id=(p_args->>'request')::uuid for update;
    if req.id is null then raise exception 'Callback unavailable.'; end if;
    perform bulavata.call_require_crew(req.crew_id);
    if call_action not in ('claim','complete','cancel') or call_action is null then raise exception 'Invalid callback action.'; end if;
    if call_action='cancel' then
      if req.requester<>actor and not exists(select 1 from bulavata.crews where id=req.crew_id and owner=actor) then raise exception 'Callback unavailable.' using errcode='42501'; end if;
    elsif not exists(select 1 from bulavata.crews where id=req.crew_id and owner=actor) then raise exception 'Only the Koro owner manages callbacks.' using errcode='42501'; end if;
    if req.state not in ('queued','claimed') then return to_jsonb(req); end if;
    update bulavata.call_callbacks set state=case call_action when 'claim' then 'claimed' when 'complete' then 'done' else 'cancelled' end,updated_at=clock_timestamp() where id=req.id returning * into req;
    return to_jsonb(req);
  end if;

  select * into r from bulavata.call_rooms where id=cid for update;
  if r.id is null then raise exception 'This call is unavailable.'; end if;
  perform bulavata.call_require_crew(r.crew_id);
  perform bulavata.call_sweep(cid);
  select * into r from bulavata.call_rooms where id=cid;
  if p_action='snapshot' then return bulavata.call_snapshot(cid); end if;
  if r.status='ended' then raise exception 'This call has ended.'; end if;
  select * into person from bulavata.call_people where call_id=cid and member=actor;
  if p_action='act' and call_action in ('accept','join') then
    if device is null then raise exception 'A call device is required.'; end if;
    if person.state in ('kicked','rejected') then raise exception 'The host has closed your admission.' using errcode='42501'; end if;
    if person.state in ('joined','waiting') and person.device_id is distinct from device then raise exception 'This call was answered on another device.'; end if;
    if exists(select 1 from bulavata.call_people p join bulavata.call_rooms a on a.id=p.call_id where p.member=actor and p.state in ('joined','waiting') and a.status<>'ended' and a.id<>cid) then raise exception 'Leave your current call first.'; end if;
    if person.state<>'joined' or person.state is null then
      select count(*) into n from bulavata.call_people where call_id=cid and state='joined';
      if n>=r.capacity then raise exception 'This call is full.'; end if;
    end if;
    -- A rejoin starts a new media negotiation; do not replay an expired device's SDP.
    if person.state is null or person.state not in ('joined','waiting') then
      delete from bulavata.call_signals where call_id=cid and (sender=actor or recipient=actor);
    end if;
    insert into bulavata.call_people(call_id,member,state,device_id,joined_at,last_seen)
      values(cid,actor,case when r.lobby and r.host<>actor then 'waiting' else 'joined' end,device,clock_timestamp(),clock_timestamp())
      on conflict(call_id,member) do update set state=case when call_people.state='joined' then 'joined' else excluded.state end,
        device_id=excluded.device_id,joined_at=coalesce(call_people.joined_at,excluded.joined_at),last_seen=excluded.last_seen;
    if (select count(*) from bulavata.call_people where call_id=cid and state='joined')>1 then update bulavata.call_rooms set status='active' where id=cid; end if;
    return bulavata.call_snapshot(cid);
  elsif p_action='act' and call_action in ('decline','busy') then
    if person.state in ('joined','waiting') then raise exception 'Leave the call on the device that answered it.'; end if;
    if person.state in ('kicked','rejected') then raise exception 'The host has closed your admission.' using errcode='42501'; end if;
    insert into bulavata.call_people(call_id,member,state) values(cid,actor,case when call_action='busy' then 'busy' else 'declined' end)
      on conflict(call_id,member) do update set state=excluded.state;
    return bulavata.call_snapshot(cid);
  elsif p_action='act' and call_action in ('end','kick','admit','reject') then
    if actor<>r.host and not (call_action='end' and exists(select 1 from bulavata.crews where id=r.crew_id and owner=actor)) then raise exception 'Only the host manages this call.' using errcode='42501'; end if;
    if call_action='end' then
      update bulavata.call_rooms set status='ended',ended_at=clock_timestamp(),end_reason='host_ended' where id=cid;
      perform bulavata.call_sweep(cid);
    else
      if target is null or target=r.host then raise exception 'Choose another participant.'; end if;
      if call_action='admit' then
        if not exists(select 1 from bulavata.crew_members where crew_id=r.crew_id and member=target) then raise exception 'This person left the Koro.'; end if;
        if (select count(*) from bulavata.call_people where call_id=cid and state='joined')>=r.capacity then raise exception 'This call is full.'; end if;
        update bulavata.call_people set state='joined',last_seen=clock_timestamp() where call_id=cid and member=target and state='waiting';
        if not found then raise exception 'This person is no longer waiting.'; end if;
        update bulavata.call_rooms set status='active' where id=cid;
      else
        update bulavata.call_people set state=case when call_action='kick' then 'kicked' else 'rejected' end,recording=false,device_id=null where call_id=cid and member=target;
        delete from bulavata.call_signals where call_id=cid and (sender=target or recipient=target);
      end if;
    end if;
    return bulavata.call_snapshot(cid);
  end if;

  if person.state not in ('joined','waiting') or person.state is null or person.device_id is distinct from device or device is null then raise exception 'This device has not joined the call.' using errcode='42501'; end if;
  if p_action='act' and call_action='heartbeat' then
    update bulavata.call_people set last_seen=clock_timestamp() where call_id=cid and member=actor;
  elsif p_action='act' and call_action='leave' then
    update bulavata.call_people set state='left',recording=false,device_id=null where call_id=cid and member=actor;
    if actor=r.host then update bulavata.call_rooms set status='ended',ended_at=clock_timestamp(),end_reason='host_left' where id=cid; perform bulavata.call_sweep(cid); end if;
    delete from bulavata.call_signals where call_id=cid and (sender=actor or recipient=actor);
  elsif p_action='act' and call_action in ('record_start','record_stop') and person.state='joined' then
    update bulavata.call_people set recording=(call_action='record_start'),last_seen=clock_timestamp() where call_id=cid and member=actor;
  elsif p_action='position' and person.state='joined' then
    if (p_args->>'x')::real not between 0 and 1 or (p_args->>'y')::real not between 0 and 1 or p_args->>'x' is null or p_args->>'y' is null then raise exception 'Invalid room position.'; end if;
    update bulavata.call_people set spatial_x=(p_args->>'x')::real,spatial_y=(p_args->>'y')::real,last_seen=clock_timestamp() where call_id=cid and member=actor;
  elsif p_action in ('signal','signals') and person.state='joined' then
    if p_action='signal' then
      if target is null or target=actor or kind not in ('offer','answer','ice') or kind is null then raise exception 'Invalid signal recipient or type.'; end if;
      if not exists(select 1 from bulavata.call_people p join bulavata.crew_members m on m.member=p.member and m.crew_id=r.crew_id where p.call_id=cid and p.member=target and p.state='joined' and p.last_seen>clock_timestamp()-interval '60 seconds') then raise exception 'Recipient is no longer in this call.' using errcode='42501'; end if;
      if kind in ('offer','answer') and (jsonb_typeof(payload)<>'object' or payload->>'type' is distinct from kind or payload->>'sdp' is null or char_length(payload->>'sdp')<1) then raise exception 'Invalid session description.'; end if;
      if kind='ice' and payload is not null and payload<>'null'::jsonb and jsonb_typeof(payload)<>'object' then raise exception 'Invalid ICE candidate.'; end if;
      if octet_length(coalesce(payload::text,'null'))>(case when kind='ice' then 8192 else 98304 end) then raise exception 'Signal exceeds its size limit.'; end if;
      if (select count(*) from bulavata.call_signals where sender=actor and created_at>clock_timestamp()-interval '10 seconds')>=300 then raise exception 'Signaling rate limit reached.'; end if;
      insert into bulavata.call_signals(call_id,sender,sender_device,recipient,kind,payload) values(cid,actor,device,target,kind,payload) returning id into signal_id;
      return to_jsonb(signal_id);
    else
      select coalesce(jsonb_agg(to_jsonb(q) order by q.id),'[]'::jsonb) into result from (
        select s.id,s.sender,s.recipient,s.kind,s.payload,s.created_at from bulavata.call_signals s
        join bulavata.call_people p on p.call_id=s.call_id and p.member=s.sender
        where s.call_id=cid and s.recipient=actor and s.id>greatest(coalesce((p_args->>'after')::bigint,0),0)
        and s.expires_at>clock_timestamp() and p.state='joined' and p.device_id=s.sender_device
        and p.last_seen>clock_timestamp()-interval '60 seconds'
        and exists(select 1 from bulavata.crew_members m where m.crew_id=r.crew_id and m.member=s.sender)
        order by s.id limit 200) q;
      return result;
    end if;
  else raise exception 'Invalid call action.';
  end if;
  return bulavata.call_snapshot(cid);
end $$;

notify pgrst,'reload schema';
commit;
