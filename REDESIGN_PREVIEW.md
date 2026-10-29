# Sota Kece design preview

This preview reshapes the existing app around Home, People, Talanoa, Music and My space. It is held for Donovan's review; do not merge or publish it to production.

The public welcome uses semantic text and real buttons over existing artwork. Phones use five bottom tabs; desktop uses a sidebar. Existing account, invitation, handle search, circle, skin and media controls retain their handlers. The music catalogue and player are shared between guest and member views, with a compact player outside the music page. The connection map is an optional People destination.

Member destinations dispatch the existing Pulse, Friends, Koro, Music and Room views. Moments, the seated Talanoa Circle, page design and wallet remain available through More. Existing authenticated data and backend behavior are preserved. The Sema profile is explicitly labelled as an example.

Verification: run `node --test tests/*.test.cjs` for the repository CI suite. To include browser integration, set `JSDOM_MODULE` to an installed jsdom package and `NODE_PATH` to its parent node_modules directory. The complete browser-enabled run currently has three pre-existing failures in shadow-glass-controls.test.cjs: the unchanged companion loader does not mount its remote widget inside jsdom. The same three failures reproduce at base 5c43a4aa9a47ae56a677eff1d59465d5ebc3bb38. All new shell tests pass. No new account or real private content was created during checks.

Browser checks cover the five public destinations, account dialog focus, skin selection and return to My space, the loaded music catalogue, playback across navigation, and responsive widths. Existing signed-in data operations are covered by the repository tests; a real authenticated session was not used.
