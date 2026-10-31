\set ON_ERROR_STOP 1
\pset format unaligned
set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
insert into public.bv_moments(author,body,audience) values ('11111111-1111-1111-1111-111111111111','hello friends','friends');
insert into public.bv_moments(author,body,audience) values ('11111111-1111-1111-1111-111111111111','close only','close');
select 'ana feed count='||jsonb_array_length(public.bv_moments_feed2(60));
select 'poll='||public.bv_poll_create(1,'Lovo or curry?',array['Lovo','Curry'],24);
select 'story='||public.bv_story_post('on the beach',null,'story','friends');
select 'note='||public.bv_story_post('busy today',null,'note','friends');
select 'event='||public.bv_event_create('Kava night',now()+interval '2 days',null,'Colerne',null,'friends',null);
select 'edit='||(public.bv_moment_edit(1,'hello friends (fixed)',null)->>'edit_count');
-- Bo (friend, not close)
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
select 'bo feed count (expect 1)='||jsonb_array_length(public.bv_moments_feed2(60));
select 'bo react='||(public.bv_react('moment',1,'fire')->>'mine');
select 'bo comment='||(public.bv_comment('moment',1,'vinaka!')->>'id');
select 'bo bookmark='||public.bv_bookmark_toggle('moment',1,'');
select 'bo vote='||(public.bv_poll_vote(1,0)->>'total');
select 'bo repost='||public.bv_moment_repost(1,null);
select 'bo stories people='||jsonb_array_length(public.bv_stories());
select public.bv_story_seen(1);
select 'bo rsvp'; select public.bv_event_rsvp(1,'going');
select 'bo events='||jsonb_array_length(public.bv_events(false))||' going='||(public.bv_events(false)->0->>'going');
select 'bo sees close moment? '||(public.bv_moments_feed2(60) @> '[{"id":2}]');
-- Ana makes Bo a close friend
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
select public.bv_close_friend_set('22222222-2222-2222-2222-222222222222',true);
select 'ana memories='||jsonb_array_length(public.bv_memories());
select 'ana history='||jsonb_array_length(public.bv_moment_history(1));
select 'ana room highlights='||jsonb_array_length(public.bv_room('ana')->'highlights');
select 'ana room is_close='||(public.bv_room('bo')->>'is_close');
select 'story views for ana='||(public.bv_stories()->0->'items'->0->>'views');
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
select 'bo now sees close moment? '||(public.bv_moments_feed2(60) @> '[{"id":2}]');
select 'bo feed count (expect 3 incl repost)='||jsonb_array_length(public.bv_moments_feed2(60));
select 'comments='||jsonb_array_length(public.bv_comments('moment',1));
select 'bookmarks='||jsonb_array_length(public.bv_bookmarks());
-- Cy (stranger)
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false);
select 'cy feed (expect 0)='||jsonb_array_length(public.bv_moments_feed2(60));
select 'cy stories (expect 0)='||jsonb_array_length(public.bv_stories());
select 'cy events (expect 0)='||jsonb_array_length(public.bv_events(false));
select 'cy comments on 1 (expect 0)='||jsonb_array_length(public.bv_comments('moment',1));
do $$ begin perform public.bv_react('moment',1,'fire'); raise exception 'LEAK'; exception when others then if sqlerrm='LEAK' then raise; end if; raise notice 'cy react blocked: %', sqlerrm; end $$;
do $$ begin perform public.bv_comment('moment',1,'hi'); raise exception 'LEAK'; exception when others then if sqlerrm='LEAK' then raise; end if; raise notice 'cy comment blocked: %', sqlerrm; end $$;
do $$ begin perform public.bv_moment_edit(1,'x',null); raise exception 'LEAK'; exception when others then if sqlerrm='LEAK' then raise; end if; raise notice 'cy edit blocked: %', sqlerrm; end $$;
-- anon
reset role; set role anon; select set_config('request.jwt.claim.sub','',false);
do $$ begin perform public.bv_moments_feed2(60); raise exception 'LEAK'; exception when others then if sqlerrm='LEAK' then raise; end if; raise notice 'anon feed blocked: %', sqlerrm; end $$;
