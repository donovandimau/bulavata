-- Additive Talanoa metadata and graph consent. Existing crew, friendship, RLS,
-- functions and grants are deliberately left in place. No legacy member opts in.
BEGIN;

-- A new helper namespace avoids adding USAGE to any existing data schema.
CREATE SCHEMA bulavata_talanoa_private;
REVOKE ALL ON SCHEMA bulavata_talanoa_private FROM PUBLIC,anon,authenticated;

CREATE TABLE bulavata.talanoa_group_settings (
  crew_id bigint PRIMARY KEY REFERENCES bulavata.crews(id) ON DELETE CASCADE,
  circle_type text NOT NULL DEFAULT 'koro' CHECK (circle_type IN
    ('kava','tale','kakase','lotu','koro','mataqali','school','old-boys','old-girls','family','music','other')),
  graph_visibility text NOT NULL DEFAULT 'private' CHECK (graph_visibility IN ('private','public'))
);
CREATE TABLE bulavata.talanoa_member_graph_settings (
  crew_id bigint NOT NULL,
  member uuid NOT NULL,
  show_on_graph boolean NOT NULL DEFAULT false,
  PRIMARY KEY (crew_id,member),
  FOREIGN KEY (crew_id,member) REFERENCES bulavata.crew_members(crew_id,member) ON DELETE CASCADE
);
CREATE TABLE bulavata.talanoa_personal_graph_settings (
  member uuid PRIMARY KEY REFERENCES bulavata.profiles(id) ON DELETE CASCADE,
  graph_visibility text NOT NULL DEFAULT 'private' CHECK (graph_visibility IN ('private','public'))
);
ALTER TABLE bulavata.talanoa_group_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulavata.talanoa_member_graph_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulavata.talanoa_personal_graph_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE bulavata.talanoa_group_settings,bulavata.talanoa_member_graph_settings,
  bulavata.talanoa_personal_graph_settings FROM PUBLIC,anon,authenticated;

-- This is the same fixed catalogue as circle-types.js, never client CSS.
CREATE FUNCTION bulavata_talanoa_private.talanoa_type(p_type text)
RETURNS TABLE (circle_type text,skin_id text,emoji text,accent text)
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT * FROM (VALUES
    ('kava','grog','🥥','#efc187'),
    ('tale','studio-ocean','🤝','#6de6dd'),
    ('kakase','kula','💬','#b52b50'),
    ('lotu','masi-white','🙏','#756035'),
    ('koro','village','🪸','#246347'),
    ('mataqali','core-masi','🌿','#7a412c'),
    ('school','varsity','🎓','#8f2d40'),
    ('old-boys','occasion-school-reunion','🎓','#875016'),
    ('old-girls','occasion-school-reunion','🎓','#875016'),
    ('family','occasion-family-reunion','🏡','#246347'),
    ('music','sigidrigi','🎶','#c4b7fc'),
    ('other','lagoon','💬','#086779')
  ) AS t(circle_type,skin_id,emoji,accent) WHERE t.circle_type=p_type;
$$;

