\set ON_ERROR_STOP 1
\pset format unaligned
-- Ana (1) and Bo (2) are friends; Cy (3) is a stranger. Fixture + social-plus already loaded.
set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
insert into public.bv_moments(author,body,audience) values ('11111111-1111-1111-1111-111111111111','hello friends','friends');
select 'ana unread at start='||public.bv_activity_unread();
-- Bo reacts, replies, mentions Ana, and RSVPs
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
select 'bo react='||(public.bv_react('moment',1,'fire')->'counts'->>'fire');
select 'bo react again='||(public.bv_react('moment',1,'wow')->'counts'->>'wow');
select 'bo comment='||(public.bv_comment('moment',1,'nice one @ana @cy @nobody')->>'id');
-- Ana's own reaction to her own moment must not notify her
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
select 'ana self react='||(public.bv_react('moment',1,'bula')->'counts'->>'bula');
select 'ana unread='||public.bv_activity_unread();
select 'ana kinds='||(select string_agg(x->>'kind', ',' order by (x->>'id')::bigint) from jsonb_array_elements(public.bv_activity(40)) x);
select 'ana reaction snippet='||(select x->>'snippet' from jsonb_array_elements(public.bv_activity(40)) x where x->>'kind'='reaction');
select 'ana actor handle='||(select string_agg(distinct x->>'handle', ',') from jsonb_array_elements(public.bv_activity(40)) x);
-- Ana replies to Bo's comment: Bo (parent author) is told once, Ana (owner) is not told about herself
select 'ana reply='||(public.bv_comment('moment',1,'vinaka!',1)->>'id');
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
select 'bo unread='||public.bv_activity_unread();
select 'bo kinds='||(select string_agg(x->>'kind', ',') from jsonb_array_elements(public.bv_activity(40)) x);
select 'bo marks read='||public.bv_activity_read(null);
select 'bo unread after='||public.bv_activity_unread();
-- Cy is a stranger: the mention did not reach Cy, and Cy cannot read Ana's inbox
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false);
select 'cy unread='||public.bv_activity_unread();
select 'cy sees='||jsonb_array_length(public.bv_activity(40));
-- Cy sends Ana a friend request; Ana accepts; both sides are told, the request row is marked read
set role postgres; insert into bulavata.friendships(requester,addressee,status) values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','pending');
set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
select 'ana request kind='||(select x->>'kind' from jsonb_array_elements(public.bv_activity(1)) x);
set role postgres; update bulavata.friendships set status='accepted' where requester='33333333-3333-3333-3333-333333333333';
set role authenticated; select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false);
select 'cy accepted kind='||(select x->>'kind' from jsonb_array_elements(public.bv_activity(1)) x);
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
select 'ana request now read='||(select x->>'read' from jsonb_array_elements(public.bv_activity(40)) x where x->>'kind'='friend_request');
-- Event RSVP tells the host
select 'event='||public.bv_event_create('Kava night',now()+interval '2 days',null,'Colerne',null,'friends',null);
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
select 'bo rsvp='||(public.bv_event_rsvp(1,'going') is not null);
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
select 'ana rsvp snippet='||(select x->>'snippet' from jsonb_array_elements(public.bv_activity(40)) x where x->>'kind'='rsvp');
-- anonymous gets nothing
set role anon; select set_config('request.jwt.claim.sub','',false);
select 'anon activity='||coalesce((select public.bv_activity(40)::text),'denied');
