# Sota Kece Revised

An original, standalone application at `/revised/`. Created and designed by ChatGPT for Donovan on 28 October 2026. This directory contains newly authored interface code, design, SVG illustrations, copy, sample community and synthesized instrumental compositions. It does not import the existing Sota Kece frontend. The existing repository and Supabase account/data service are retained, as are standard browser APIs, open-source client software and Google Fonts.

## Run

Serve the repository with any static HTTP server, then open `/revised/`. There is no build step. For example, `python -m http.server 8065` and `http://localhost:8065/revised/`.

Run `node --test tests/revised-app.test.cjs tests/revised-ui.test.cjs` from the repository root. UI tests use the existing `tests/talanoa-tools` jsdom dependency; set `NODE_PATH=tests/talanoa-tools/node_modules` after installing that lockfile. A dedicated CI workflow runs both suites.

## Working journeys

- Public welcome page and responsive navigation: Home, People, Talanoa, Music and My space.
- Sample community: create moments with original artwork, like/save/reply, search fictional people, record sample connection requests, create/join circles, send local messages, edit profile and theme, export sample data.
- Music: four original 24-second instrumental sketches, persistent playback across navigation, next/previous/repeat/seek/volume, favourites, optional existing community catalogue, local audio files without upload.
- Accounts: existing-service email/password sign-in and signup, email confirmation, password recovery, profile setup, live friends/search/requests, moments, private circles/messages and profile editing through a new adapter. Database access rules remain unchanged.

## Data and verification boundaries

Sample people and conversations are fictional. Sample changes are stored only under `sota.revised.sample.v1` in localStorage. No automatic sample replies are generated and no sample content migrates into member accounts. Real member content/drafts are held in memory and cleared at account boundaries; the auth SDK uses its normal separate session storage. Member colour preference is per-account sessionStorage. Late private responses are rejected after an account epoch changes.

Real account mutations require a signed-in person using the interface. Automated adapter checks and local sample browser checks do not prove live authenticated operation. The build must report that distinction. Member favourites and saved feed selections last for the current session; local music files last until the tab closes. Circle messages use an explicit Refresh control, not realtime subscriptions.

Community music is an optional existing content source. Its recordings are not represented as ChatGPT creations. Sota Sessions, the new SVG art and the revised product interface are original work for this project. No third-party AI was used.

## Publication

The preview remains on the held PR branch. Production at sotakece.com is unchanged. Do not merge or promote without Donovan's publication instruction.