CREATE FUNCTION bulavata_talanoa_private.talanoa_groups()
RETURNS TABLE (id bigint,name text,emoji text,accent text,join_code text,members bigint,
  last_at timestamptz,owner uuid,circle_type text,skin_id text,graph_visibility text,show_on_graph boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
  RETURN QUERY
    SELECT c.id,c.name,c.emoji,c.accent,c.join_code,
      (SELECT count(*) FROM bulavata.crew_members m2 WHERE m2.crew_id=c.id),
      (SELECT x.created_at FROM bulavata.crew_messages x WHERE x.crew_id=c.id ORDER BY x.created_at DESC LIMIT 1),
      c.owner,t.circle_type,t.skin_id,coalesce(s.graph_visibility,'private'),coalesce(ms.show_on_graph,false)
    FROM bulavata.crews c
    JOIN bulavata.crew_members m ON m.crew_id=c.id AND m.member=v_uid
    LEFT JOIN bulavata.talanoa_group_settings s ON s.crew_id=c.id
    CROSS JOIN LATERAL bulavata_talanoa_private.talanoa_type(coalesce(s.circle_type,'koro')) t
    LEFT JOIN bulavata.talanoa_member_graph_settings ms ON ms.crew_id=c.id AND ms.member=v_uid
    ORDER BY 7 DESC NULLS LAST,c.id;
END;
$$;

-- Only called inside the guarded write helpers; includes private member fields.
CREATE FUNCTION bulavata_talanoa_private.talanoa_group_row(p_crew bigint)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT to_jsonb(g) FROM bulavata_talanoa_private.talanoa_groups() g WHERE g.id=p_crew;
$$;

CREATE FUNCTION bulavata_talanoa_private.talanoa_create_group(p_name text,p_type text,p_graph_visibility text,p_show_on_graph boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := (SELECT auth.uid()); v_id bigint; v_type record; v_name text := btrim(p_name);
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
  IF v_name IS NULL OR char_length(v_name) NOT BETWEEN 1 AND 40 THEN
    RAISE EXCEPTION 'Use a circle name of 1 to 40 characters' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_type FROM bulavata_talanoa_private.talanoa_type(p_type);
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown circle type' USING ERRCODE='22023'; END IF;
  IF p_graph_visibility IS NULL OR p_graph_visibility NOT IN ('private','public') OR p_show_on_graph IS NULL THEN
    RAISE EXCEPTION 'Invalid graph choice' USING ERRCODE='22023';
  END IF;
  -- Use the physical table's existing kind and join_code defaults.
  INSERT INTO bulavata.crews(name,emoji,accent,owner)
    VALUES (v_name,v_type.emoji,v_type.accent,v_uid) RETURNING id INTO v_id;
  INSERT INTO bulavata.talanoa_group_settings(crew_id,circle_type,graph_visibility)
    VALUES (v_id,p_type,p_graph_visibility);
  INSERT INTO bulavata.crew_members(crew_id,member) VALUES (v_id,v_uid);
  INSERT INTO bulavata.talanoa_member_graph_settings(crew_id,member,show_on_graph)
    VALUES (v_id,v_uid,p_show_on_graph);
  RETURN bulavata_talanoa_private.talanoa_group_row(v_id);
END;
$$;

CREATE FUNCTION bulavata_talanoa_private.talanoa_update_group(p_crew bigint,p_type text,p_graph_visibility text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := (SELECT auth.uid()); v_type record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM bulavata.crews c WHERE c.id=p_crew AND c.owner=v_uid
    AND EXISTS (SELECT 1 FROM bulavata.crew_members m WHERE m.crew_id=c.id AND m.member=v_uid) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Circle owner required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_type FROM bulavata_talanoa_private.talanoa_type(p_type);
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown circle type' USING ERRCODE='22023'; END IF;
  IF p_graph_visibility IS NULL OR p_graph_visibility NOT IN ('private','public') THEN
    RAISE EXCEPTION 'Invalid graph choice' USING ERRCODE='22023';
  END IF;
  INSERT INTO bulavata.talanoa_group_settings(crew_id,circle_type,graph_visibility)
    VALUES (p_crew,p_type,p_graph_visibility)
    ON CONFLICT (crew_id) DO UPDATE SET circle_type=EXCLUDED.circle_type,graph_visibility=EXCLUDED.graph_visibility;
  UPDATE bulavata.crews SET emoji=v_type.emoji,accent=v_type.accent WHERE id=p_crew;
  RETURN bulavata_talanoa_private.talanoa_group_row(p_crew);
END;
$$;

CREATE FUNCTION bulavata_talanoa_private.talanoa_graph_choice(p_crew bigint,p_visible boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM bulavata.crew_members m WHERE m.crew_id=p_crew AND m.member=v_uid) THEN
    RAISE EXCEPTION 'Circle membership required' USING ERRCODE='42501';
  END IF;
  IF p_visible IS NULL THEN RAISE EXCEPTION 'Invalid graph choice' USING ERRCODE='22023'; END IF;
  INSERT INTO bulavata.talanoa_member_graph_settings(crew_id,member,show_on_graph) VALUES (p_crew,v_uid,p_visible)
    ON CONFLICT (crew_id,member) DO UPDATE SET show_on_graph=EXCLUDED.show_on_graph;
  RETURN p_visible;
END;
$$;

CREATE FUNCTION bulavata_talanoa_private.talanoa_my_graph_visibility()
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := (SELECT auth.uid()); v_visibility text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
  SELECT s.graph_visibility INTO v_visibility FROM bulavata.talanoa_personal_graph_settings s WHERE s.member=v_uid;
  RETURN coalesce(v_visibility,'private');
END;
$$;

CREATE FUNCTION bulavata_talanoa_private.talanoa_set_graph_visibility(p_visibility text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
  IF p_visibility IS NULL OR p_visibility NOT IN ('private','public') THEN
    RAISE EXCEPTION 'Invalid graph visibility' USING ERRCODE='22023';
  END IF;
  INSERT INTO bulavata.talanoa_personal_graph_settings(member,graph_visibility) VALUES (v_uid,p_visibility)
    ON CONFLICT (member) DO UPDATE SET graph_visibility=EXCLUDED.graph_visibility;
  RETURN p_visibility;
END;
$$;

CREATE FUNCTION bulavata_talanoa_private.talanoa_invitation(p_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_result jsonb; v_code text := btrim(p_code);
BEGIN
  IF v_code IS NULL OR v_code !~ '^[a-f0-9]{10}$' THEN
    RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='P0002';
  END IF;
  SELECT jsonb_build_object('id',c.id,'name',c.name,'circle_type',t.circle_type,'skin_id',t.skin_id,
    'graph_visibility',coalesce(s.graph_visibility,'private')) INTO v_result
  FROM bulavata.crews c
  LEFT JOIN bulavata.talanoa_group_settings s ON s.crew_id=c.id
  CROSS JOIN LATERAL bulavata_talanoa_private.talanoa_type(coalesce(s.circle_type,'koro')) t
  WHERE c.join_code=v_code;
  IF v_result IS NULL THEN RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='P0002'; END IF;
  RETURN v_result;
END;
$$;

CREATE FUNCTION bulavata_talanoa_private.talanoa_join_circle(p_code text,p_show_on_graph boolean)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := (SELECT auth.uid()); v_id bigint; v_code text := btrim(p_code);
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
  IF p_show_on_graph IS NULL THEN RAISE EXCEPTION 'Invalid graph choice' USING ERRCODE='22023'; END IF;
  IF v_code IS NULL OR v_code !~ '^[a-f0-9]{10}$' THEN
    RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='P0002';
  END IF;
  SELECT c.id INTO v_id FROM bulavata.crews c WHERE c.join_code=v_code FOR KEY SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='P0002'; END IF;
  INSERT INTO bulavata.crew_members(crew_id,member) VALUES (v_id,v_uid) ON CONFLICT (crew_id,member) DO NOTHING;
  INSERT INTO bulavata.talanoa_member_graph_settings(crew_id,member,show_on_graph) VALUES (v_id,v_uid,p_show_on_graph)
    ON CONFLICT (crew_id,member) DO UPDATE SET show_on_graph=EXCLUDED.show_on_graph;
  RETURN v_id;
END;
$$;

CREATE FUNCTION bulavata_talanoa_private.talanoa_circle_graph(p_crew bigint,p_public_only boolean)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := (SELECT auth.uid()); v_group record; v_member boolean; v_full boolean;
  v_nodes jsonb; v_edges jsonb; v_group_id text := 'group:'||p_crew::text;
BEGIN
  SELECT c.name,c.emoji,coalesce(s.graph_visibility,'private') AS visibility INTO v_group
    FROM bulavata.crews c LEFT JOIN bulavata.talanoa_group_settings s ON s.crew_id=c.id WHERE c.id=p_crew;
  IF NOT FOUND THEN RAISE EXCEPTION 'Circle graph unavailable' USING ERRCODE='42501'; END IF;
  v_member := v_uid IS NOT NULL AND EXISTS (SELECT 1 FROM bulavata.crew_members m WHERE m.crew_id=p_crew AND m.member=v_uid);
  v_full := v_member AND p_public_only IS FALSE;
  IF NOT v_full AND v_group.visibility<>'public' THEN
    RAISE EXCEPTION 'Circle graph unavailable' USING ERRCODE='42501';
  END IF;
  WITH people AS (
    SELECT p.handle,coalesce(nullif(p.display_name,''),p.handle) AS label,coalesce(p.avatar_emoji,'🌺') AS emoji,
      CASE WHEN v_full AND p.id=v_uid THEN 'you' ELSE 'person' END AS node_type
    FROM bulavata.crew_members m JOIN bulavata.profiles p ON p.id=m.member
    LEFT JOIN bulavata.talanoa_member_graph_settings s ON s.crew_id=m.crew_id AND s.member=m.member
    WHERE m.crew_id=p_crew AND (v_full OR coalesce(s.show_on_graph,false))
    ORDER BY p.handle,p.id LIMIT 120
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('id','person:'||p.handle,'type',p.node_type,
      'label',p.label,'handle',p.handle,'emoji',p.emoji) ORDER BY p.handle),'[]'::jsonb),
    coalesce(jsonb_agg(jsonb_build_object('source',v_group_id,'target','person:'||p.handle,'type','member') ORDER BY p.handle),'[]'::jsonb)
    INTO v_nodes,v_edges FROM people p;
  RETURN jsonb_build_object('kind','circle','title',v_group.name,'visibility',CASE WHEN v_full THEN 'private' ELSE 'public' END,
    'nodes',jsonb_build_array(jsonb_build_object('id',v_group_id,'type','group','label',v_group.name,'emoji',coalesce(v_group.emoji,'🪸')))||v_nodes,
    'edges',v_edges);
END;
$$;

CREATE FUNCTION bulavata_talanoa_private.talanoa_public_personal_graph(p_handle text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_owner record; v_nodes jsonb; v_edges jsonb; v_center text;
BEGIN
  IF p_handle IS NULL OR p_handle !~ '^[a-z0-9_]{3,20}$' THEN
    RAISE EXCEPTION 'Personal graph unavailable' USING ERRCODE='42501';
  END IF;
  SELECT p.id,p.handle,coalesce(nullif(p.display_name,''),p.handle) AS label,coalesce(p.avatar_emoji,'🌺') AS emoji
    INTO v_owner FROM bulavata.profiles p
    JOIN bulavata.talanoa_personal_graph_settings s ON s.member=p.id AND s.graph_visibility='public'
    WHERE p.handle=p_handle;
  IF NOT FOUND THEN RAISE EXCEPTION 'Personal graph unavailable' USING ERRCODE='42501'; END IF;
  v_center := 'person:'||v_owner.handle;
  WITH friend_ids AS (
    SELECT f.addressee AS member FROM bulavata.friendships f WHERE f.requester=v_owner.id AND f.status='accepted'
    UNION
    SELECT f.requester FROM bulavata.friendships f WHERE f.addressee=v_owner.id AND f.status='accepted'
  ), people AS (
    SELECT p.handle,coalesce(nullif(p.display_name,''),p.handle) AS label,coalesce(p.avatar_emoji,'🌺') AS emoji
    FROM friend_ids f JOIN bulavata.profiles p ON p.id=f.member
    JOIN bulavata.talanoa_personal_graph_settings s ON s.member=p.id AND s.graph_visibility='public'
    WHERE p.id<>v_owner.id ORDER BY p.handle,p.id LIMIT 120
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('id','person:'||p.handle,'type','person','label',p.label,
      'handle',p.handle,'emoji',p.emoji) ORDER BY p.handle),'[]'::jsonb),
    coalesce(jsonb_agg(jsonb_build_object('source',v_center,'target','person:'||p.handle,'type','friend') ORDER BY p.handle),'[]'::jsonb)
    INTO v_nodes,v_edges FROM people p;
  RETURN jsonb_build_object('kind','personal','title',v_owner.label||'''s friends','visibility','public',
    'nodes',jsonb_build_array(jsonb_build_object('id',v_center,'type','you','label',v_owner.label,'handle',v_owner.handle,'emoji',v_owner.emoji))||v_nodes,
    'edges',v_edges);
END;
$$;

-- Public API stays invoker; helpers are independently guarded and are outside
-- the exposed public schema. Explicit EXECUTE is needed through invoker wrappers.
-- Captured UI owners are optional for direct SQL compatibility, but when supplied
-- must match the transaction's authenticated user before any write is attempted.
CREATE FUNCTION bulavata_talanoa_private.talanoa_assert_owner(p_expected_owner uuid)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL OR (p_expected_owner IS NOT NULL AND p_expected_owner<>v_uid) THEN
    RAISE EXCEPTION 'Account changed. Sign in again.' USING ERRCODE='42501';
  END IF;
END;
$$;
CREATE FUNCTION public.bv_circle_groups()
RETURNS TABLE (id bigint,name text,emoji text,accent text,join_code text,members bigint,
  last_at timestamptz,owner uuid,circle_type text,skin_id text,graph_visibility text,show_on_graph boolean)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$ SELECT * FROM bulavata_talanoa_private.talanoa_groups(); $$;
CREATE FUNCTION public.bv_circle_create_group(p_name text,p_type text,p_graph_visibility text DEFAULT 'private',p_show_on_graph boolean DEFAULT false,p_expected_owner uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM bulavata_talanoa_private.talanoa_assert_owner(p_expected_owner);
  RETURN bulavata_talanoa_private.talanoa_create_group(p_name,p_type,p_graph_visibility,p_show_on_graph);
END; $$;
CREATE FUNCTION public.bv_circle_update_group(p_crew bigint,p_type text,p_graph_visibility text,p_expected_owner uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM bulavata_talanoa_private.talanoa_assert_owner(p_expected_owner);
  RETURN bulavata_talanoa_private.talanoa_update_group(p_crew,p_type,p_graph_visibility);
END; $$;
CREATE FUNCTION public.bv_circle_graph_choice(p_crew bigint,p_visible boolean,p_expected_owner uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM bulavata_talanoa_private.talanoa_assert_owner(p_expected_owner);
  RETURN bulavata_talanoa_private.talanoa_graph_choice(p_crew,p_visible);
END; $$;
CREATE FUNCTION public.bv_my_graph_visibility()
RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$ SELECT bulavata_talanoa_private.talanoa_my_graph_visibility(); $$;
CREATE FUNCTION public.bv_set_graph_visibility(p_visibility text,p_expected_owner uuid DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM bulavata_talanoa_private.talanoa_assert_owner(p_expected_owner);
  RETURN bulavata_talanoa_private.talanoa_set_graph_visibility(p_visibility);
END; $$;
CREATE FUNCTION public.bv_circle_invitation(p_code text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$ SELECT bulavata_talanoa_private.talanoa_invitation(p_code); $$;
CREATE FUNCTION public.bv_join_circle(p_code text,p_show_on_graph boolean DEFAULT false,p_expected_owner uuid DEFAULT NULL)
RETURNS bigint LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM bulavata_talanoa_private.talanoa_assert_owner(p_expected_owner);
  RETURN bulavata_talanoa_private.talanoa_join_circle(p_code,p_show_on_graph);
END; $$;
CREATE FUNCTION public.bv_circle_graph(p_crew bigint)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$ SELECT bulavata_talanoa_private.talanoa_circle_graph(p_crew,false); $$;
CREATE FUNCTION public.bv_public_circle_graph(p_crew bigint)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$ SELECT bulavata_talanoa_private.talanoa_circle_graph(p_crew,true); $$;
CREATE FUNCTION public.bv_public_personal_graph(p_handle text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$ SELECT bulavata_talanoa_private.talanoa_public_personal_graph(p_handle); $$;

REVOKE ALL ON FUNCTION bulavata_talanoa_private.talanoa_type(text),bulavata_talanoa_private.talanoa_groups(),bulavata_talanoa_private.talanoa_group_row(bigint),
  bulavata_talanoa_private.talanoa_create_group(text,text,text,boolean),bulavata_talanoa_private.talanoa_update_group(bigint,text,text),
  bulavata_talanoa_private.talanoa_graph_choice(bigint,boolean),bulavata_talanoa_private.talanoa_my_graph_visibility(),bulavata_talanoa_private.talanoa_set_graph_visibility(text),
  bulavata_talanoa_private.talanoa_invitation(text),bulavata_talanoa_private.talanoa_join_circle(text,boolean),bulavata_talanoa_private.talanoa_circle_graph(bigint,boolean),
  bulavata_talanoa_private.talanoa_public_personal_graph(text),bulavata_talanoa_private.talanoa_assert_owner(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bv_circle_groups(),public.bv_circle_create_group(text,text,text,boolean,uuid),
  public.bv_circle_update_group(bigint,text,text,uuid),public.bv_circle_graph_choice(bigint,boolean,uuid),
  public.bv_my_graph_visibility(),public.bv_set_graph_visibility(text,uuid),public.bv_circle_invitation(text),
  public.bv_join_circle(text,boolean,uuid),public.bv_circle_graph(bigint),public.bv_public_circle_graph(bigint),
  public.bv_public_personal_graph(text) FROM PUBLIC,anon,authenticated;

GRANT USAGE ON SCHEMA bulavata_talanoa_private TO anon,authenticated;
GRANT EXECUTE ON FUNCTION bulavata_talanoa_private.talanoa_groups(),bulavata_talanoa_private.talanoa_create_group(text,text,text,boolean),
  bulavata_talanoa_private.talanoa_update_group(bigint,text,text),bulavata_talanoa_private.talanoa_graph_choice(bigint,boolean),
  bulavata_talanoa_private.talanoa_my_graph_visibility(),bulavata_talanoa_private.talanoa_set_graph_visibility(text),bulavata_talanoa_private.talanoa_join_circle(text,boolean),
  bulavata_talanoa_private.talanoa_assert_owner(uuid),
  public.bv_circle_groups(),public.bv_circle_create_group(text,text,text,boolean,uuid),public.bv_circle_update_group(bigint,text,text,uuid),
  public.bv_circle_graph_choice(bigint,boolean,uuid),public.bv_my_graph_visibility(),public.bv_set_graph_visibility(text,uuid),
  public.bv_join_circle(text,boolean,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION bulavata_talanoa_private.talanoa_invitation(text),bulavata_talanoa_private.talanoa_circle_graph(bigint,boolean),
  bulavata_talanoa_private.talanoa_public_personal_graph(text),public.bv_circle_invitation(text),public.bv_circle_graph(bigint),
  public.bv_public_circle_graph(bigint),public.bv_public_personal_graph(text) TO anon,authenticated;
COMMIT;
