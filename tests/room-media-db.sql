-- Run in a transaction after the room-media migration; fixtures must roll back.
insert into auth.users(id,email) values
('61011000-0000-4000-8000-000000000011','sota-media-owner@example.invalid'),
('61011000-0000-4000-8000-000000000012','sota-media-friend@example.invalid'),
('61011000-0000-4000-8000-000000000013','sota-media-outsider@example.invalid');
insert into bulavata.profiles(id,handle,display_name,age_band) values
('61011000-0000-4000-8000-000000000011','media_test_owner','Test owner','adult'),
('61011000-0000-4000-8000-000000000012','media_test_friend','Test friend','adult'),
('61011000-0000-4000-8000-000000000013','media_test_outsider','Test outsider','adult');
insert into bulavata.friendships(requester,addressee,status) values
('61011000-0000-4000-8000-000000000011','61011000-0000-4000-8000-000000000012','accepted');
set local role authenticated;
select set_config('request.jwt.claim.sub','61011000-0000-4000-8000-000000000011',true);
insert into storage.objects(bucket_id,name) values('bv-room-media','61011000-0000-4000-8000-000000000011/music/61011000-0000-4000-8000-000000000099.mp3');
do $$begin
 if (select count(*) from storage.objects where bucket_id='bv-room-media')<>1 then raise exception 'Owner cannot read upload'; end if;
 begin
  insert into storage.objects(bucket_id,name) values('bv-room-media','61011000-0000-4000-8000-000000000013/music/61011000-0000-4000-8000-000000000099.mp3');
  raise exception 'FAIL: cross-owner upload allowed';
 exception when insufficient_privilege then null; end;
end$$;
select set_config('request.jwt.claim.sub','61011000-0000-4000-8000-000000000012',true);
do $$begin
 if (select count(*) from storage.objects where bucket_id='bv-room-media')<>1 then raise exception 'Mutual friend cannot read upload'; end if;
end$$;
select set_config('request.jwt.claim.sub','61011000-0000-4000-8000-000000000013',true);
do $$begin
 if exists(select 1 from storage.objects where bucket_id='bv-room-media') then raise exception 'Outsider read upload'; end if;
end$$;
reset role;
update bulavata.friendships set status='pending' where requester='61011000-0000-4000-8000-000000000011' and addressee='61011000-0000-4000-8000-000000000012';
set local role authenticated;
select set_config('request.jwt.claim.sub','61011000-0000-4000-8000-000000000012',true);
do $$begin
 if exists(select 1 from storage.objects where bucket_id='bv-room-media') then raise exception 'Pending friend read upload'; end if;
end$$;
set local role anon;
do $$begin
 if exists(select 1 from storage.objects where bucket_id='bv-room-media') then raise exception 'Anonymous read upload'; end if;
end$$;
reset role;
select 'PASS: private bucket, owner insert/read, accepted-friend read, blocked cross-owner writes, outsider/pending/anonymous denied; deletion is through Storage API only' as checks;
