# Language support

# Vaaradhi post moderation
- [ ] Add permission-checked removal with required reason and immutable admin attribution.
- [ ] Add user reports and scoped admin report/history review.
- [ ] Verify reports, removal, hidden public posts and retained history with tests and signed-in UI.

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
