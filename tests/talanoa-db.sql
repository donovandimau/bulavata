-- Synthetic local fixture only; run with node tests/run-talanoa-db.cjs.
-- Every assertion runs under real anon/authenticated roles where applicable.
BEGIN;
CREATE FUNCTION pg_temp.ok(p_value boolean,p_label text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
 IF p_value IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL %',p_label; END IF;
 RETURN 'PASS '||p_label;
END; $$;
CREATE FUNCTION pg_temp.fails(p_sql text,p_code text,p_label text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
 BEGIN
  EXECUTE p_sql;
 EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE<>p_code THEN RAISE EXCEPTION 'FAIL %: expected %, got % (%)',p_label,p_code,SQLSTATE,SQLERRM; END IF;
  RETURN 'PASS '||p_label;
 END;
 RAISE EXCEPTION 'FAIL %: expected error %',p_label,p_code;
END; $$;

SELECT pg_temp.ok((SELECT count(*)=3 AND bool_and(c.relrowsecurity) FROM pg_class c
 JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='bulavata' AND c.relkind='r' AND c.relname LIKE 'talanoa_%'),'new consent tables all use RLS');
SELECT pg_temp.ok(NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='bulavata' AND c.relkind='r' AND c.relname LIKE 'talanoa_%' AND
 (has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE'))),
 'no direct anon or authenticated consent table privileges');
SELECT pg_temp.ok(NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE ((n.nspname='bulavata_talanoa_private' AND p.proname LIKE 'talanoa_%') OR (n.nspname='public' AND p.proname IN
 ('bv_circle_groups','bv_circle_create_group','bv_circle_update_group','bv_circle_graph_choice','bv_my_graph_visibility',
 'bv_set_graph_visibility','bv_circle_invitation','bv_join_circle','bv_circle_graph','bv_public_circle_graph','bv_public_personal_graph')))
 AND (NOT coalesce(p.proconfig @> ARRAY['search_path=""'],false) OR EXISTS
 (SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE'))),
 'all new functions pin empty search_path and revoke PUBLIC execute');
SELECT pg_temp.ok(NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('bv_circle_groups','bv_circle_create_group','bv_circle_update_group',
 'bv_circle_graph_choice','bv_my_graph_visibility','bv_set_graph_visibility','bv_circle_invitation','bv_join_circle',
 'bv_circle_graph','bv_public_circle_graph','bv_public_personal_graph') AND p.prosecdef),'public wrappers are invoker');
SELECT pg_temp.ok(NOT has_function_privilege('anon','bulavata_talanoa_private.talanoa_group_row(bigint)','EXECUTE')
 AND NOT has_function_privilege('authenticated','bulavata_talanoa_private.talanoa_group_row(bigint)','EXECUTE'),'internal member-row helper is not client callable');
SELECT pg_temp.ok(NOT has_schema_privilege('anon','bulavata_talanoa_private','CREATE')
 AND NOT has_schema_privilege('authenticated','bulavata_talanoa_private','CREATE'),'clients cannot replace helper-schema functions');
SELECT pg_temp.ok(NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('bv_circle_groups','bv_circle_create_group','bv_circle_update_group',
 'bv_circle_graph_choice','bv_my_graph_visibility','bv_set_graph_visibility','bv_join_circle')
 AND (has_function_privilege('anon',p.oid,'EXECUTE') OR NOT has_function_privilege('authenticated',p.oid,'EXECUTE'))),
 'only authenticated clients have private or write API executes');
SELECT pg_temp.ok((SELECT count(*)=5 AND bool_and(p.proargnames[p.pronargs]='p_expected_owner'
 AND p.proargtypes[p.pronargs-1]='uuid'::regtype AND p.pronargdefaults>=1)
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN
 ('bv_circle_create_group','bv_circle_update_group','bv_circle_graph_choice','bv_set_graph_visibility','bv_join_circle')),
 'all five write RPCs accept an optional trailing expected-owner UUID');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT pg_temp.fails('SELECT public.bv_circle_groups()','42501','anon cannot list private groups');
SELECT pg_temp.fails('SELECT public.bv_circle_create_group(''TEST FIXTURE denied'',''koro'')','42501','anon cannot create');
SELECT pg_temp.fails('SELECT public.bv_join_circle(''1111111111'')','42501','anon cannot join');
SELECT pg_temp.fails('SELECT public.bv_set_graph_visibility(''public'')','42501','anon cannot opt in a person');
SELECT pg_temp.fails('SELECT public.bv_circle_graph_choice(100,true)','42501','anon cannot opt in a member');
SELECT pg_temp.fails('SELECT public.bv_circle_update_group(100,''kava'',''public'')','42501','anon cannot update group');
SELECT pg_temp.fails('SELECT public.bv_circle_graph(100)','42501','legacy circle graph defaults private');
SELECT pg_temp.fails('SELECT public.bv_public_circle_graph(100)','42501','explicit public graph refuses private legacy group');
SELECT pg_temp.fails('SELECT public.bv_public_personal_graph(''test_owner'')','42501','personal graph defaults private');
SELECT pg_temp.ok((SELECT array_agg(key ORDER BY key)=ARRAY['circle_type','graph_visibility','id','name','skin_id']
 FROM jsonb_object_keys(public.bv_circle_invitation('1111111111')) key),'anonymous invite exposes exactly approved keys');
SELECT pg_temp.ok(public.bv_circle_invitation('1111111111')->>'graph_visibility'='private'
 AND public.bv_circle_invitation('1111111111')->>'skin_id'='village','legacy invite uses private koro defaults');
SELECT pg_temp.fails('SELECT public.bv_circle_invitation(''1111'')','P0002','invite rejects partial code');
SELECT pg_temp.fails('SELECT public.bv_circle_invitation(''111111111_'')','P0002','invite rejects wildcard code');
SELECT pg_temp.fails('SELECT public.bv_circle_invitation(''9999999999'')','P0002','invite rejects missing exact code');
SELECT pg_temp.fails('SELECT * FROM bulavata.talanoa_personal_graph_settings','42501','anon raw consent read denied');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT pg_temp.fails('SELECT public.bv_circle_create_group(''TEST FIXTURE denied'',''koro'')','42501','missing auth uid cannot create through granted role');
SELECT pg_temp.fails('SELECT public.bv_my_graph_visibility()','42501','missing auth uid cannot read personal setting');
SELECT pg_temp.fails('SELECT bulavata_talanoa_private.talanoa_join_circle(''1111111111'',false)','42501','private helper independently requires auth uid');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
SELECT pg_temp.ok((SELECT count(*)=1 AND bool_and(id=100 AND members=3 AND circle_type='koro'
 AND skin_id='village' AND graph_visibility='private' AND NOT show_on_graph
 AND last_at='2026-10-25T00:00:00Z'::timestamptz) FROM public.bv_circle_groups()),'member list preserves count/latest and private defaults');
SELECT pg_temp.ok(public.bv_my_graph_visibility()='private','personal visibility absent row is private');
SELECT pg_temp.fails('SELECT public.bv_circle_create_group(''TEST FIXTURE WRONG OWNER'',''koro'',''public'',true,''00000000-0000-4000-8000-000000000002'')','42501','mismatched captured owner cannot create a group');
SELECT pg_temp.fails('SELECT public.bv_circle_update_group(100,''kava'',''public'',''00000000-0000-4000-8000-000000000002'')','42501','mismatched captured owner cannot update a group');
SELECT pg_temp.fails('SELECT public.bv_circle_graph_choice(100,true,''00000000-0000-4000-8000-000000000002'')','42501','mismatched captured owner cannot opt in membership');
SELECT pg_temp.fails('SELECT public.bv_set_graph_visibility(''public'',''00000000-0000-4000-8000-000000000002'')','42501','mismatched captured owner cannot publish personal graph');
SELECT pg_temp.fails('SELECT public.bv_join_circle(''2222222222'',true,''00000000-0000-4000-8000-000000000002'')','42501','mismatched captured owner cannot join a group');
SELECT pg_temp.ok(public.bv_my_graph_visibility()='private' AND
 (SELECT count(*)=1 AND bool_and(id=100 AND graph_visibility='private' AND circle_type='koro' AND NOT show_on_graph)
 FROM public.bv_circle_groups()),'all rejected captured-owner writes leave own settings and membership unchanged');
RESET ROLE;
SELECT pg_temp.ok(NOT EXISTS(SELECT 1 FROM bulavata.crews WHERE name='TEST FIXTURE WRONG OWNER')
 AND NOT EXISTS(SELECT 1 FROM bulavata.talanoa_member_graph_settings WHERE crew_id=100)
 AND NOT EXISTS(SELECT 1 FROM bulavata.crew_members WHERE crew_id=200 AND member='00000000-0000-4000-8000-000000000001'),
 'rejected captured-owner writes leave no created group, consent or joined membership');
SET LOCAL ROLE authenticated;
SELECT pg_temp.ok(jsonb_array_length(public.bv_circle_graph(100)->'nodes')=4
 AND public.bv_circle_graph(100)->>'visibility'='private','member can view full private circle');
SELECT pg_temp.fails('SELECT public.bv_public_circle_graph(100)','42501','private setting blocks owner explicit public view');
SELECT pg_temp.fails('SELECT bulavata_talanoa_private.talanoa_circle_graph(100,NULL)','42501','null helper mode cannot bypass group privacy');
SELECT pg_temp.fails('SELECT public.bv_circle_update_group(200,''kava'',''public'')','42501','owner cannot update another owners group');
SELECT pg_temp.fails('SELECT public.bv_circle_graph_choice(200,true)','42501','nonmember cannot set consent');
SELECT pg_temp.fails('SELECT public.bv_circle_create_group('' '',''koro'')','22023','empty trimmed group name rejected');
SELECT pg_temp.fails('SELECT public.bv_circle_create_group(repeat(''a'',41),''koro'')','22023','overlong group name rejected');
SELECT pg_temp.fails('SELECT public.bv_circle_create_group(''TEST FIXTURE bad type'',''malicious-css'')','22023','unknown type rejected');
SELECT pg_temp.fails('SELECT public.bv_circle_create_group(''TEST FIXTURE bad visibility'',''koro'',''everyone'')','22023','unknown create visibility rejected');
SELECT pg_temp.fails('SELECT public.bv_circle_create_group(''TEST FIXTURE null'',''koro'',''private'',NULL)','22023','null create consent rejected');
SELECT pg_temp.fails('SELECT public.bv_circle_update_group(100,''other'',''everyone'')','22023','unknown update visibility rejected');
SELECT pg_temp.fails('SELECT public.bv_circle_update_group(100,''unknown'',''public'')','22023','unknown update type rejected');
SELECT pg_temp.fails('SELECT public.bv_set_graph_visibility(''everyone'')','22023','unknown personal visibility rejected');
SELECT pg_temp.fails('SELECT public.bv_circle_graph_choice(100,NULL)','22023','null member consent rejected');
SELECT pg_temp.fails('SELECT public.bv_circle_create_group(NULL,''koro'')','22023','null name rejected');
SELECT pg_temp.fails('SELECT public.bv_circle_create_group(''TEST FIXTURE null type'',NULL)','22023','null type rejected');
SELECT pg_temp.fails('SELECT public.bv_circle_create_group(''TEST FIXTURE null visibility'',''koro'',NULL)','22023','null visibility rejected');
SELECT pg_temp.fails('SELECT public.bv_join_circle(''1111111111'',NULL)','22023','null join consent rejected');
SELECT pg_temp.ok((public.bv_circle_create_group('  TEST FIXTURE New  ','kava','private',false,'00000000-0000-4000-8000-000000000001')->>'name')='TEST FIXTURE New','matching expected owner creates and returns trimmed group');
SELECT pg_temp.ok((SELECT circle_type='kava' AND skin_id='grog' AND emoji='🥥' AND accent='#efc187'
 AND graph_visibility='private' AND NOT show_on_graph AND members=1
 FROM public.bv_circle_groups() WHERE name='TEST FIXTURE New'),'create derives palette and own membership with private defaults');
SELECT pg_temp.ok(public.bv_circle_update_group(100,'lotu','public','00000000-0000-4000-8000-000000000001')->>'skin_id'='masi-white','matching expected owner updates shared skin');
SELECT pg_temp.ok((SELECT graph_visibility='public' AND circle_type='lotu' AND NOT show_on_graph
 FROM public.bv_circle_groups() WHERE id=100),'making group public does not opt owner in');
SELECT pg_temp.ok(jsonb_array_length(public.bv_circle_graph(100)->'nodes')=4
 AND public.bv_circle_graph(100)->>'visibility'='private','member graph retains private full-view label for public group');
SELECT pg_temp.ok(jsonb_array_length(public.bv_public_circle_graph(100)->'nodes')=1,'owner public view hides every nonconsenting member');
SELECT pg_temp.ok(public.bv_circle_graph_choice(100,true,'00000000-0000-4000-8000-000000000001'),'matching expected owner opts in own membership');
SELECT pg_temp.ok(jsonb_array_length(public.bv_public_circle_graph(100)->'nodes')=2,'explicit owner consent adds only owner to public graph');
SELECT pg_temp.ok(public.bv_set_graph_visibility('public','00000000-0000-4000-8000-000000000001')='public','matching expected owner publishes own personal graph');
SELECT pg_temp.ok(jsonb_array_length(public.bv_public_personal_graph('test_owner')->'nodes')=1,'private friends remain absent after owner opt-in');
SELECT pg_temp.fails('SELECT * FROM bulavata.talanoa_group_settings','42501','authenticated raw group settings read denied');
SELECT pg_temp.fails('UPDATE bulavata.talanoa_personal_graph_settings SET graph_visibility=''public''','42501','authenticated raw cross-owner write denied');
RESET ROLE;

SELECT pg_temp.ok((SELECT kind='mataqali' AND about='PRESERVE ABOUT' AND join_code='1111111111'
 FROM bulavata.crews WHERE id=100),'type update preserves legacy kind/about/join code');
SELECT pg_temp.ok((SELECT kind='koro' FROM bulavata.crews WHERE name='TEST FIXTURE New'),'new special circle keeps existing kind default');
SELECT pg_temp.ok((SELECT count(*)=1 FROM bulavata.crew_members m JOIN bulavata.crews c ON c.id=m.crew_id
 WHERE c.name='TEST FIXTURE New'),'new group has exactly one owner membership');
SELECT pg_temp.ok(NOT EXISTS(SELECT 1 FROM bulavata.crews WHERE name LIKE 'TEST FIXTURE bad%'
 OR name LIKE 'TEST FIXTURE null%'),'validation failures create no crew side effects');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
SELECT pg_temp.fails('SELECT public.bv_circle_update_group(100,''music'',''private'')','42501','nonowner member cannot update metadata');
SELECT pg_temp.ok(public.bv_circle_graph_choice(100,true),'member can opt in own circle membership');
SELECT pg_temp.ok(public.bv_my_graph_visibility()='private','circle opt-in does not imply personal opt-in');
SELECT pg_temp.ok(public.bv_set_graph_visibility('public')='public','accepted friend can opt into own personal graph');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
SELECT public.bv_set_graph_visibility('public');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
SELECT public.bv_set_graph_visibility('public');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',true);
SELECT pg_temp.ok((SELECT count(*)=1 AND bool_and(id=200) FROM public.bv_circle_groups()),'unrelated owner only lists own membership');
SELECT pg_temp.fails('SELECT public.bv_circle_update_group(100,''music'',''private'')','42501','outsider cannot update group');
SELECT pg_temp.fails('SELECT public.bv_join_circle(''9999999999'')','P0002','join refuses invalid exact code');
SELECT pg_temp.ok(public.bv_join_circle('1111111111',false,'00000000-0000-4000-8000-000000000005')=100,'matching expected owner joins existing group by exact capability');
SELECT pg_temp.ok((SELECT NOT show_on_graph FROM public.bv_circle_groups() WHERE id=100),'joining defaults own circle consent false');
SELECT pg_temp.ok(public.bv_join_circle('1111111111',true)=100,'repeat join can set own explicit consent');
SELECT pg_temp.ok((SELECT members=4 AND show_on_graph FROM public.bv_circle_groups() WHERE id=100),'repeat join has no duplicate membership');
RESET ROLE;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT pg_temp.ok(public.bv_public_circle_graph(100)->>'visibility'='public'
 AND jsonb_array_length(public.bv_public_circle_graph(100)->'nodes')=4,'public circle includes exactly consented members plus group');
SELECT pg_temp.ok(public.bv_circle_graph(100)=public.bv_public_circle_graph(100),'nonmember generic graph is same sanitized public projection');
SELECT pg_temp.ok((SELECT array_agg(n->>'handle' ORDER BY n->>'handle')=ARRAY['test_friend','test_outsider','test_owner']
 FROM jsonb_array_elements(public.bv_public_circle_graph(100)->'nodes') n WHERE n->>'type'='person'),'private member entirely absent from public graph');
SELECT pg_temp.ok((SELECT array_agg(n->>'handle' ORDER BY n->>'handle')=ARRAY['test_friend','test_owner','test_reverse']
 FROM jsonb_array_elements(public.bv_public_personal_graph('test_owner')->'nodes') n),'personal graph requires accepted direct edge and both personal opt-ins in either direction');
SELECT pg_temp.ok((SELECT count(*)=2 AND bool_and(e->>'type'='friend')
 FROM jsonb_array_elements(public.bv_public_personal_graph('test_owner')->'edges') e),'personal graph has only two explicit public friendship edges');
SELECT pg_temp.ok((SELECT n->>'type'='you' FROM jsonb_array_elements(public.bv_public_personal_graph('test_owner')->'nodes') n
 WHERE n->>'handle'='test_owner'),'public personal center uses you type');
SELECT pg_temp.ok((SELECT array_agg(key ORDER BY key)=ARRAY['edges','kind','nodes','title','visibility']
 FROM jsonb_object_keys(public.bv_public_circle_graph(100)) key)
 AND (SELECT array_agg(key ORDER BY key)=ARRAY['edges','kind','nodes','title','visibility']
 FROM jsonb_object_keys(public.bv_public_personal_graph('test_owner')) key),'graph envelopes have only agreed safe keys');
SELECT pg_temp.ok(NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.bv_public_circle_graph(100)->'edges') e,
 jsonb_object_keys(e) key WHERE key NOT IN ('source','target','type'))
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.bv_public_personal_graph('test_owner')->'edges') e,
 jsonb_object_keys(e) key WHERE key NOT IN ('source','target','type')),'public edges expose only safe endpoint keys');
