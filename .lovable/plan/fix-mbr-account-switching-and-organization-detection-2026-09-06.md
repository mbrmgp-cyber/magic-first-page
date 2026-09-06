# Fix MBR account switching and organization detection

## Changes
- Stop the MBR entry and login pages from automatically forcing a previously saved account into a dashboard before the user can choose an account.
- Clear old account data when a new login succeeds so one user's organization result cannot appear for another user.
- Treat organization/member lookup failures as retryable errors, not as proof that the user has no organization.
- Key protected account queries by the signed-in user and show a retry state while identity data is being verified.

## Verification
- Confirm the organization owner account resolves to CHITVEL HELPLINE SOCIETY.
- Confirm Mannuru Bhaskar Reddy resolves as an approved, active member and president of the same society.
- Test login/redirection and account switching in the running app, then confirm the app builds cleanly.
