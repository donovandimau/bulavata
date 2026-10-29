# Fiji, Pacific and tropical themes

This document records the earlier illustration revision. Active theme art now follows [Photographic Fiji, Pacific and tropical themes](photographic-themes-2026-10-29.md); the original vector assets remain preserved as history.

Owner direction: Sota Kece targets young people, and its themes must centre Fiji, the Pacific and tropical island life. This revision changes the existing theme libraries and page designer, preserving account, social, music and publishing behaviour.

The 94 stable room IDs now have 94 original local SVG covers and distinct readable palettes. Ten visual families cover lagoons and sails, coral reefs, coconut shores, palms, hibiscus, tropical rain, island highlands, music, community gatherings and original woven-inspired geometry. Generic material-study names are replaced by names such as Fiji Lagoon, Pacific After Dark, Tropical Rain, Island Hibiscus and Pacific Mixtape. Former names remain searchable aliases. School, province, cultural and artist identity credits and all attributed listening references are preserved. The illustrations are original decorative designs rather than official logos, documentary landscapes or claimed authentic cultural patterns.

`revised/assets/skins/pacific-20261029/catalogue.json` is the shared theme data. The Revised library contains the same data; run `node scripts/build-pacific-native.cjs` to regenerate the native UMD data. Native catalogue categories remain compatible with the existing discovery groups. Regional covers take priority over earlier editorial overlays; original photographs, SVGs, borders and manifests remain as source history.

The page designer retains its saved palette IDs and version 1 settings. Its six palettes now read Fiji Lagoon, Island Sunset, Bula Beats, Pacific Blue, Reef Night and Tropical Grove. All existing font, size, button, custom-colour, layout and wallpaper options remain. Existing saved custom colours are retained. Room Studio uses a brighter island gallery with readable labels and theme controls that stay below the actual resized header on phones and desktops.

The root app and the standalone communications entrypoint load the shared regional catalogue before the skin and circle-type modules. Circle display accents follow the selected room palette; persisted group metadata, SQL mappings and database contracts remain unchanged. The service worker keeps its existing 1 MiB mandatory installation budget; the new public catalogue helper and requested regional artwork use the existing on-demand public cache. Authenticated, private and uploaded media remain excluded.

Validation includes all room IDs, native/Revised catalogue parity, source identity-credit digests, self-contained SVG checks, palette contrast, legacy saved selections, account separation, group mappings, preview/cancel/save/reload, mobile fit and the public-only cache boundaries. Four unrelated optional DOM tests for retired Companion/Connect controls remain known baseline failures; they are outside this theme change.

This is a review revision. Publication requires the owner's review of its completed working preview.
