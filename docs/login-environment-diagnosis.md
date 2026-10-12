# Manager login diagnosis — 2026-10-11

Read-only inspection confirmed the running development backend uses
`config.demo_settings`, PostgreSQL `heliumdb`, and the exclusive
`yieldloop_preview_demo` search path. The reported manager exists in `public`,
is active, has the manager role, no pending temporary password, session version0
and a PBKDF2-SHA256 password hash. That username does not exist in the demo schema.
No password value or hash was printed; the supplied password remains unverified.

The frontend posts `{username,password}` to the same-origin `/api/v1/auth/login`.
The strict LoginInput serializer expects those fields. An email-shaped username
is supported, but an `email` payload field is not. The custom AbstractUser uses
USERNAME_FIELD=username and ModelBackend. No inconsistency was found in these
settings. LoginView checks credentials and temporary-password expiry, while
session hashes retain password and session-version invalidation.

The schema mismatch explains why the current Preview rejects this account even
if its original-schema password is correct. It does not establish whether a
previous password reset succeeded. Do not reset or duplicate the account to work
around environment isolation; do not add public as a demo-schema fallback.

User decision: retain isolated demo Preview. Original accounts therefore remain
outside Preview; use the separate demo accounts. Original and demo records remain
intact and separate. No environment switch or password reset has been performed.

Changed only `accounts/test_flows.py` and this diagnostic document. The new test
checks an email-shaped manager username, rejection of an email-only payload,
invalid password followed by successful login, authenticated identity and role,
unchanged session version and no credential echo.

Checks actually run:

```sh
DJANGO_SETTINGS_MODULE=config.test_settings python -B artifacts/api-server/backend/verify_pilot.py accounts.test_flows config.test_demo_profile
ruff check artifacts/api-server/backend/accounts/test_flows.py
```

Results:14 tests passed in35.271s; Ruff passed. Tests used11 isolated retained
schemas, not application tables. Existing coverage includes CSRF, invalid and
disabled accounts, session invalidation, permissions, audit/security flows, and
demo-profile rejection in production. No runtime authentication code changed;
no browser retest, migration, account mutation or production access was needed.
