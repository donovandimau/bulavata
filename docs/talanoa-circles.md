# Our Talanoa Circle

Group creation and invitation choices include Digital Kava Session, Sota Tale Circle, Kakase Circle, Lotu Circle, Koro Circle, Mataqali Circle, School Circle, Old Boys Circle, Old Girls Circle, Family Circle, Music / Sigidrigi Circle and Other Circle. `circle-types.js` maps these to existing built-in skins. The server repeats the same allowlist and derives the skin, emoji and accent itself. No profile is overwritten and no caller-supplied CSS is accepted as group appearance.

The main group page, written Talanoa sessions and shared Communications workspace inherit the same group identity. An owner can change its type in Invite friends. The invitation always uses saved settings, not an unsaved selection. Existing real invitation codes remain usable if new settings are temporarily unavailable.

## Privacy

Circle graph visibility and personal friends graph visibility are separate settings. Both default to private. A member's appearance on each circle's public graph is a separate opt-in, initially off; it does not publish their personal graph. Leaving a group removes its appearance consent through the existing membership primary key.

A private member graph is available only to current members. The explicit public-circle RPC applies the public/consent filter even when its caller owns the circle. A public personal graph contains the owner and accepted direct friends who have also made their own personal graph public. Pending, unrelated and private people are absent. Projections contain handles, display names, emojis and permitted edges; they exclude UUIDs, join codes, messages, private counts, age fields, last-seen times and call/wallet credentials. Graphs are bounded to 120 people plus their center.

Public routes use the explicit public projections. They never fall back to a private loader. Consent or access errors clear the displayed graph. Polling is nonoverlapping, pauses while hidden/offline and stops on route/account changes. Settings and membership writes verify current identity, bind the request to that captured account, and are checked again by the server.

Canonical links are `https://sotakece.com/#circle-invite=CODE`, `#circle-graph=ID` and `#friends-graph=HANDLE`. Only an invitation link contains a capability code. A visitor must explicitly sign in and join; a link never automatically joins, invites another person or publishes a graph.

## Review and release

The additive migration is `supabase/migrations/20261025222839_talanoa_circle_groups_and_graph_visibility.sql`, generated using Supabase CLI2.122.0. It adds private consent/settings tables and a separate helper schema. Existing tables, policies, grants and functions are preserved. Public wrappers are invoker functions; privileged helpers have fixed empty search paths, explicit identity/ownership/membership checks and narrowly granted execution. Anonymous access exists only for exact-code invitation metadata and consent-filtered public graph projections.

Current Ops policy publishes completed revisions automatically after exact-source and technical checks. Apply the reviewed migration before releasing the corresponding client, then verify deployment source and API permissions. Authenticated creation, join, both privacy transitions and opt-out are exercised against the isolated synthetic database; no real account or membership is created for testing. New settings default private, so existing people are not opted into public graphs. Before migration, new saves stay unavailable rather than reporting fictional success; legacy invitation copying remains available.

## Reproduce the isolated tests

From the repository root, using Node22:

```sh
npm ci --prefix tests/talanoa-tools --ignore-scripts
NODE_PATH="$PWD/tests/talanoa-tools/node_modules" node --test tests/circle-types.test.cjs tests/circle-groups.test.cjs tests/circle-communications.test.cjs
NODE_PATH="$PWD/tests/talanoa-tools/node_modules" node tests/run-talanoa-db.cjs
```

PowerShell can set `$env:NODE_PATH` to the absolute tools/node_modules directory before running the same Node commands. The pinned PGlite runner creates an isolated synthetic PostgreSQL fixture, never a Supabase connection. It exercises real nonsuperuser roles, grants and row security, both opt-in boundaries, leaving/rejoining, validation/atomic rollback, deterministic limits and preservation of old objects. Its local-only invitation default substitutes for production's existing pgcrypto default. DOM fixtures are explicitly synthetic and do not create people or send invitations.
