# Native calls backend

Sota's Sydney Koro membership remains authoritative. This additive migration adds
call state, a six-person ceiling, lobby/host actions, recording notices, spatial
positions, callbacks and expiring recipient-only SDP/ICE signaling. Media remains
browser-to-browser; signaling authorization is not an SFU that can forcibly stop
an already established connection between modified clients.

The public `bv_call_*` / `bv_callback_*` functions are invoker wrappers around one
private definer state machine. It derives the actor from `auth.uid()`, checks
current Koro membership on every call, serializes each actor across devices, and
enforces room and device ownership. Private tables have RLS and no direct client
grants. No service key is placed in the browser.

API contract:

- `bv_call_start(p_crew bigint,p_mode text,p_lobby boolean,p_capacity integer,p_device uuid)`
- `bv_call_list(p_crew bigint default null)` returns up to 40 flat summaries.
- `bv_call_snapshot(p_call uuid)` returns `{call,participants}`.
- `bv_call_act(p_call,p_action,p_device,p_target default null)` supports `accept`,
  `join`, `decline`, `busy`, `heartbeat`, `leave`, `end`, `kick`, `admit`, `reject`,
  `record_start`, and `record_stop`.
- `bv_call_signal(p_call,p_to,p_kind,p_payload,p_device)` returns a signal ID.
  Kinds are `offer`, `answer`, and `ice`; SDP payload is `{type,sdp}`.
- `bv_call_signals(p_call,p_after,p_device)` returns up to 200 recipient signals.
- `bv_call_position(p_call,p_device,p_x real,p_y real)` accepts coordinates 0–1.
- `bv_callback_request(p_crew,p_note default '')`, `bv_callback_list(p_crew)`,
  `bv_callback_act(p_request,p_action)` (`claim`, `complete`, `cancel`).
- `bv_call_availability(p_crew,p_available boolean default null)` reads availability;
  only the Koro owner may write it. Callback notes are owner/requester-only.

Clients heartbeat at least every 15 seconds, including while waiting. A joined or
waiting device lease expires after 60 seconds. Unanswered invitations become
missed after 45 seconds. Signals expire after two minutes; normal reads also filter
expiry. Opportunistic cleanup runs on call operations: active cleanup is scoped to
the caller's Koros; ended metadata older than 30 days is pruned in bounded batches.
No scheduled task was provisioned, so unused databases may retain expired metadata
until the next operation. Calls are capped at four hours.

`GET /api/call-config?call=UUID` requires the current Sota bearer token. The endpoint
validates the user and caller-scoped joined membership before returning media
configuration. Missing relay configuration explicitly returns `relayConfigured:false`
with STUN only. STUN does not make restrictive-network calls reliable.

Optional server-only coturn REST environment variables:

- `CALLS_TURN_URLS`: comma-separated `turn:` / `turns:` URLs.
- `CALLS_TURN_SECRET`: at least 32 bytes; match coturn `static-auth-secret`.
- `CALLS_TURN_TTL_SECONDS`: default 900, bounded to 60–3600.

Credentials use `expiry:call:user` and coturn's HMAC-SHA1 REST format. They expire
independently of the call. No relay server or paid service was provisioned by this
change. The room API must be rechecked before refreshing credentials.

Checks:

```sh
node --test tests/call-config.test.cjs
npm install --prefix /tmp/dimau-call-db-check --ignore-scripts --no-audit --no-fund @electric-sql/pglite@0.5.11
PGLITE_MODULE=/tmp/dimau-call-db-check/node_modules/@electric-sql/pglite/dist/index.js node tests/run-native-calls-db.mjs
```

The PGlite runner constructs only the minimum existing schema fixture and executes
the actual migration plus `tests/native-calls-db.sql`. The same SQL test runs in a
transaction on the actual database and rolls every fixture back. Neither check
proves a real two-user browser call, NAT traversal or mobile background delivery.
