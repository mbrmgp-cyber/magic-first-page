# Language support

# Disciplinary committee
- [ ] Resolve private member photos for the committee list.
- [ ] Offer Founder, Sincere Senior and Present President below the member selector; preserve existing appointments.
- [ ] Test role validation and verify signed-in photo rendering and role selection.

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
