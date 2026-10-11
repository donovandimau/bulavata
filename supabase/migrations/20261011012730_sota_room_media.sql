-- Sota Kece room uploads are private: owner writes, mutual friends read.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('bv-room-media','bv-room-media',false,6291456,array['audio/mpeg','audio/mp4','audio/ogg','audio/wav','image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

create policy "sota_room_media_owner_insert" on storage.objects for insert to authenticated
with check(bucket_id='bv-room-media' and (storage.foldername(name))[1]=(select auth.uid())::text
and (storage.foldername(name))[2] in ('music','covers'));

create policy "sota_room_media_owner_delete" on storage.objects for delete to authenticated
using(bucket_id='bv-room-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

create policy "sota_room_media_friends_read" on storage.objects for select to authenticated
using(bucket_id='bv-room-media' and ((storage.foldername(name))[1]=(select auth.uid())::text
or exists(select 1 from public.bv_friendships friendship where friendship.status='accepted'
and ((friendship.requester=(select auth.uid()) and friendship.addressee::text=(storage.foldername(name))[1])
or (friendship.addressee=(select auth.uid()) and friendship.requester::text=(storage.foldername(name))[1])))));
