# Sota Kece — 20 October 2026

Current requested step: consistent native header logo/title row on phone and desktop.

Canonical base: abe59ef8024fa7c35d21c2c05296dfc51723c6e5. The 64px row,36px contained Dimau mark,48px music target,44px flag/16px note and supplied artwork were already shared. The title changed Fredoka/Nunito and mark corners changed8px/4px at responsive breakpoints. Use Nunito800 at18px/24px for the native brand at every width, retain8px corners, and give the decorated48px logo tile an8px clear gap before its title. Other type/room/artwork rules stay intact. Version the changed stylesheet and public shell cache.

No markup/JS actions, music/social/auth handlers, image/SVG bytes or artwork cropping changed. The secondary Sota brand/navigation inside the supplied picture remains part of that original image. Ops desktop/phone previews use different display scales; physical screenshot pixels are not CSS dimensions.

Publication HOLD: show the verified revision and wait for Donovan's explicit approval. Prior approval of earlier revisions does not approve this one.

## Current owner follow-up — cover the dead headings

The owner supplied desktop/phone crops and asked to bring the Dimau heading row over the dead headings in the main panel. The live64px row now overlaps the picture with an opaque background. Responsive image offsets align source y144 (desktop1360wide) and y220 (phone1008wide) with the live row bottom, hiding the baked Dimau and Sota/navigation headings while keeping the real title/music row and main headline. Supplied image bytes remain original; only their display offset changes. Native functions, handlers and prior verified row/logo/font proportions remain unchanged. CSS and shell cache versions advanced. Continue the saved d4957ba9 candidate on the new leased branch; the earlier sizing revision remains recoverable history. Publication HOLD continues pending explicit approval.

## Current owner follow-up — entrance buttons light up

Only the three real Get started buttons below the supplied artwork gain a shared soft cyan resting glow and stronger hover/focus-visible/active lighting. Keyboard focus has an explicit outline;reduced motion removes transitions;forced colors retains a visible system border/focus. Existing layouts,labels,actions,header-cover offsets and image bytes stay unchanged. Front-page stylesheet/shell cache versions advanced. Continue saved a4b2f5d3 as parent on the current leased branch. Publication HOLD remains pending explicit owner approval.

## Current owner follow-up — supplied pattern inside Sota Kece lettering

Owner clarified that the supplied blue pattern belongs inside the fonts, specifically the top Sota Kece heading. A large pattern-filled Sota Kece wordmark now replaces the first heading position; the existing compact logo/title/music row moves directly below it, keeping all native links and controls. The pattern PNG is copied unchanged from the supplied attachment. The pattern is clipped to text, with a plain-color fallback and system-color fallback. Existing artwork crop/header cover, button lighting, personal rooms and action handlers remain intact. Styles/script/public shell cache versions advanced. Saved c2ad9786 remains the parent. Preview HOLD continues for owner approval before publication.

## Current owner follow-up — new supplied Sota Kece logo

Use the supplied purple logo with blue/yellow/red figures in original colours. Only the separate Sota Kece masthead letters retain the blue masi pattern. Existing compact heading/music row and every other heading remain below in unchanged styles. The supplied PNG is preserved byte-for-byte as sota-kece-logo-20261020.png; a square SVG viewport embeds that original PNG unchanged and excludes only its broad empty side margins when displayed. Use that square wrapper for Sota product marks, browser icon and manifest; Apple touch references the original PNG. Existing prior logo assets and the shared Dimau Group logo remain preserved. Original PNG letters and figures are not patterned or redrawn. Script and public shell cache versions advanced;public new logo cached. No CSS,main artwork or handlers changed. Parent dd196842 retained. Publication HOLD for owner approval continues.

## Owner correction during current step — retain Dimau and remove duplicate title

Donovan explicitly corrected the top compact row: leave the Dimau logo and remove the duplicate heading beside it. Restored the original Dimau mark in that row and removed only its small Sota Kece text span. The home link keeps its accessible Sota Kece home label;music control and row remain. The single large patterned Sota Kece masthead stays above. The new supplied Sota logo is used for the product mark below and the browser/manifest/Apple icons, not as a replacement for Dimau. No other headings gain a pattern or style change. Script and worker cache versions advanced. Prior note proposing to replace the top Dimau mark is superseded by this explicit correction. HOLD continues.

