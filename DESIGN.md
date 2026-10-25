# Sota Kece design direction

Sota Kece is a Fijian community space built around people, personal rooms and music. Preserve the owner's supplied public artwork, Dimau logo, light-blue patterned background, native music control and existing navigation. The canonical source is this repository, not the separate React skins demo.

## Community discovery

Use original photographic mood artwork as the primary visual cue, resolved through `skin-visuals.js`. All 94 room covers and studio thumbnails use this presentation; the original vector library remains preserved as source history. Six collection cards group the available schools, vanua/islands, music communities, cultural designs, life events and new styles. Derive counts and featured examples from the actual preset catalogue in `skin-discovery.js`. All skins remain available through All skins and the category selector. A search covers identity names and the existing attributed song/artist references.

The owner rejected bare vector cards and cartoon styling. Use a warm editorial surface (`#f5f3ee`), restrained Arial/system typography, asymmetric photographic cards and legible white image captions. Preserve the supplied pattern outside this panel. Featured school and music entries get more space; the coastal, cultural and memories entries form an image-led row. Use real material depth and original photographic mood artwork rather than stacked vector covers, abstract symbols, toy profile skeletons or rounded display lettering. Counts remain honest. Images are decorative when the button already names the collection. Native buttons, visible focus, reduced motion and narrow-screen layouts remain essential.

## Distinct room hierarchy

- School: an orderly supporter banner, strong identity border and friend community before the conversation in the preview.
- Music: soundtrack and song references before conversation; a clear selected recording; listener-initiated playback.
- Heritage: centred profile, cloth framing and a single editorial stack.
- Place: a taller landscape cover and more generous editorial lettering.
- Celebration: softer asymmetric cards while keeping names and messages readable.
- Social: the existing wall-and-friends layout, with the member's own settings.

The presentation family derives from the stable skin ID, not from imported arbitrary CSS. Keep all existing IDs, colours, original artwork, saved v1 settings, custom words, interests and media. A collection entry previews a representative identity without saving it. Cancel restores the previous selection; saving remains an explicit action.

## Reuse and constraints

The 25 October GitHub review informed the hierarchy: content-led music discovery, mobile-friendly collection entry and reusable accessible controls. This implementation uses original native HTML/CSS/JS and existing assets. Nine original mood scenes were generated for this revision, with briefs in `docs/editorial-artwork.md`. They are illustrative artwork, not records of a real school campus or portraits of a real artist. This implementation does not copy Spotify code, proprietary fonts, institutional crests, third-party photographs or recordings. The existing song relationships remain attributed references, and the central native playlist is unchanged.

Keep expert settings under Fine-tune your skin. Add no large UI framework solely for visual styling. New public shell files belong in the worker allowlist; optional cover imagery stays lazy-loaded. Authentication, social queries, private media and cache exclusions are outside the visual redesign.
