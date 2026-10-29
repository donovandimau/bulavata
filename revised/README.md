# Sota Kece Revised

The combined Sota Kece preview lives at `/revised/` in the canonical repository. It combines the original ChatGPT-designed social interface and 18 original artworks with selected working components from the live site at commit `5c43a4aa9a47ae56a677eff1d59465d5ebc3bb38`. Its preview deploys this directory as the root. The original social implementation remains intact; legacy features are reused explicitly, with their provenance retained in `live/PROVENANCE.md`.

## Combined experience — 28 October 2026

- Room Studio browses/searches all 94 live skins across 15 categories, previews each design with the revised profile, and applies/restores its artwork and colours. Choices save locally per account. They do not overwrite existing cloud room settings.
- Native WebGL life map reuses the live renderer and CRUD model. It supports 10 categories, adding/editing/removing explicit personal connections, search, node placement, zoom, rotation, galaxy/dark backgrounds and an accessible list fallback. Real member maps include only the accepted friends returned by the existing service. Fictional sample people are never imported as real connections.
- The live music analyser and drawing engine share the revised player's one audio element. Spectrum, waves, halo and ocean views react to actual playback, respect reduced motion and stop drawing when not visible. Playback continues across routes. The 82-track public live catalogue is bundled as a validated local manifest, alongside four original Sota Sessions and local files.
- Top Mates selects up to 16 already-connected people, including a deliberately empty choice. It is a local profile preference, partitioned between sample and each member; it does not alter friendship or server privacy.
- Home, People, My space and the welcome page expose these features through the existing responsive navigation. There is no iframe or second app to navigate.

The live site's voice/video calling, private media studio and advanced cloud room editing remain in the existing live application; they were not ported into this combined preview. No database, authentication, ownership, live user records or production settings were changed.

## Run

Serve the repository with any static HTTP server, then open `/revised/`. There is no build step. For example, `python -m http.server 8065` and `http://localhost:8065/revised/`.

Run `node --test tests/revised-app.test.cjs tests/revised-ui.test.cjs tests/revised-combined.test.cjs` from the repository root. UI tests use the existing `tests/talanoa-tools` jsdom dependency; set `NODE_PATH=tests/talanoa-tools/node_modules` after installing that lockfile. The dedicated CI workflow runs all three revised suites. The verification run also includes existing life-map, WebGL and audio preparation suites (91 checks total).

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

Sample people and conversations are fictional. Sample social changes are stored under `sota.revised.sample.v1` in localStorage. Combined design/Top Mates settings use `sota.combined.space.v1:<owner>`; life map records and layouts retain the live engine’s separate owner-scoped keys. No automatic sample replies are generated and no sample content migrates into member accounts. Real member content/drafts are held in memory and cleared at account boundaries; the auth SDK uses its normal separate session storage. Member colour preference is per-account sessionStorage. Late private responses are rejected after an account epoch changes.

Real account mutations require a signed-in person using the interface. Automated adapter checks and local sample browser checks do not prove live authenticated operation. The build must report that distinction. Member favourites and saved feed selections last for the current session; local music files last until the tab closes. Circle messages use an explicit Refresh control, not realtime subscriptions.

Community music is an optional existing content source. Its recordings are not represented as ChatGPT creations. Sota Sessions, the original artwork and the revised product interface are original work for this project. No third-party AI was used.

## Photorealistic image library — 28 October 2026

All 18 original illustrated image assets are replaced with original photorealistic images made using OpenAI's built-in image generation: six fictional Fijian sample portraits, a community gathering hero, six everyday Fijian community scenes, four music mood covers and a neutral frangipani default identity image. Every image is used through the existing central registry across welcome, Home, People, Talanoa, Music, Discover and personal spaces. The 94 Room Studio cover references now use the photographic library; their names, colours, songs, credits and saved IDs are preserved. These are shared mood scenes, not 94 distinct photographs and not documentary photographs of named schools, places, musicians or actual members. Original vectors and legacy assets remain in source history.

All assets remain local WebP files with proportional resizing and encoding only, totalling 1,584,354 bytes. `assets/manifest.json` records dimensions and hashes; `../docs/revised-photorealistic-prompts.json` preserves the complete prompts and generated source filenames. `artwork.mjs` provides truthful alt text and the preview's About dialog identifies the imagery as generated. Real member identities and user-uploaded photos are preserved. Original vector logos and navigation controls remain vectors.

The link-preview metadata uses the same new community hero. No backend, authentication, audio, user record or production setting changes.

## Island colour refresh — 29 October 2026

The shared shell uses a light lagoon-blue background with an original geometric wave pattern, a deep ocean navigation rail, coral and sunshine accents, translucent controls and brighter photographic cards. Home has a full-width Fijian community photograph and three colourful feature shortcuts; Talanoa, Music, Discover and welcome use complementary colour families. Mobile headings have a full row and the persistent navigation fits narrow phones with a clear filled active state. Existing theme IDs remain available with refreshed palettes. The final `island-colour.css` layer preserves the editorial room collection, its personal palettes and all 94 saved skin IDs, and respects reduced motion. No backend or account behavior changes.

## Publication

The preview remains on the held PR branch. Production at sotakece.com is unchanged. Do not merge or promote without Donovan's publication instruction.
# Editorial room collection — 28 October 2026

The 94 stable room-skin IDs now use an adult editorial treatment: eight original photographic studies (ocean, basalt, linen, botanical shadows, bronze, vinyl, terracotta and mountain mist), restrained light/dark palettes, serif or sans typography, clear colour previews and a compact responsive studio. Former playful names remain searchable aliases, so existing saved choices continue to resolve. School, province, cultural and music identities and source credits remain available. These are community design editions, not official identities or documentary images.

The selected cover, colours and heading type apply to the room preview and the owner's profile. Selection stays device-local and account-partitioned as before. Eight original PNGs and exact prompts are retained in the deliverable archive; optimized WebP assets and provenance live in `assets/skins/`. They were generated with OpenAI's built-in image tool; WebP resizing/re-encoding is delivery optimization only. The separately authored photorealistic Fijian community artwork is preserved.

Validation adds text contrast for every palette, legacy saved-ID compatibility and old-name search/default-apply behavior to the existing tests. This revision is a held preview under PR267; production publication remains separate.


## Imagery preservation review — 29 October 2026

PR #267 is already merged. This follow-up preserves the exact original Fijian music gathering from `assets/fiji-music.jpg` and original blue-and-white pattern in the revised preview, using byte-identical local copies. Home and welcome show the complete original image. Community scene cards and Talanoa use proportional frames rather than shallow face-cutting crops; personal material/landscape room covers retain their own design. Fictional generated profiles carry visible labels in People, Discover, feed posts and their personal spaces, and the global sample notice explicitly identifies generated people. Member profiles receive no fictional labels or sample portraits.

Social metadata reuses the existing live original Sota Kece logo share image and canonical domain, with its actual 1200×630 dimensions and matching OG/Twitter descriptions; it no longer points at the old mutable preview branch. The original logo artwork, 18 new photo assets, eight editorial room images, 94 saved room IDs, 82-track catalogue, audio engines, account adapter and settings storage remain unchanged. `review.html` is a noindex 390px visual review frame, not a user-facing app route.

Publication is held for owner review. This pass neither merges nor promotes the follow-up.
