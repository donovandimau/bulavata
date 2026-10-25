/* Preview-only stand-in for the database. Gives communications.js sample
 * groups, people and messages so the layout can be checked without an account.
 * Nothing is sent anywhere; messages you type stay in this page. */
(function () {
  'use strict';
  const ME = '11111111-1111-4111-8111-111111111111';
  const P = { mere: '22222222-2222-4222-8222-222222222222', josefa: '33333333-3333-4333-8333-333333333333', ana: '44444444-4444-4444-8444-444444444444' };
  const people = [{ id: ME, display_name: 'Donovan', handle: 'donovan' }, { id: P.mere, display_name: 'Mere', handle: 'mere' }, { id: P.josefa, display_name: 'Josefa', handle: 'josefa' }, { id: P.ana, display_name: 'Ana', handle: 'ana' }];
  const groups = [
    { id: 'aaaaaaaa-0000-4000-8000-000000000001', name: 'Family', emoji: '🌺', members: 6 },
    { id: 'aaaaaaaa-0000-4000-8000-000000000002', name: 'Fiji Day planning', emoji: '🇫🇯', members: 12 },
    { id: 'aaaaaaaa-0000-4000-8000-000000000003', name: 'Rugby lads', emoji: '🏉', members: 9 },
    { id: 'aaaaaaaa-0000-4000-8000-000000000004', name: 'Church choir', emoji: '🎶', members: 21 }
  ];
  const day = (d, h, m) => new Date(2026, 9, d, h, m).toISOString();
  let n = 100;
  const rows = [
    [P.mere, 'Bula everyone! Are we still on for lovo on Saturday?', day(24, 18, 2)],
    [P.josefa, 'Yes, I can bring the taro and cassava 👍', day(24, 18, 5)],
    [P.josefa, 'Who is getting the fish?', day(24, 18, 5)],
    [ME, 'I will pick up the fish from the market in the morning.', day(24, 18, 9)],
    [P.ana, 'Vinaka! I will bring dessert 🍰', day(25, 9, 14)],
    [P.mere, 'Can we start at 1pm so the kids can play first?', day(25, 9, 20)],
    [ME, '1pm works. I will set up a quick video call tonight to sort the rest.', day(25, 9, 31)],
    [ME, 'Bring your rain jackets just in case ☔', day(25, 9, 31)]
  ].map(([author, body, created_at]) => ({ id: String(n++), crew_id: groups[0].id, author, body, created_at }));

  function result(table, state) {
    if (table === 'bv_profiles') {
      if (state.single) return people.find(p => p.id === state.eq.id) || null;
      return people;
    }
    if (table === 'bv_crew_messages') {
      if (state.insert) { const r = { id: String(n++), crew_id: state.insert.crew_id, author: state.insert.author, body: state.insert.body, created_at: new Date().toISOString() }; rows.push(r); return r; }
      return rows.filter(r => !state.eq.crew_id || r.crew_id === state.eq.crew_id);
    }
    return state.single ? null : [];
  }
  function query(table) {
    const state = { eq: {}, single: false, insert: null };
    const b = {
      select() { return b; }, order() { return b; }, in() { return b; }, gt() { return b; }, gte() { return b; }, lt() { return b; }, range() { return b; }, limit() { return b; }, neq() { return b; }, is() { return b; },
      eq(k, v) { state.eq[k] = v; return b; },
      insert(v) { state.insert = v; return b; }, update() { return b; }, delete() { return b; },
      maybeSingle() { state.single = true; return b; }, single() { state.single = true; return b; },
      then(ok, bad) { return Promise.resolve({ data: result(table, state), error: null }).then(ok, bad); }
    };
    return b;
  }
  const client = {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: ME }, access_token: 'preview-only' } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: async () => ({ error: null })
    },
    from: query,
    rpc: async name => ({ data: name === 'bv_my_crews' ? groups : [], error: null }),
    channel: () => ({ on() { return this; }, subscribe() { return this; }, unsubscribe() {}, send: async () => ({}) }),
    removeChannel() {}
  };
  window.supabase = { createClient: () => client };
})();
