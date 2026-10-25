# Native audio and video calls

Sota communications now contains an original shared calling interface for Koro groups. Existing chat, discussions, boards and external Jitsi invitations remain available. Portfolio launchers open `communications.html?app=<slug>&view=calls&mode=audio|video` without forwarding account tokens or personal data. A Sota account and current Koro membership are required.

## Included

- Audio and video calls inside the app for up to six members, ringing/answer/decline/busy/missed states, single-device admission and rejoin.
- Explicit prejoin device checks, microphone meter, speaker test, input/output selection where supported, muted join, camera controls, lower-data bitrate limits and browser noise suppression.
- Host lobby, admit/reject/remove/end controls, membership checks on every signaling request, 60-second participation leases, bounded ICE queues, cleanup and reconnection attempts.
- Screen/tab sharing, optional desktop camera bubble, optional local recording with a visible participant notice, and local transcript export from opt-in browser speech recognition. Captions cover the local microphone only and may use the browser vendor's online speech service.
- Optional social-space voice attenuation and member-private callback requests managed by the Koro owner. No phone number is collected.
- Expiring TURN credential endpoint, credential refresh support, and a separately verified self-hosted Coturn infrastructure kit in dimau-platform-standard.

## Operational limits

The initial deployment uses direct WebRTC with STUN. A persistent TURN relay has not been provisioned and restrictive networks may fail to connect. External meetings remain a clearly disclosed fallback. This six-member mesh is not an SFU or a large webinar service. Incoming alerts require the page to remain open; browser notifications are opt-in. Browser support controls screen sharing, speaker selection, recording and speech recognition. Recordings are local WebM files, capped at 30 minutes/250 MB, with no automatic upload. Koro membership does not restrict external Jitsi meetings. These features do not connect ordinary phone numbers or bridge WhatsApp/Messenger/Teams.

## Verification

The production Sydney database migration and transaction-rollback role/membership suite were executed through the signed-in Supabase SQL editor. Tests cover outsider denial, device ownership, capacity, recipient-only signaling, lobby, revoked membership, timeouts, recording notices, spatial bounds, callback privacy and explicit grants. The lease-rejoin regression is included in the additive follow-up migration/test suite.

`node --test tests/native-call-media.test.cjs tests/native-call-effects.test.cjs tests/native-calls-core.test.cjs tests/communications-core.test.cjs`

The DOM race suite uses jsdom 26.1.0: install in an isolated test-tools directory and set `JSDOM_MODULE` to its module path, then run `node --test tests/native-calls-ui.spec.cjs`. It covers explicit media access, muted join, kick cleanup, lobby/cancel, verification loss, recording consent/export reset, stale asynchronous responses, camera-off preservation and rejoin eligibility.

`/tests/native-call-browser.html` checks two actual local browser peer connections using generated video; it requests no camera, microphone or account. This is distinct from a real two-device call across networks.
