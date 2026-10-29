# Sota Kece imagery review — 29 October 2026

Publication hold: owner approval is required before merging or publishing this follow-up.

## Continuity

PR #267 was already merged at the start of this review. Work therefore continues in draft PR #281 from main `b26a98ffe25eeddf3a35765e27f2e57dc467c550`, preserving merged music PR #263 and interface PR #275. No changes to production or shared project settings were made. Ops redirected to signed-out Google; the source handover is recorded in both PR conversations.

A concurrent Room Studio branch (`agent/codex/improve-sota-kece-skin-layouts/1`, observed head `651e60d`) is left intact. This follow-up does not modify `skin-library.mjs`, `combined.mjs` or `combined.css`.

## Confirmed corrections

- The revised preview had substituted a new wave pattern and veranda photograph. Retrieved original references confirm the supplied blue-and-white pattern and original music gathering. Both are restored from existing repository assets with byte-identical copies. The gathering is shown in full on Home and welcome, without repainting or regenerating it.
- Talanoa's wide banner clipped the standing woman's head. Its text and proportionally framed photograph are now separate; phones stack them. People, circle, topic and personal-space scene frames preserve the full compositions.
- Generated sample portraits previously relied mostly on a global preview notice. Visible Fictional sample labels now accompany People cards, Discover people, sample feed authors and fictional personal profiles. A real member sharing a sample ID still receives neither the sample portrait nor a fictional label (synthetic regression check).
- Generated feed scenes are visibly described as illustrative. Music artwork is explicitly unrelated to the recording artists. User-uploaded photos and existing member identity behavior remain unchanged.
- Share metadata no longer points at the old mutable preview branch. OG and Twitter use the original existing branded share image at the canonical domain, actual 1200×630 dimensions and consistent descriptions. This intentionally preserves branding artwork rather than substituting a fictional member photograph.
- Text over the restored pattern receives readable pale surfaces. The Room Studio retains its neutral editorial surface and personal palettes.

## Evidence

- 59 revised application/UI/combined checks pass, with zero skips. They include per-account settings, sample/member separation, photo-post preservation, 94 stable skin IDs and the 82 validated public music tracks.
- 24 existing music/catalogue/navigation checks pass, with zero skips. This is a targeted run, not a blanket claim about every historic PR #263 failure or authenticated music journey.
- All 18 photographic assets were visually inspected as a contact sheet; no illustrated scene/profile placeholders remain in the active registry. Original branding, navigation vectors and eight editorial landscape/material studies are intentional artwork.
- All 18 deployed photo hashes matched the source manifest on deployment `dpl_8Y5EZYQeJFsa2RYFCPf6fobQA8zn`; the restored pattern and gathering also matched source bytes. The subsequent revision changes text/readability/review-frame sizing only.
- Desktop and phone browser inspection covers Home, People, Talanoa, Music, Discover, personal spaces, welcome and Room Studio. All 94 room cards resolve to the eight preserved photographic studies. No horizontal page overflow was observed. Final deployment/phone-width checks are recorded in PR #281.
- The music page still has one audio element and the existing animated visualiser. Audio/catalogue code, authentication adapter, live member writes, community storage and room identifiers are unchanged.

## Boundaries

This pass does not verify real authenticated posting, circle membership changes, private-media uploads or actual member settings writes. It does not claim third-party Viber/social caches refreshed. The complete preview remains held for Donovan's review; no publication action is authorized by this handover.

## Final approval candidate

- App source: `6513c8eb201b62e4ffd8aae878e9c20bf292c5d8`.
- Preview: https://sotakece-d49g17mdp-donovandimau-3468s-projects.vercel.app/#home
- Deployment: `dpl_DEqzNqwWgkdR4js2ZkgCYwb5ukPf`, READY, preview target only.
- Phone review frame: https://sotakece-d49g17mdp-donovandimau-3468s-projects.vercel.app/review.html
- All 20 deployed image files (18 photographic library assets plus original gathering/pattern) match their source bytes. The canonical 1200×630 social share image was opened and visually verified in the browser; a shell request to that custom domain returned 403, so no share-image byte-hash claim is made.
- Final checks: 59 revised tests pass locally; GitHub original-app, social-and-skins and graph-consent-and-invitations checks are successful. The separate targeted 24 music/navigation checks passed.
- Browser inspection at desktop width and an exact 390px phone viewport found no horizontal overflow or broken completed image loads across Home, People, Talanoa, Music, Discover, My space and Room Studio. Welcome also has no overflow; the original image loads at 3:2 and phone sample-note/music-card rectangles no longer intersect.
- Final screenshots: `verify/sota-imagery-review-desktop-20261029.jpg` and `verify/sota-imagery-review-mobile-20261029.jpg`. Captured from the deployed app, not generated mockups.
- Production remains on `b26a98ffe25eeddf3a35765e27f2e57dc467c550`; this follow-up was neither merged nor promoted. Later commits that add this evidence do not alter the deployed app code.