SELECT pg_temp.ok(NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.bv_public_personal_graph('test_owner')->'nodes') n,
 jsonb_object_keys(n) key WHERE key NOT IN ('id','type','label','handle','emoji')),'personal nodes expose only safe projection keys');
SELECT pg_temp.ok(NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.bv_public_circle_graph(100)->'nodes') n,
 jsonb_object_keys(n) key WHERE key NOT IN ('id','type','label','handle','emoji')),'circle nodes expose only safe projection keys');
SELECT pg_temp.ok(public.bv_public_personal_graph('test_owner')::text !~ '00000000-|PRIVATE|birth_year|age_band|last_seen|join_code|members'
 AND public.bv_public_circle_graph(100)::text !~ '00000000-|PRIVATE|birth_year|age_band|last_seen|join_code|members','public projections contain no UUIDs, secrets or hidden counts');
SELECT pg_temp.fails('SELECT public.bv_public_personal_graph(''TEST_OWNER'')','42501','public handle query is exact and validated');
RESET ROLE;

-- Deny-all RLS is an independent backstop even if a future grant is added.
GRANT SELECT ON bulavata.talanoa_personal_graph_settings TO authenticated;
GRANT USAGE ON SCHEMA bulavata TO authenticated;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
SELECT pg_temp.ok((SELECT count(*)=0 FROM bulavata.talanoa_personal_graph_settings),'RLS still hides settings if SELECT is accidentally granted');
RESET ROLE;
REVOKE SELECT ON bulavata.talanoa_personal_graph_settings FROM authenticated;
REVOKE USAGE ON SCHEMA bulavata FROM authenticated;
DELETE FROM bulavata.crew_members WHERE crew_id=100 AND member='00000000-0000-4000-8000-000000000002';
SELECT pg_temp.ok(NOT EXISTS(SELECT 1 FROM bulavata.talanoa_member_graph_settings WHERE crew_id=100
 AND member='00000000-0000-4000-8000-000000000002'),'leaving deletes own circle consent via verified composite FK');
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT pg_temp.ok(NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.bv_public_circle_graph(100)->'nodes') n
 WHERE n->>'handle'='test_friend'),'removed member disappears from public graph');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
