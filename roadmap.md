# MBR advertisement management
- [ ] Add a collapsed Advertisement button with current promotion/upload previews, copy/download, replacement and organization selection.
- [ ] Persist targeting with existing super-admin authorization and verify signed-in save/readback and dashboard filtering.

# Executive committee and member logo
- [x] Add Founders and Disciplinary Committee Member appointment positions; shared validator and database enum confirmed, seven tests pass, both roles saved and read back in the signed-in committee page, original Executive appointment restored.
- [x] Fill the member dashboard organization logo box; signed-in real logo loads edge-to-edge at 390/1280 widths, both position selections verified, build OK. Not published. Existing notification subscription error remains unrelated.
- [ ] Confirm live deployment of executive committee positions and member logo after the October 30 publication request; signed-in preview rechecked at 390/1280 widths, live deployment completion remains external.

# Vaaradhi silent promotion video
- [x] Verify dashboard bell/language/settings spacing in the screenshot's organization at 320/360/390/1280 widths; no overlapping controls, notification and language menus and Settings open. MBR silent full-frame video and Vaaradhi Home → promotion playback verified.
- [ ] Confirm live deployment of the advertisement bar, Vaaradhi promotion link and dashboard header adjustments after requesting publication; deployment completion is external.
- [x] Match the MBR ad bar to the video's aspect ratio, remove empty bands and round its corners; verified signed-in desktop/mobile full-frame silent playback and rounded corners, build OK. Not published.
- [x] Remove all audio and register silent MP4/WebM app assets; both retain 1200×128 dimensions.
- [x] Show the video in the MBR global advertisement rotation and add the promotion-video link on Vaaradhi Home, opening a playable video page with download.
- [x] Verify signed-in MBR ad autoplay, muted playback, uncropped framing, Vaaradhi Home → promotion-page link and playback; no page errors, five entry-link regression tests pass and build OK. Not published.

# MBR organization sharing
- [x] Add organization-logo share previews, page-level Share buttons and permission-checked destinations with blank registration fallback; registration QR links use branded society URLs.
- [x] Verify SSR logo/title tags, loaded logo, blank registration for signed-out/other-society users, owner access to Members and exact copied link; 12 regression tests pass. Not published. Existing notification subscription error observed on dashboard remount, unrelated to sharing.

# Vaaradhi October 29 page adjustments
- [x] Update the slogan with transport and add a fourth rotating real-estate photo; Telugu slogan, loaded image and timed wrap verified.
- [x] Highlight search heading and search bar background; mobile appearance and entered search term verified.
- [x] Rename Update Board to Upload, move posting controls below welcome, hide occupation heading and collapse removal history at the bottom; approved-user upload form opens, final history button expands/collapses correctly.
- [x] Collapse profile details behind the Profile button; approved-user eight read-only fields expand/collapse with zero inputs; mobile no overflow or runtime errors and 30 regression tests pass. Not published.

# Vaaradhi home refresh
- [x] Update header slogan to Online Business & Services, enlarge the existing logo and add a distinct mint background; verified desktop/mobile, loaded logo and Telugu/English language selection; 24 language tests passed. Not published.
- [x] Replace static photos with five natural-looking category photos in requested order: services, fresh produce/grains, new/used goods, real estate, transport; all images loaded, all five category actions verified including Used chooser, desktop/mobile inspected without overflow or runtime errors; build OK. Not published.
- [x] Refine auto-sliding illustration banners with swipe and pause controls, add five category shortcuts (New/Used selection), and polish spacing, colors and shadows; verified automatic advance, all category destinations, loaded images, desktop/mobile and Telugu layout without overflow or runtime errors; 24 language tests passed. Not published.

# Vaaradhi profile page placement
- [x] Move registration/profile details from Update Board to Profile; verified signed-in bottom-menu navigation, direct registration form and mobile layout, with three existing profile permission tests passing. Approved ordinary-user preview verification confirms eight detail fields, no edit/save controls, no admin menu and no profile section on Update Board.
- [ ] Live verification of moved Profile page: publish requested October 28; latest live check still served the previous placement, so deployment completion remains the blocker.

