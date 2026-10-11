-- Run after the migration inside a transaction. All test fixtures roll back.
insert into auth.users(id,email) values
('61011000-0000-4000-8000-000000000001','kava-test-host@example.invalid'),
('61011000-0000-4000-8000-000000000002','kava-test-guest@example.invalid'),
('61011000-0000-4000-8000-000000000003','kava-test-outsider@example.invalid');
insert into bulavata.profiles(id,handle,display_name,age_band) values
('61011000-0000-4000-8000-000000000001','kava_test_host','Test host','adult'),
('61011000-0000-4000-8000-000000000002','kava_test_guest','Test guest','adult'),
('61011000-0000-4000-8000-000000000003','kava_test_outsider','Test outsider','adult');
insert into bulavata.crews(id,name,owner) values(61011001,'Kava test Koro','61011000-0000-4000-8000-000000000001');
insert into bulavata.crew_members(crew_id,member) values
(61011001,'61011000-0000-4000-8000-000000000001'),
(61011001,'61011000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','61011000-0000-4000-8000-000000000001',true);
select set_config('kava.test_circle',public.bv_circle_create(61011001,'Wisdom around the bowl','Test topic',4)::text,true);
do $$ begin
  if (select count(*) from public.bv_circle_people where circle_id=current_setting('kava.test_circle')::uuid and seat=1)<>1 then raise exception 'Host seat was not created atomically'; end if;
end $$;
select set_config('request.jwt.claim.sub','61011000-0000-4000-8000-000000000002',true);
insert into public.bv_circle_people(circle_id,member) values(current_setting('kava.test_circle')::uuid,auth.uid());
do $$ begin
  begin
    update public.bv_circle_people set seat=2 where circle_id=current_setting('kava.test_circle')::uuid and member=auth.uid();
    raise exception 'FAIL: audience self-promotion succeeded';
  exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
  begin
    insert into public.bv_circle_comments(circle_id,author,body) values(current_setting('kava.test_circle')::uuid,auth.uid(),'Before open');
    raise exception 'FAIL: comment before opening succeeded';
  exception when raise_exception or insufficient_privilege then if sqlerrm like 'FAIL:%' then raise; end if; end;
end $$;
update public.bv_circle_people set requested=true where circle_id=current_setting('kava.test_circle')::uuid and member=auth.uid();
select set_config('request.jwt.claim.sub','61011000-0000-4000-8000-000000000001',true);
update public.bv_circles set status='open' where id=current_setting('kava.test_circle')::uuid;
update public.bv_circle_people set seat=2 where circle_id=current_setting('kava.test_circle')::uuid and member='61011000-0000-4000-8000-000000000002';
do $$ begin
  begin
    update public.bv_circle_people set seat=5 where circle_id=current_setting('kava.test_circle')::uuid and member='61011000-0000-4000-8000-000000000002';
    raise exception 'FAIL: over-capacity seat succeeded';
  exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
  begin
    update public.bv_circle_people set seat=1 where circle_id=current_setting('kava.test_circle')::uuid and member='61011000-0000-4000-8000-000000000002';
    raise exception 'FAIL: host seat replacement succeeded';
  exception when raise_exception or unique_violation then if sqlerrm like 'FAIL:%' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','61011000-0000-4000-8000-000000000002',true);
insert into public.bv_circle_comments(circle_id,author,body) values(current_setting('kava.test_circle')::uuid,auth.uid(),'A thoughtful question');
do $$ begin
  if not exists(select 1 from public.bv_circle_people where circle_id=current_setting('kava.test_circle')::uuid and member=auth.uid() and seat=2 and not requested) then raise exception 'Host approval failed'; end if;
  begin
    insert into public.bv_circle_comments(circle_id,author,body,created_at) values(current_setting('kava.test_circle')::uuid,auth.uid(),'Rate limit attempt',now()-interval '1 day');
    raise exception 'FAIL: comment throttle bypass succeeded';
  exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
  begin
    insert into public.bv_circle_comments(circle_id,author,body) values(current_setting('kava.test_circle')::uuid,'61011000-0000-4000-8000-000000000001','Spoof host');
    raise exception 'FAIL: impersonation succeeded';
  exception when raise_exception or insufficient_privilege then if sqlerrm like 'FAIL:%' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','61011000-0000-4000-8000-000000000003',true);
do $$ begin
  if (select count(*) from public.bv_circles)<>0 then raise exception 'Outsider can see private circles'; end if;
  if (select count(*) from public.bv_circle_comments)<>0 then raise exception 'Outsider can see comments'; end if;
  begin
    insert into public.bv_circle_people(circle_id,member) values(current_setting('kava.test_circle')::uuid,auth.uid());
    raise exception 'FAIL: outsider joined';
  exception when raise_exception or insufficient_privilege then if sqlerrm like 'FAIL:%' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','61011000-0000-4000-8000-000000000001',true);
update public.bv_circle_people set comments_paused=true,seat=null where circle_id=current_setting('kava.test_circle')::uuid and member='61011000-0000-4000-8000-000000000002';
select set_config('request.jwt.claim.sub','61011000-0000-4000-8000-000000000002',true);
do $$ begin
  begin
    update public.bv_circle_people set comments_paused=false where circle_id=current_setting('kava.test_circle')::uuid and member=auth.uid();
    raise exception 'FAIL: self-unpause succeeded';
  exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','61011000-0000-4000-8000-000000000001',true);
update public.bv_circles set status='ended' where id=current_setting('kava.test_circle')::uuid;
do $$ begin
  begin
    update public.bv_circles set status='open' where id=current_setting('kava.test_circle')::uuid;
    raise exception 'FAIL: ended circle reopened';
  exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
  begin
    insert into public.bv_circle_comments(circle_id,author,body) values(current_setting('kava.test_circle')::uuid,auth.uid(),'After end');
    raise exception 'FAIL: comment after closing succeeded';
  exception when raise_exception or insufficient_privilege then if sqlerrm like 'FAIL:%' then raise; end if; end;
end $$;
reset role;
select 'PASS: atomic host creation, audience requests, host approval, seat cap, host seat, private membership, moderation, rate limiting, impersonation guards and ended-circle checks' as result;
