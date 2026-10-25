# Sota Kece design direction

Sota Kece is a Fijian community space built around people, personal rooms and music. Preserve the owner's supplied public artwork, Dimau logo, light-blue patterned background, native music control and existing navigation. The canonical source is this repository, not the separate React skins demo.

## Community discovery

Use original existing skin artwork as the primary visual cue. Six collection cards group the available schools, vanua/islands, music communities, cultural designs, life events and new styles. Derive counts and featured examples from the actual preset catalogue in `skin-discovery.js`. All skins remain available through All skins and the category selector. A search covers identity names and the existing attributed song/artist references.

The discovery panel uses a dark ocean surface (`#0b2034`), crisp light type, restrained mint actions and cover imagery. Preserve the visible surrounding supplied pattern. Cards have a layered cover treatment, a clear name, an honest count and a short human description. Images are decorative when the button already names the collection. Use native buttons, visible focus, reduced-motion support and a narrow-screen layout without horizontal page overflow.

## Distinct room hierarchy

- School: an orderly supporter banner, strong identity border and friend community before the conversation in the preview.
- Music: soundtrack and song references before conversation; a clear selected recording; listener-initiated playback.
- Heritage: centred profile, cloth framing and a single editorial stack.
- Place: a taller landscape cover and more generous editorial lettering.
- Celebration: softer asymmetric cards while keeping names and messages readable.
- Social: the existing wall-and-friends layout, with the member's own settings.

The presentation family derives from the stable skin ID, not from imported arbitrary CSS. Keep all existing IDs, colours, original artwork, saved v1 settings, custom words, interests and media. A collection entry previews a representative identity without saving it. Cancel restores the previous selection; saving remains an explicit action.

## Reuse and constraints

The 25 October GitHub review informed the hierarchy: content-led music discovery, mobile-friendly collection entry and reusable accessible controls. This implementation uses original native HTML/CSS/JS and existing assets. It does not copy Spotify code, proprietary fonts, institutional crests, third-party photographs or recordings. The existing song relationships remain attributed references, and the central native playlist is unchanged.

Keep expert settings under Fine-tune your skin. Add no large UI framework solely for visual styling. New public shell files belong in the worker allowlist; optional cover imagery stays lazy-loaded. Authentication, social queries, private media and cache exclusions are outside the visual redesign.
