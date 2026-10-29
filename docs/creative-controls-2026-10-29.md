# Page design controls

The native and Revised interfaces share the same validated page-design service. A visible design action opens live preview controls for colour, typography, text size, buttons, spacing, width, corners and local background images. Settings can be saved for one page or used as the default across pages. Individual page settings take priority. Cancel restores the saved appearance; reset returns a page to its default.

Native pages and the Revised interface retain their existing navigation, account, audio, content and room-skin owners. The shared designer does not upload files or publish changes to a member's public profile. Designs and background images are saved on this device and are partitioned by account; the fictional Revised sample uses its own identity. Existing v1 records receive validated defaults for new fields. The native People route retains legacy Connect settings as a fallback.

The static Revised build carries byte-identical compatible copies of the native designer under `revised/live/`, following its existing compatibility-module pattern. `tests/revised-design.test.cjs` guards the integration and shared-file parity. Keep these files synchronized when changing the shared service. The adapter maps existing Revised routes to page preferences and reuses the original DOM and audio owner.

The Room Studio gallery, all 94 stable room identities, original artwork and saved room choices are preserved. Page design changes the surrounding interface; selected room identities retain their own cover and palette.

Validation includes persistence, cancellation, reset, account switching during saves, image validation and stale async work, navigation/player preservation, actual desktop/phone rendering and contrast of custom control colours. The expanded checks run in the existing Revised workflow with its pinned test dependencies. Four stale Companion/Connect tests also fail on the unchanged b26a98f baseline; they are recorded separately and are outside this revision.

Publication remains held for Donovan's review of the completed preview.
