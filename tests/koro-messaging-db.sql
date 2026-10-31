\set ON_ERROR_STOP 1
\pset format unaligned
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
insert into public.bv_crew_messages(crew_id,author,body) values (1,'11111111-1111-1111-1111-111111111111','welcome all');
select 'ana sets vanish 1h: '||(public.bv_crew_settings(1,3600,false)->>'vanish_seconds');
insert into public.bv_crew_messages(crew_id,author,body) values (1,'11111111-1111-1111-1111-111111111111','this one vanishes');
select 'vanishing msg has expiry: '||(select (expires_at is not null) from bulavata.crew_messages where body='this one vanishes');
select 'system line present: '||(select count(*) from bulavata.crew_messages where kind='system');
select public.bv_crew_pin(1,1);
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
insert into public.bv_crew_messages(crew_id,author,body,reply_to) values (1,'22222222-2222-2222-2222-222222222222','vinaka boss',1);
select 'bo react: '||(public.bv_react('message',1,'bula')->>'mine');
select 'bo cannot change settings:'; do $$ begin perform public.bv_crew_settings(1,null,true); raise exception 'LEAK'; exception when others then if sqlerrm='LEAK' then raise; end if; raise notice 'blocked %', sqlerrm; end $$;
select 'room messages='||jsonb_array_length(public.bv_crew_messages2(1,80)->'messages')||' pinned='||(public.bv_crew_messages2(1,80)->'pinned'->>'body')||' reply='||(public.bv_crew_messages2(1,80)->'messages'->0->'reply'->>'handle');
-- owner turns on broadcast
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
select 'broadcast on: '||(public.bv_crew_settings(1,3600,true)->>'broadcast');
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
select 'bo blocked from posting in broadcast:'; do $$ begin insert into public.bv_crew_messages(crew_id,author,body) values (1,'22222222-2222-2222-2222-222222222222','spam'); raise exception 'LEAK'; exception when others then if sqlerrm='LEAK' then raise; end if; raise notice 'blocked %', sqlstate; end $$;
select 'bo can_post='||(public.bv_crew_messages2(1,80)->'settings'->>'can_post');
-- expiry hides messages
reset role; update bulavata.crew_messages set expires_at=now()-interval '1 minute' where body='this one vanishes'; set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
select 'expired hidden from bo: '||(not (public.bv_crew_messages2(1,80)->'messages' @> '[{"body":"this one vanishes"}]'));
select 'expired hidden via view: '||(select count(*)=0 from public.bv_crew_messages where body='this one vanishes');
-- stranger
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false);
select 'cy sees messages (expect 0): '||jsonb_array_length(public.bv_crew_messages2(1,80)->'messages');
