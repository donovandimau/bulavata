-- Run after migration; transaction rolls back every fixture and call/signal.
begin;
insert into auth.users(id,email) values
('61025000-0000-4000-8000-000000000001','native-calls-host@example.invalid'),
('61025000-0000-4000-8000-000000000002','native-calls-guest@example.invalid'),
('61025000-0000-4000-8000-000000000003','native-calls-third@example.invalid'),
('61025000-0000-4000-8000-000000000004','native-calls-outsider@example.invalid');
insert into bulavata.profiles(id,handle,display_name,age_band) values
('61025000-0000-4000-8000-000000000001','native_call_host','Native call host','adult'),
('61025000-0000-4000-8000-000000000002','native_call_guest','Native call guest','adult'),
('61025000-0000-4000-8000-000000000003','native_call_third','Native call third','adult'),
('61025000-0000-4000-8000-000000000004','native_call_outsider','Native call outsider','adult');
insert into bulavata.crews(id,name,owner) values
(61025001,'Native call fixture','61025000-0000-4000-8000-000000000001'),
(61025002,'Other call fixture','61025000-0000-4000-8000-000000000003');
insert into bulavata.crew_members(crew_id,member) values
(61025001,'61025000-0000-4000-8000-000000000001'),
(61025001,'61025000-0000-4000-8000-000000000002'),
(61025001,'61025000-0000-4000-8000-000000000003'),
(61025002,'61025000-0000-4000-8000-000000000002'),
(61025002,'61025000-0000-4000-8000-000000000003');
create function pg_temp.assert_true(ok boolean,message text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL: %',message; end if; end$$;
create function pg_temp.assert_denied(command text,message text) returns void language plpgsql security invoker as $$begin
  begin execute command; exception when others then return; end;
  raise exception 'FAIL: %',message;
end$$;
select pg_temp.assert_true((select bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='bulavata' and c.relname in ('call_rooms','call_people','call_signals','call_callbacks','call_availability')),'All private call tables must have RLS');
select pg_temp.assert_true(not has_table_privilege('authenticated','bulavata.call_signals','select,insert,update,delete'),'No direct authenticated signal table access');
select pg_temp.assert_true(not has_function_privilege('anon','public.bv_call_list(bigint)','execute'),'Anonymous RPC access must be revoked');
set local role anon;
select pg_temp.assert_denied('select public.bv_call_list(null)','Anonymous list succeeded');
set local role authenticated;
select set_config('request.jwt.claim.sub','61025000-0000-4000-8000-000000000004',true);
select pg_temp.assert_true(public.bv_call_list(null)='[]'::jsonb,'Outsider list exposed private calls');
select pg_temp.assert_denied($q$select public.bv_call_start(61025001,'video',false,2,'61025000-0000-4000-8000-000000000014')$q$,'Outsider started call');
select set_config('request.jwt.claim.sub','61025000-0000-4000-8000-000000000001',true);
select set_config('calls.test',public.bv_call_start(61025001,'video',false,2,'61025000-0000-4000-8000-000000000011')->'call'->>'id',true);
select pg_temp.assert_true(public.bv_call_snapshot(current_setting('calls.test')::uuid)->'call'->>'mode'='video','Video mode not retained');
select pg_temp.assert_true(jsonb_array_length(public.bv_call_snapshot(current_setting('calls.test')::uuid)->'participants')=3,'Koro invitations not created atomically');
select pg_temp.assert_denied($q$select public.bv_call_start(61025001,'audio',false,2,'61025000-0000-4000-8000-000000000011')$q$,'Duplicate call succeeded');
select set_config('request.jwt.claim.sub','61025000-0000-4000-8000-000000000002',true);
select pg_temp.assert_true(public.bv_call_act(current_setting('calls.test')::uuid,'accept','61025000-0000-4000-8000-000000000012')->'call'->>'status'='active','Accept did not activate call');
select pg_temp.assert_denied(format($q$select public.bv_call_act(%L,'accept','61025000-0000-4000-8000-000000000099')$q$,current_setting('calls.test')),'Other device answered an accepted call');
select pg_temp.assert_denied(format($q$select public.bv_call_act(%L,'heartbeat','61025000-0000-4000-8000-000000000099')$q$,current_setting('calls.test')),'Other device sent heartbeat');
select pg_temp.assert_denied(format($q$select public.bv_call_act(%L,'end','61025000-0000-4000-8000-000000000012')$q$,current_setting('calls.test')),'Guest ended host call');
select pg_temp.assert_denied(format($q$select public.bv_call_signal(%L,'61025000-0000-4000-8000-000000000004','offer','{"type":"offer","sdp":"v=0"}','61025000-0000-4000-8000-000000000012')$q$,current_setting('calls.test')),'Signal to outsider succeeded');
select pg_temp.assert_denied(format($q$select public.bv_call_signal(%L,'61025000-0000-4000-8000-000000000001','offer','{"type":"answer","sdp":"v=0"}','61025000-0000-4000-8000-000000000012')$q$,current_setting('calls.test')),'Wrong description kind succeeded');
select public.bv_call_signal(current_setting('calls.test')::uuid,'61025000-0000-4000-8000-000000000001','offer','{"type":"offer","sdp":"v=0"}','61025000-0000-4000-8000-000000000012');
select pg_temp.assert_true(public.bv_call_signals(current_setting('calls.test')::uuid,0,'61025000-0000-4000-8000-000000000012')='[]'::jsonb,'Sender read recipient signaling');
select public.bv_call_act(current_setting('calls.test')::uuid,'record_start','61025000-0000-4000-8000-000000000012');
select pg_temp.assert_true(public.bv_call_snapshot(current_setting('calls.test')::uuid)->'call'->'recording_members' ? '61025000-0000-4000-8000-000000000002','Recording notice not exposed to participants');
select public.bv_call_position(current_setting('calls.test')::uuid,'61025000-0000-4000-8000-000000000012',0.2,0.8);
select pg_temp.assert_denied(format($q$select public.bv_call_position(%L,'61025000-0000-4000-8000-000000000012',-1,2)$q$,current_setting('calls.test')),'Out-of-range position succeeded');
select set_config('request.jwt.claim.sub','61025000-0000-4000-8000-000000000003',true);
select pg_temp.assert_denied(format($q$select public.bv_call_act(%L,'accept','61025000-0000-4000-8000-000000000013')$q$,current_setting('calls.test')),'Participant capacity exceeded');
select set_config('request.jwt.claim.sub','61025000-0000-4000-8000-000000000004',true);
select pg_temp.assert_denied(format($q$select public.bv_call_snapshot(%L)$q$,current_setting('calls.test')),'Outsider read snapshot');
select set_config('request.jwt.claim.sub','61025000-0000-4000-8000-000000000001',true);
select pg_temp.assert_true(jsonb_array_length(public.bv_call_signals(current_setting('calls.test')::uuid,0,'61025000-0000-4000-8000-000000000011'))=1,'Recipient did not receive authorized signal');
select public.bv_call_signal(current_setting('calls.test')::uuid,'61025000-0000-4000-8000-000000000002','offer','{"type":"offer","sdp":"v=0 old device"}','61025000-0000-4000-8000-000000000011');
reset role;
update bulavata.call_people set last_seen=clock_timestamp()-interval '70 seconds' where call_id=current_setting('calls.test')::uuid and member='61025000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','61025000-0000-4000-8000-000000000002',true);
select public.bv_call_act(current_setting('calls.test')::uuid,'accept','61025000-0000-4000-8000-000000000022');
select pg_temp.assert_true(public.bv_call_signals(current_setting('calls.test')::uuid,0,'61025000-0000-4000-8000-000000000022')='[]'::jsonb,'Rejoined device received old SDP from its expired connection');
select set_config('request.jwt.claim.sub','61025000-0000-4000-8000-000000000001',true);
select public.bv_call_act(current_setting('calls.test')::uuid,'kick','61025000-0000-4000-8000-000000000011','61025000-0000-4000-8000-000000000002');
select set_config('request.jwt.claim.sub','61025000-0000-4000-8000-000000000002',true);
select pg_temp.assert_denied(format($q$select public.bv_call_act(%L,'accept','61025000-0000-4000-8000-000000000012')$q$,current_setting('calls.test')),'Kicked member rejoined');
select pg_temp.assert_denied(format($q$select public.bv_call_signals(%L,0,'61025000-0000-4000-8000-000000000012')$q$,current_setting('calls.test')),'Kicked member read signals');
select set_config('request.jwt.claim.sub','61025000-0000-4000-8000-000000000001',true);
select public.bv_call_act(current_setting('calls.test')::uuid,'end','61025000-0000-4000-8000-000000000011');

