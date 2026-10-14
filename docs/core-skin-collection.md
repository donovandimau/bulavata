# Core skin collection

This batch adds 60 themes to the existing 24 presets: eight featured schools and universities, 12 cultural designs, all 14 provinces, eight island/place designs, 15 occasions and three love/memory designs. All 222 research candidate IDs remain tracked in `assets/skins/core/manifest.json`; the remaining 162 schools are outside this batch.

Each core theme has an original SVG background and repeating border, a contrasting palette, a paper, raised or glass finish, and attributed listening references where the research provides a URL. The full Sema preview displays the artwork and retains its supplied photos, Talanoa, Top Mates and soundtrack. The compact name-and-palette selector remains in place. Existing saved IDs are preserved; the new masi/canoe themes use `core-masi` and `core-drua` to avoid collisions. Personal dedications and media survive theme selection.

School themes are original fan designs with decorative palettes, not verified institutional branding; no crest was invented or copied. Regional cloth studies use original cloth-inspired illustrations, not purported authentic community patterns. Landscapes are illustrations rather than geographic photographs. The manifest preserves source links and unresolved evidence. Music links open attributed sources; the sample player remains honestly labelled, with its original Fiji flag, and no recording downloads or autoplay were added.

Backgrounds and borders total approximately 121 KB for the complete collection and load only when selected. The service worker caches only selected public SVG assets, without adding private media to its cache. Versioned script/style references refresh the collection on existing visits.

Run `node tests/core-skins.test.cjs` and the existing `sota`, `kava`, `room-media` and `local-music` test suites. Verify actual theme selection, dedication/media preservation, saved choice reload, clear cover faces, 320/360/390 px phone fit and Ops Desktop/Phone before removing the temporary verification hold and publishing.
