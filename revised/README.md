# Sota Kece Revised

An original, standalone application stored at `/revised/` in this repository. Its dedicated preview deploys this directory as the site root, so Ops Room opens directly into the new app. Created and designed by ChatGPT for Donovan on 28 October 2026. This directory contains newly authored interface code, design, SVG illustrations, copy, sample community and synthesized instrumental compositions. It does not import the existing Sota Kece frontend. The existing repository and Supabase account/data service are retained, as are standard browser APIs, open-source client software and Google Fonts.

## Run

Serve the repository with any static HTTP server, then open `/revised/`. There is no build step. For example, `python -m http.server 8065` and `http://localhost:8065/revised/`.

Run `node --test tests/revised-app.test.cjs tests/revised-ui.test.cjs` from the repository root. UI tests use the existing `tests/talanoa-tools` jsdom dependency; set `NODE_PATH=tests/talanoa-tools/node_modules` after installing that lockfile. A dedicated CI workflow runs both suites.

## Working journeys

- Public welcome page and responsive navigation: Home, People, Talanoa, Music and My space.
- Sample community: create moments with original artwork, like/save/reply, search fictional people, record sample connection requests, create/join circles, send local messages, edit profile and theme, export sample data.
- Music: four original 24-second instrumental sketches, persistent playback across navigation, next/previous/repeat/seek/volume, favourites, optional existing community catalogue, local audio files without upload.
- Accounts: existing-service email/password sign-in and signup, email confirmation, password recovery, profile setup, live friends/search/requests, moments, private circles/messages and profile editing through a new adapter. Database access rules remain unchanged.

## Social revision

- Post words, local photos with required alt text, or two-to-four-choice polls. Photos are decoded and re-encoded as JPEG on the device (no EXIF carried across), with input, pixel, per-image and total-storage bounds. Polls allow one reversible vote from the sample user; no votes or incoming replies are invented.
- Discover six interests and matching sample people. For you ranks the owner's posts, explicit interests, then friends, with time ordering inside each group. Latest sorts by time. Following, My moments and Saved are separate filters. No inferred interests or engagement ranking.
- Hide moments, mute people from this feed and restore those choices. These are feed preferences, not server blocks or moderation reports.
- Edit your own sample words and reply settings, pin a profile moment, remove with one-step Undo, add a profile status/HTTPS link and choose an original profile soundtrack.
- Quote a circle message, react in the sample conversation, search loaded messages and retain the draft while changing reply context. Member replies use a plain-text quote supported by the existing message service; sample replies retain structured quote context.
- Search the loaded community with the header search control or Ctrl/Cmd K. N opens the composer outside editable controls. View a bounded history of your own sample actions.

Rich media, polls, advanced profile fields, post editing, pinning and reactions currently persist only in the local sample. They are not presented as live-account server features. Member feed preferences are tab-local. Existing live authentication/account migration to the shared Dimau account system is not verified by this build; no new per-app identity service was created. The real account adapter is unchanged.

## Data and verification boundaries

Sample people and conversations are fictional. Sample changes are stored only under `sota.revised.sample.v1` in localStorage. No automatic sample replies are generated and no sample content migrates into member accounts. Real member content/drafts are held in memory and cleared at account boundaries; the auth SDK uses its normal separate session storage. Member colour preference is per-account sessionStorage. Late private responses are rejected after an account epoch changes.

Real account mutations require a signed-in person using the interface. Automated adapter checks and local sample browser checks do not prove live authenticated operation. The build must report that distinction. Member favourites and saved feed selections last for the current session; local music files last until the tab closes. Circle messages use an explicit Refresh control, not realtime subscriptions.

Community music is an optional existing content source. Its recordings are not represented as ChatGPT creations. Sota Sessions, the new SVG art and the revised product interface are original work for this project. No third-party AI was used.

## Publication

The preview remains on the held PR branch. Production at sotakece.com is unchanged. Do not merge or promote without Donovan's publication instruction.