SELECT public.bv_join_circle('1111111111');
SELECT pg_temp.ok((SELECT NOT show_on_graph FROM public.bv_circle_groups() WHERE id=100),'rejoining does not restore previous circle consent');
SELECT public.bv_set_graph_visibility('private');
SELECT pg_temp.ok(NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.bv_public_personal_graph('test_owner')->'nodes') n
 WHERE n->>'handle'='test_friend'),'personal opt-out removes accepted friend from public projection immediately');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
SELECT public.bv_circle_update_group(100,'lotu','private');
SELECT pg_temp.fails('SELECT public.bv_public_circle_graph(100)','42501','making group private blocks public view even for owner');
SELECT public.bv_set_graph_visibility('private');
SELECT pg_temp.fails('SELECT public.bv_public_personal_graph(''test_owner'')','42501','owner personal opt-out blocks public view even for owner');
RESET ROLE;

-- Failure injected only in this disposable synthetic database, not production.
CREATE FUNCTION pg_temp.reject_membership() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM bulavata.crews WHERE id=NEW.crew_id AND name='TEST FIXTURE ROLLBACK') THEN
  RAISE EXCEPTION 'fixture failure' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER fixture_reject_membership BEFORE INSERT ON bulavata.crew_members
 FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_membership();
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
SELECT pg_temp.fails('SELECT public.bv_circle_create_group(''TEST FIXTURE ROLLBACK'',''kava'',''public'',true)','23514','failed membership aborts create atomically');
RESET ROLE;
SELECT pg_temp.ok(NOT EXISTS(SELECT 1 FROM bulavata.crews WHERE name='TEST FIXTURE ROLLBACK'),'failed create leaves no crew');
SELECT pg_temp.ok(NOT EXISTS(SELECT 1 FROM bulavata.talanoa_group_settings s LEFT JOIN bulavata.crews c ON c.id=s.crew_id WHERE c.id IS NULL)
 AND NOT EXISTS(SELECT 1 FROM bulavata.talanoa_member_graph_settings s LEFT JOIN bulavata.crew_members m
 ON m.crew_id=s.crew_id AND m.member=s.member WHERE m.member IS NULL),'failed create leaves no orphan metadata or consent');
