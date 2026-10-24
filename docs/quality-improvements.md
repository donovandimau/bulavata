# Sota Kece quality revision — 24 October 2026

Owner request: improve everything about Sota Kece. One coordinated improvement revision based on canonical published c81a0921e7cd3cf251684c7d2cd3bda8e05af54d; Ops task718 lease1. Supplied artwork, masi, logos, existing social features, 84 skins and 81-song catalogue are retained.

## Product changes

- Calm, readable home surfaces; consistent spacing, focus states, form sizes and phone controls. Guest and signed-in skip links and main landmarks. Account dialog contrast corrected. Personal skin colours retain their existing tokens.
- Native keyboard controls for social cards/Top Mates; named composer/search fields, announced errors and current-tab navigation.
- Generation guards for async views/search/profile boot. Explicit connection failures with retry, rather than false empty communities. Account changes clear old member state immediately without rebooting same-owner token refreshes or drafts.
- Koro message failures retain the draft. Unique send tokens prevent duplicate sends and stop old-owner responses unlocking a new composer.
- Clipboard confirmation follows actual success; canonical homepage invite is https://sotakece.com/ and blocked clipboard has a readable fallback.
- Studio saves capture immutable owner/settings/dialog state, disable conflicting controls, preserve failed edits and ignore stale responses/new owners.
- Shared audio coordination covers playlist, local uploads, WebAudio sample and profile tracks/native controls. Old private profile audio stops on navigation/account change. Playback still starts from user action.
- Lean offline shell, public imagery/fonts cached on use, versioned static resources matched offline, network-first document fallback. Private/API/upload/token/range traffic is excluded. Reconnection preserves unsent drafts and active views.
- Main hero receives viewport-specific preload; secondary music/logo images load lazily. Original asset bytes are preserved. All test files now run in canonical CI.

## Verification and boundaries

Tests execute real source functions/modules using deterministic service/DOM fixtures, including races, failures, owner switches, private-cache exclusions and native audio events. All existing suites remain in the run. No database/schema/RLS/auth-provider configuration changes or new dependencies.

Before final handover, verify exact hosted sources and desktop/phone browser flows. Authenticated fixture coverage does not prove a real signed-in member journey. No engagement/traffic uplift is claimed. First-visit offline artwork depends on whether it was requested after service-worker control; optional imagery is never eagerly downloaded for installation.

Official Supabase references consulted: https://supabase.com/docs/reference/javascript/auth-onauthstatechange , https://supabase.com/docs/reference/javascript/update and https://supabase.com/docs/guides/troubleshooting/why-is-my-supabase-api-call-not-returning-PGzXw0 . Changelog checked24October2026; upcoming legacy TLS cipher deprecation requires no frontend API change.