## Final owner clarification — pattern on background, Dimau moved up, no duplicate heading

Latest explicit instruction supersedes the patterned-font request: take the pattern out of the fonts and use it as the background. The blue supplied pattern now fills the top header background. Sota Kece is solid white text with a readable shadow. The original Dimau logo is moved into that same top row;the duplicate small Sota Kece heading beside it is removed. The existing music control shares the row. The empty second brand row is eliminated. Responsive display cropping keeps the old baked artwork branding hidden as before;main supplied artwork bytes and every other heading style stay intact below. The new purple Sota product/app logo remains original colours below and in browser/manifest icons. No pattern is applied to either logo or any font. Style/script/worker cache versions advanced. Exact supplied pattern/logo bytes and action handlers retained. HOLD continues for owner preview approval.

## Current owner follow-up — music up into top-right

Only the existing header music button now aligns to the start of its grid cell. This puts its48px target at the header8px top inset and keeps its12px right inset,without resizing,replacing or duplicating it. Header pattern,solid title,Dimau position,logo assets,other headings,artwork cropping and all actions stay unchanged. CSS and public shell cache versions advanced. Parent032c9b9c retained;publication HOLD for owner preview approval continues.

## Current owner step — replace green Kava symbol, remove duplicate entrance strip

Owner clarified target with a screenshot:the new Sota Kece logo replaces the green symbol in the Kava Circle section farther down,not the large white title or the logo above people search. The supplied logo now occupies that existing Kava symbol frame;the redundant separate product-logo image above search is removed. Roots tagline remains in a compact line. The duplicate below-hero Create your space button strip is removed. Its original sign-up action now sits as an accessible44px-minimum transparent button over the existing pictured CTA,so the picture shows one working entrance button. Existing Room studio and Sign in buttons/IDs are relocated compactly alongside the people-search area (one row below search on phones);existing handlers and account/studio dialogs retained. Shared Dimau,patterned header,solid title,top-right music,main image bytes and display crop remain unchanged. Front stylesheet,script and public worker cache versions advanced. Parent6a73ee78 retained. Publication HOLD for owner preview approval continues.


## Current owner follow-up — header music connects to Supabase playlist

Connect only the existing top-right music button to a native accessible playlist dialog. Reuse the current Fiji 3D Maps catalogue:81 tracks in its existing order/titles,streamed directly from the existing public fiji-audio bucket in Supabase project xnxmumbvgtmlpenutlii. The historical82-track count is superseded by the actual current81-entry source. No audio bytes copied,no new storage or database/access changes,no private Music Hub drafts exposed. Header button now opens the playlist rather than playing the generated sample. Search,track selection,native audio controls,Play/Pause and Previous/Next are available;ending advances the queue. Closing the dialog keeps music playing and restores focus;reopening retains selection. Nothing plays or downloads audio until the listener chooses Play or a song. Playlist pauses when another local/sample/audio player starts. Current header48px button position/artwork and all layout/logo/entrance changes remain exact;other sample/upload/profile functions retained. Module validates catalogue paths against a fixed public audio origin;error messages/retry support network failure. Shell/script caches advanced. Parent ebb2bdc8 retained;publication HOLD for owner preview approval continues.


## Current owner follow-up — blue pattern across public background

Extend the already supplied blue header pattern to the full public landing-page backdrop,including outer gutters,the area below the sunset artwork,the search/control area,gaps between content and the footer. Reuse the original pattern asset at the same420px repeat size;add a navy tint for readable supporting text. The neon wrapper and artwork wrapper are transparent so they no longer show a separate dark/purple/teal background. Remove the separate brown masi decorations above the classic content and below its footer by suppressing those two pseudo-elements,including their occupied height/margins. Original brown masi artwork asset and all imagery remain preserved. No changes to the supplied sunset/picture border,header/logo/music positions,solid title,compact entrance,personal room designs,account/studio/playlist logic or playlist assets. Front stylesheet and public worker cache versions advanced. Parent910c1bc3 retained;publication HOLD for owner preview approval continues.