DELETE FROM bulavata.crew_members WHERE crew_id=100 AND member='00000000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
SELECT pg_temp.fails('SELECT public.bv_circle_update_group(100,''kava'',''public'')','42501','owner who left cannot manage group without membership');
SELECT pg_temp.fails('SELECT public.bv_circle_graph(100)','42501','owner who left cannot read private group graph');
SELECT public.bv_join_circle('1111111111');
RESET ROLE;

-- Large synthetic population: all three circle views and personal view cap safe rows.
INSERT INTO bulavata.profiles(id,handle,display_name)
 SELECT ('10000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'test_large_'||lpad(i::text,3,'0'),'TEST FIXTURE Large '||i FROM generate_series(1,125) i;
INSERT INTO bulavata.crew_members(crew_id,member)
 SELECT 100,id FROM bulavata.profiles WHERE handle LIKE 'test_large_%';
INSERT INTO bulavata.talanoa_member_graph_settings(crew_id,member,show_on_graph)
 SELECT 100,id,true FROM bulavata.profiles WHERE handle LIKE 'test_large_%';
INSERT INTO bulavata.talanoa_personal_graph_settings(member,graph_visibility)
 SELECT id,'public' FROM bulavata.profiles WHERE handle LIKE 'test_large_%';
INSERT INTO bulavata.friendships(requester,addressee,status)
 SELECT '00000000-0000-4000-8000-000000000001',id,'accepted' FROM bulavata.profiles WHERE handle LIKE 'test_large_%';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
SELECT public.bv_circle_update_group(100,'lotu','public');
SELECT public.bv_set_graph_visibility('public');
SELECT pg_temp.ok(jsonb_array_length(public.bv_circle_graph(100)->'nodes')=121
 AND jsonb_array_length(public.bv_circle_graph(100)->'edges')=120,'private circle capped at 120 people plus center');
SELECT pg_temp.ok(jsonb_array_length(public.bv_public_circle_graph(100)->'nodes')=121
 AND jsonb_array_length(public.bv_public_circle_graph(100)->'edges')=120,'explicit owner public view capped after consent filtering');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT pg_temp.ok(jsonb_array_length(public.bv_circle_graph(100)->'nodes')=121,'anonymous public circle capped at 120 people plus center');
SELECT pg_temp.ok(jsonb_array_length(public.bv_public_personal_graph('test_owner')->'nodes')=121
 AND jsonb_array_length(public.bv_public_personal_graph('test_owner')->'edges')=120,'public personal graph capped at 120 accepted public friends plus owner');
SELECT pg_temp.ok((SELECT array_agg(n->>'handle' ORDER BY ord)=array_agg(n->>'handle' ORDER BY n->>'handle')
 FROM jsonb_array_elements(public.bv_public_circle_graph(100)->'nodes') WITH ORDINALITY x(n,ord)
 WHERE n->>'type'='person'),'public circle order is deterministic by handle');
SELECT pg_temp.ok((SELECT array_agg(n->>'handle' ORDER BY ord)=array_agg(n->>'handle' ORDER BY n->>'handle')
 FROM jsonb_array_elements(public.bv_public_personal_graph('test_owner')->'nodes') WITH ORDINALITY x(n,ord)
 WHERE n->>'type'='person'),'public personal order is deterministic by handle');
RESET ROLE;
SELECT pg_temp.ok(true,'suite completed');
ROLLBACK;
