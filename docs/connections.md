# People and Koro connections

One SVG connection map per view, with an equivalent keyboard/touch list and neighbour inspector. No new runtime package. SVG belongs to the Connections module; the existing app owns authentication, routing and room/Koro actions. Deterministic schematic radial placement encodes graph topology, not geographical distance or friendship strength. People are circles, Koro are diamonds; friendship edges are solid and membership edges dashed.

The viewer loads `bv_my_friends` and `bv_my_crews` with the existing signed-in Supabase client. The extra membership read selects only `crew_id,member` and constrains BOTH ends to returned accepted friends and the viewer's Koro. No profile enumeration or social graph traversal. Server policies remain unchanged. RPC errors fail closed; membership errors produce a labelled direct-connections view. A Koro co-membership never implies friendship. Signed-out example uses built-in fictional records and makes no social queries. Production member data has not been copied into fixtures.

The map is a refreshable snapshot, not a realtime subscription. It is cleared when leaving the view; async request ownership prevents late results repainting another route/account. Filters, search and camera are temporary. No graph in localStorage, URL, service worker cache or exports. The public `#connections=example` address selects only the fictional example when signed out. Account records require a real session. Existing room/Koro buttons retain their app routes. No join codes, messages, age bands, contact details or pending requests enter graph objects.

Bounded at 120 accepted friends and 40 Koro with explicit truncation notice. Membership pages are read up to5,000, scoped to those nodes; partial failures clear membership edges. Dense graphs hide most SVG labels and retain the complete visible-node list. Mobile stacks controls, map, list and inspector. Touch targets44px; zoom/reset buttons avoid reliance on gestures. No animation and no external fonts/scripts added.

Validation: pure graph/permission-boundary/API-contract tests in `tests/connections.test.cjs`, DOM interaction tests with a test-only jsdom runtime, saved social regression suite and actual desktop/mobile browser preview. Live signed-in RLS results need a real account session; no test claims database ACL verification from frontend fixtures. No database changes required.


## Public example release —21October2026

Owner requested publication as an example. All visible graph entry points now open the fictional10-person/group-node,18-edge example. Live account-backed view remains in source but is not routed or exported as a public view. No graph member queries occur in example mode. Public #connections=example is checked before authentication/offline lookup so existing sessions can open it too. Back clears the example hash and boots the existing normal app. Navigation explicitly says Connections example,all claims to sign in for your own map removed,and footer describes fictional edges. No actual account validation is claimed;that remains a separate future step. Existing app friendships/Koro/account functions remain unchanged.

## 23 October2026 review candidate — Dimau Visuals at the bottom

Owner now requests personal connections and explicitly places this feature at the
bottom of Sota Kece. One entry follows Room on the public home page,just before
the footer. The same entry is below the signed-in Pulse content. The old home-nav
example button moves into this section;existing Friends/Koro shortcuts use the
personal map. The section offers See my connections and Explore the example.
An optional static link opens https://dimau-visuals.vercel.app/#explorer with
noopener/noreferrer;no graph,member IDs,token or user fields are sent to that site.
The supplied public Dimau Visuals mark is reused as a local SVG asset.

The existing SotaConnections module owns one schematic SVG,its equivalent list,
filters,selection,neighbour/path details and transient camera. Existing Sota owns
authentication,routing,profile/Koro navigation and the page design. No iframe,
second graph renderer,automatic personal-data fetch on Home,new package,database
or policy is added. Portrait keeps the list/detail fallback;desktop uses the
existing map/sidebar. Motion/3D are unnecessary for this social reading task.

The personal route is #connections=mine,which contains no member data. Guests
open the existing sign-in dialog;boot resumes the personal route only after the
existing session/profile flow. The module validates the current account using
auth.getUser before either social RPC and rejects a mismatched profile/user.
Legacy friend RPC shapes without UUIDs resolve only exact already-returned friend
handles through a bounded id/handle profile read under existing RLS. Unknown rows
are omitted with a partial notice. Memberships remain constrained on both sides.
No friends-of-friends,unaccepted requests,other Koro or stranger discovery.

Leaving the view,logout or account changes clear the graph and invalidate pending
results. Refresh revalidates the viewer and reloads a snapshot. Public example
mode stays fictional and makes zero social/session calls. No personal graph is
stored,exported,included in a URL or cached by the service worker. Existing
membership/edge meanings,limits and partial/error/empty states still apply.

Verification:current anonymous friend/Koro RPCs return200 with zero rows;OpenAPI
inspection is401 and the connected admin tool does not cover Sota's project.
No admin credential or policy bypass is used. Unit and actual-source DOM fixtures
cover owner validation,exact handle scope,privacy,guest sign-in/example,bottom
placement,refresh,logout,account swap and late results. Authenticated live-account
inspection remains a separate check until a member signs in;do not describe
fixtures as production member validation. Hold this revision for review until
the requested placement and account path can be checked and publication approved.