-- Lobby admission and cross-call busy protection.
select set_config('calls.lobby',public.bv_call_start(61025001,'audio',true,3,'61025000-0000-4000-8000-000000000011')->'call'->>'id',true);
select set_config('request.jwt.claim.sub','61025000-0000-4000-8000-000000000002',true);
select public.bv_call_act(current_setting('calls.lobby')::uuid,'accept','61025000-0000-4000-8000-000000000012');
select pg_temp.assert_denied(format($q$select public.bv_call_signal(%L,'61025000-0000-4000-8000-000000000001','ice',null,'61025000-0000-4000-8000-000000000012')$q$,current_setting('calls.lobby')),'Waiting guest sent media signal');
select pg_temp.assert_denied($q$select public.bv_call_start(61025002,'audio',false,2,'61025000-0000-4000-8000-000000000012')$q$,'Waiting guest started another call');
select set_config('request.jwt.claim.sub','61025000-0000-4000-8000-000000000001',true);
select public.bv_call_act(current_setting('calls.lobby')::uuid,'admit','61025000-0000-4000-8000-000000000011','61025000-0000-4000-8000-000000000002');
select pg_temp.assert_true(public.bv_call_snapshot(current_setting('calls.lobby')::uuid)->'call'->>'joined_count'='2','Host admission failed');
reset role;
delete from bulavata.crew_members where crew_id=61025001 and member='61025000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','61025000-0000-4000-8000-000000000002',true);
select pg_temp.assert_denied(format($q$select public.bv_call_snapshot(%L)$q$,current_setting('calls.lobby')),'Removed member retained snapshot access');
reset role;
insert into bulavata.crew_members(crew_id,member) values(61025001,'61025000-0000-4000-8000-000000000002');
update bulavata.call_people set last_seen=clock_timestamp()-interval '70 seconds' where call_id=current_setting('calls.lobby')::uuid and member='61025000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','61025000-0000-4000-8000-000000000002',true);
select pg_temp.assert_true(public.bv_call_snapshot(current_setting('calls.lobby')::uuid)->'call'->>'status'='ended','Expired host lease did not end abandoned call');

