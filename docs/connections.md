# People and Koro connections

One SVG connection map per view, with an equivalent keyboard/touch list and neighbour inspector. No new runtime package. SVG belongs to the Connections module; the existing app owns authentication, routing and room/Koro actions. Deterministic schematic radial placement encodes graph topology, not geographical distance or friendship strength. People are circles, Koro are diamonds; friendship edges are solid and membership edges dashed.

The viewer loads `bv_my_friends` and `bv_my_crews` with the existing signed-in Supabase client. The extra membership read selects only `crew_id,member` and constrains BOTH ends to returned accepted friends and the viewer's Koro. No profile enumeration or social graph traversal. Server policies remain unchanged. RPC errors fail closed; membership errors produce a labelled direct-connections view. A Koro co-membership never implies friendship. Signed-out example uses built-in fictional records and makes no social queries. Production member data has not been copied into fixtures.

The map is a refreshable snapshot, not a realtime subscription. It is cleared when leaving the view; async request ownership prevents late results repainting another route/account. Filters, search and camera are temporary. No graph in localStorage, URL, service worker cache or exports. The public `#connections=example` address selects only the fictional example when signed out. Account records require a real session. Existing room/Koro buttons retain their app routes. No join codes, messages, age bands, contact details or pending requests enter graph objects.

Bounded at 120 accepted friends and 40 Koro with explicit truncation notice. Membership pages are read up to5,000, scoped to those nodes; partial failures clear membership edges. Dense graphs hide most SVG labels and retain the complete visible-node list. Mobile stacks controls, map, list and inspector. Touch targets44px; zoom/reset buttons avoid reliance on gestures. No animation and no external fonts/scripts added.

Validation: pure graph/permission-boundary/API-contract tests in `tests/connections.test.cjs`, DOM interaction tests with a test-only jsdom runtime, saved social regression suite and actual desktop/mobile browser preview. Live signed-in RLS results need a real account session; no test claims database ACL verification from frontend fixtures. No database changes required.


## Public example release —21October2026

Owner requested publication as an example. All visible graph entry points now open the fictional10-person/group-node,18-edge example. Live account-backed view remains in source but is not routed or exported as a public view. No graph member queries occur in example mode. Public #connections=example is checked before authentication/offline lookup so existing sessions can open it too. Back clears the example hash and boots the existing normal app. Navigation explicitly says Connections example,all claims to sign in for your own map removed,and footer describes fictional edges. No actual account validation is claimed;that remains a separate future step. Existing app friendships/Koro/account functions remain unchanged.
