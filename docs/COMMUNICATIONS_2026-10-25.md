# Shared Koro communications

The owner requested video/audio calls, chat, groups and boards across the portfolio. `/communications.html` is a shared Sota Kece workspace for the existing authenticated Koro groups. It uses the same local Supabase SDK, project and persisted session as Sota Kece; accounts from other Dimau applications are not silently linked.

## What works in source

- Existing invite-only Koro selection, creation and joining through `bv_my_crews`, `bv_crews`, `bv_crew_members` and `bv_join_crew`.
- Persistent chat, topic discussions/replies and a three-column collaborative task board, using the existing `bv_crew_messages` table. Group membership is rechecked at each refresh. There is no browser-local pretend messaging or board storage.
- External Jitsi video/audio meeting invitations. Creating an invitation writes a random room ID to the group. Opening the explicit link navigates to Jitsi in a new tab with `noopener noreferrer`; no iframe, camera or microphone starts in this workspace.
- The existing Koro view escapes safe summaries of structured events, preserving ordinary messages and all original Koro controls. The public shell cache gains only the public event-parser asset and a new version.
- Portfolio launchers may use `?app=<lowercase-slug>&view=chat|groups|boards|calls`. The app value supplies a visible source label and group-name suggestion; it carries no identity, access token, messages or app data. Existing Koro groups remain visible across app contexts.

## Persistence and boundaries

Structured events begin with `#dimau-comms:v1 ` and contain a strict validated JSON shape. They stay within the existing client maximum of 900 characters. Invalid/future-version bodies remain ordinary escaped text. Card IDs and discussion IDs are random UUIDs. A card update appends an event; the latest server timestamp, then message ID, determines its state. Every member may edit/move cards. Earlier events remain in the Koro history. This is collaborative last-update-wins editing, not an atomic conflict-free board database.

The client pages through group history and refreshes incremental messages every six seconds while visible/online. A safety bound refuses incomplete reconstruction above 50,000 loaded messages and points users to the original Koro. Drafts remain on the current page after a failed send. Private rows, messages, join codes and call links are never written to local storage or the service-worker cache. Same-user reconnects and account changes invalidate earlier async operations; membership loss clears visible group content. Existing database authentication and row policies remain authoritative and unchanged.

Jitsi calls do **not** inherit Koro authorization. Anyone holding a meeting link may join. The visible Calls panel discloses the external service, possible host sign-in and need to enable its lobby. No protected room-token service, TURN/SFU infrastructure, native audio/video transport, recording or call encryption guarantee was added. Official Jitsi configuration documents `startAudioOnly` as audio-only startup: https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-configuration/ .

No database schema, grants, authentication setting, existing song/media record, account, paid service or provider credential changed. No invitations or test messages were sent to real users.

## Checks

- `node --test tests/communications-core.test.cjs`: seven checks cover typed event validation and 900-character limits, deterministic history reduction, discussion/reply ordering, strict meeting URL validation, escaped legacy summaries and launcher deep links.
- `node --check communications.js` and `node --check communications-core.js`: pass.
- Lightning CSS parses the complete responsive stylesheet without recovery.
- `verify/communications-dom.cjs`, run with an available development `jsdom` module via `COMMS_JSDOM`, exercises account hydration, existing API-backed sends, escaped malicious-looking text, board draft/save, external Jitsi links, membership-loss clearing and sign-out using a mocked SDK. This verifies client behavior, not live database policy or media connectivity.
- Independent source review checks lifecycle, stale operations, error recovery, safe DOM rendering and launcher integration. Hosted responsive and exact-deployment evidence belongs in the PR after it exists.

## Release limits

Until actual receipts are recorded, this is a prepared source revision. No two-account live Koro test, real message write, restricted-network call, device camera/microphone test, provider provisioning or production publication is claimed. Existing unrelated review holds remain in force. Use the existing repository and Vercel project; preserve other saved revisions.