# Vaaradhi approved profile permissions
- [x] Make the registration photo optional, lock approved profiles for ordinary users, and add authorized admin profile editing.
- [x] Verified signed-in admin phone save/reopen/list readback and restored original number; verified approved ordinary-user read-only UI, blocked server action, blocked admin RPC and blocked direct update; 30 regression tests passed, build OK.

# Admin organization registration details
- [x] Show and edit organization registration fields, bank/admin details, founders and private document uploads; verified signed-in founder/address save, View readback, reopening, mobile layout, and restoration of test values; seven regression tests passed, build OK.

# Language support
- [x] Localize item form labels, placeholders, units and stock controls in Telugu/Hindi/English; 24 existing tests passed, build OK. Browser presentation checks with a temporary profile response confirmed language switching preserves typed values; real signed-in account has no Vaaradhi profile, so its posting flow remains unverified.

# Vaaradhi post moderation
- [x] Add permission-checked removal with required reason and immutable admin attribution; super admins across areas, regional admins within active seats.
- [x] Add signed-in user reports and scoped admin report/history review, with owner-facing removal explanations.
- [x] Verify reports, removal, hidden listing/provider after reload and retained reason/admin history in signed-in UI; 27 tests passed, build OK; temporary verification rows removed.

# Separate app search branding and direct entry
- [x] Verify /mbr and /varadhi open directly with their own logos; default MBR shortcut starts at /mbr, society shortcuts retain their portal; two tests passed.
- [x] Separate app host routing and Google branding: verified root redirects, server-rendered app-specific icons and self-referencing entry canonicals; six regression tests passed. Hosted checks await domain setup and publication.
- [x] Per-domain favicon, SEO title/description, Organization schema and host-scoped sitemap: verified on both hosts via server responses; six tests passed, build OK.
- [ ] Google recrawl for separate search logos: both app domains are connected and Vaaradhi serves its own favicon; Google controls refresh timing.
- [x] Verify Vaaradhi DNS connection and live root redirect to its app with its own favicon, canonical and sitemap; platform entry links and future Android shells use its dedicated hostname, seven regression tests passed and browser entry verified.
- [ ] Publish dedicated Vaaradhi platform entry links; existing Android installations retain their packaged launch URL until updated.

# Admin organization member counts
- [x] Correct organization details so the admin sees actual members and status totals, not a silent zero on read failure.
- [x] Verify counts against the signed-in admin panel and add a regression test: Chitvel 10 approved, other societies 1 each; three tests passed.

# Disciplinary committee
- [x] Resolve private member photos for the committee list.
- [x] Offer Founder, Sincere Senior and Present President below the member selector; preserve existing appointments.
- [x] Test role validation and verify signed-in photo rendering and role selection.

- [x] Align every listed language with translation validation and batching.
- [x] Supply bundled translations for shared controls and registration/sign-in labels in all listed languages.
- [x] Correct language direction, persistence, and same-script language handling.
- [x] Verify language switching, placeholders and unchanged input values.
- [ ] Full screen descriptions, native prompts and PDF language coverage: requires additional locale copy and native-language review; shared controls alone do not establish full coverage.

# Vaaradhi and recovery language corrections

- [x] Bundle meaningful Hindi and Telugu for Vaaradhi screens and recovery messages.
- [x] Preserve identity fields and verify language switching, registration and recovery states.
- [x] Verify signed-in registration, admin application, partner and profile screens have no Telugu text in Hindi mode; 23 locale regression tests and automatic build passed.
- [ ] End-to-end emailed OTP/password update and full admin action states remain unverified; no account data was changed during translation checks.

# Saved society ID card editing
- [x] Match the displayed society card in the studio, including real member photo, designation, signature and footer; verified header edit/save/reopen and restored original design, four tests passed.
- [x] Restore saved design loading and preserve saved styling in Design Studio; show the legacy society card when no design is stored.
- [x] Verify signed-in Chitvel editing, save and reopen, desktop/mobile display and two regression tests; restore the original card after testing.