-- No-answer timeout becomes a missed call and signaling never survives its TTL.
select set_config('request.jwt.claim.sub','61025000-0000-4000-8000-000000000001',true);
select set_config('calls.timeout',public.bv_call_start(61025001,'audio',false,3,'61025000-0000-4000-8000-000000000011')->'call'->>'id',true);
reset role;
update bulavata.call_rooms set ring_expires_at=clock_timestamp()-interval '1 second' where id=current_setting('calls.timeout')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub','61025000-0000-4000-8000-000000000002',true);
select pg_temp.assert_true(public.bv_call_snapshot(current_setting('calls.timeout')::uuid)->'call'->>'my_state'='missed','No-answer timeout did not mark missed call');

-- Callback requests remain visible to their requester and the Koro owner only.
select set_config('calls.callback',public.bv_callback_request(61025001,'Please call me about the lesson')->>'id',true);
select pg_temp.assert_denied($q$select public.bv_callback_request(61025001,'Duplicate')$q$,'Duplicate callback succeeded');
select pg_temp.assert_denied(format($q$select public.bv_callback_act(%L,'claim')$q$,current_setting('calls.callback')),'Requester claimed owner queue item');
select pg_temp.assert_denied($q$select public.bv_call_availability(61025001,true)$q$,'Guest changed owner availability');
select pg_temp.assert_true(public.bv_callback_list(61025001)->>'is_owner'='false','Guest mislabelled as owner');
select set_config('request.jwt.claim.sub','61025000-0000-4000-8000-000000000003',true);
select pg_temp.assert_true(public.bv_callback_list(61025001)->'requests'='[]'::jsonb,'Other Koro member read private callback note');
select set_config('request.jwt.claim.sub','61025000-0000-4000-8000-000000000001',true);
select pg_temp.assert_true(jsonb_array_length(public.bv_callback_list(61025001)->'requests')=1,'Owner cannot read callback queue');
select pg_temp.assert_true(public.bv_callback_list(61025001)->>'is_owner'='true','Owner queue controls not discoverable');
select pg_temp.assert_true(public.bv_callback_act(current_setting('calls.callback')::uuid,'claim')->>'state'='claimed','Owner callback claim failed');
select pg_temp.assert_true(public.bv_callback_act(current_setting('calls.callback')::uuid,'complete')->>'state'='done','Owner callback completion failed');
select pg_temp.assert_true(public.bv_call_availability(61025001,true)->>'available'='true','Owner availability update failed');
reset role;
select 'PASS: call membership, device ownership, capacity, signal privacy, lobby, removal, cleanup, recording notice, positions, callback authorization and explicit grants' as result;
rollback;
