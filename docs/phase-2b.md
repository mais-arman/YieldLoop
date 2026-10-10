# Phase 2B implementation

Development now runs config.session_settings. The prior Phase 2A document is a
historical schema review, not current activation status.

## Database safety and actual migrations

The platform development database and configured application connection were
independently queried for current_database and PostgreSQL system_identifier:
both matched heliumdb on cluster 7694975907574124564, initially with zero tables.
Development-only non-secret target pins were set through environment tooling.

All connections STILL start with default_transaction_read_only=on. The
accounts connection-created receiver enables writes only when development mode,
no production-deployment flag, database name, and live cluster identifier match.
Missing/mismatched pins leave the connection read-only. No production database was
queried or modified. This guard is not an alternative to production least-privilege
credentials; production activation needs a separate reviewed policy.

Applied explicitly (never at startup): Django contenttypes/auth/session migrations,
accounts/0001_initial, audit/0001_initial, accounts/0002_authratebucket.
The additional rate-bucket table is necessary for shared multi-worker throttling.
Tests use a separate named PostgreSQL database, test_yieldloop_phase2b, in the
verified development cluster. Its connection may write only under test_settings.

## Authentication

Same-origin /api/v1/auth/{csrf,login,logout,me,password}; no JWT or public signup.
CSRF validation explicitly covers anonymous login and every unsafe API operation.
Cookies are host-only, Secure by default, HttpOnly, SameSite=Lax. HTTP development
requires explicit YIELDLOOP_LOCAL_HTTP=1; no such weakening was enabled here.
Existing SESSION_SECRET is reused privately if DJANGO_SECRET_KEY is absent;
no signing secret was invented or printed. Production base settings still require
their explicit Django secret and TLS checks.

Successful login rotates session/CSRF and sets a 12-hour absolute deadline.
Logout flushes the current session; password changes log out and revoke all sessions.
Role, activation, and Manager password-reset changes bump session_version.
Existing sessions are rejected on subsequent requests; already-running requests
cannot be retroactively cancelled.

Temporary passwords expire after 24 hours. Unexpired temporary credentials allow
only replacement, logout, and minimal identity needed to route the frontend.
Expired credentials cannot log in. Expiry during an existing session blocks
replacement until a Manager resets the temporary password; logout remains available.
No password or hash is returned by employee responses.

PostgreSQL-backed HMAC-keyed fixed-window counters serialize updates across workers:
10 login attempts per normalized username/minute, 300 per observed peer/minute,
30 sensitive authenticated operations per user/minute. Forwarded IP headers are
not trusted. These are initial operational limits; gateway address aggregation
can affect many employees. Rate-row retention/cleanup needs an operational policy.

## Authorization and audit

Exactly cutting_operator, production_supervisor, manager. Every account mutation
rechecks the actor/session inside the common PostgreSQL transaction-scoped advisory
lock. Self role changes/deactivation and reset through employee administration are
blocked. Last-active-Manager invariants and concurrent mutations share this lock.
Technical Django permissions/staff/superuser fields are rejected by API inputs.

Role/activation/password/account changes and their typed audit inserts share a
transaction. Audit stores server-generated UUID correlation and allowlisted fields,
not request bodies, passwords, cookie/token values. Application append-only guards
are not database-level tamper resistance.

## First real Manager (not automatically provisioned)

A trusted operator must run:

    python artifacts/api-server/backend/manage.py bootstrap_manager --settings=config.session_settings

It prompts for username and hidden password confirmation, validates policy, uses
the common lock, refuses if any Manager exists, and audits provisioning.
Do not put passwords in command arguments, chat, source, or environment examples.
There are no default credentials. Sole-Manager recovery remains an explicit
administrative policy, not a public endpoint or bypass.

## Tests and commands

    python -B artifacts/api-server/backend/manage.py test accounts.test_flows --settings=config.test_settings --keepdb --noinput
    python -B artifacts/api-server/backend/manage.py test accounts.tests audit.tests health config.tests --settings=config.schema_settings
    python -B artifacts/api-server/backend/manage.py makemigrations --check --dry-run --settings=config.schema_settings
    ruff check artifacts/api-server/backend
    pnpm run typecheck
    pnpm --filter @workspace/yieldloop run lint
    PORT=22517 BASE_PATH=/ pnpm --filter @workspace/yieldloop run build

Never run the integration suite against the application database or use the offline
schema profile as a web service. No automatic migrations or provisioning are added.
Production cookies, hosting, backups, recovery policy, and deployment remain unverified.

## Verification result

- 10 PostgreSQL integration tests passed on the isolated test database, including
  real transactions, concurrent Manager mutations, audit rollback, and revocation.
- 30 database-free tests passed, including write-target guards and health regressions.
- Backend lint, migration drift checks, workspace typecheck, frontend lint/build passed.
  Vite retains non-fatal sourcemap warnings in existing shadcn components.
- HTTPS browser journey verified invalid/valid login, Manager employee creation,
  mandatory password replacement, role restrictions, Arabic RTL, logout/reload,
  and health status. A first-login navigation race was fixed and its focused
  invalid-then-valid regression recheck passed.
- Disposable browser-test users, target audit events, attributable throttle rows,
  and linked sessions were removed; no real Manager credentials were provisioned.
  A shared peer throttle row was retained rather than deleting unattributable state.
