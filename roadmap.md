# Language support

# Separate app search branding and direct entry
- [ ] Verify app entry URLs, app-specific logos and default MBR shortcut destination.
- [ ] Separate Google search logos: requires user-approved separate hostnames and domain connections; paths on one hostname share Google's favicon.

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
