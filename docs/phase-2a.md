# Phase 2A: authentication schema foundation

## Status and boundaries

The running API still selects `config.settings`: no authentication apps, middleware,
endpoints, or database writes have been enabled. Health/readiness remain schema-free.
No frontend, API contract, dependency, environment, startup, or deployment changes.
No migrations have been applied; no users, credentials, or sessions created.

The approved direction is Django database-backed sessions, not JWT. There is one
business and exactly three application roles. Django alone owns the schema.

## Models and migration graph

- `accounts.User` extends AbstractUser. Role is required with no default and has a
  three-value database check. `is_active` comes from Django. Temporary-password
  replacement requires an expiry; a non-temporary password must have no expiry.
  A nonnegative PositiveBigInteger session version starts at zero. Username retains
  Django's existing unique, case-sensitive behavior pending account-policy review.
- `accounts/0001_initial` depends on Django `auth/0012_alter_user_first_name_max_length`
  (which depends on earlier auth/contenttypes migrations). The custom model must
  be selected before the first authentication migration. It includes inherited
  groups/user-permission relationships, not extra application roles.
- `audit/0001_initial` depends on the swappable user model, resolving to
  `accounts/0001_initial`. Event/outcome values have database checks. Actor is
  nullable for bootstrap; target is required. Both references use PROTECT.
- Django supplies `sessions/0001_initial`; no custom session table or registry.
- Indexes: user `(role, is_active)`, audit timestamp, audit `(target, occurred_at)`;
  plus Django's inherited unique username, FK indexes, and session expiry index.

Audit change details are typed old/new role and activation fields, never arbitrary
JSON, request bodies, free-text messages, or credentials. Event-specific validation
requires both before/after values. Request correlation is an optional UUID.
Instance updates/deletes and queryset update/delete/bulk writes are rejected.
Validated saves force INSERT, including with manually supplied primary keys.
These guards are application-level only: raw SQL, privileged database users, or
internal ORM bypasses are NOT cryptographically prevented. Field validators and
model clean rules are not all database constraints.

Future account mutations must use explicit serializer field allowlists excluding
staff/superuser/groups/technical permissions, Django password validators plus
set_password(), and one transaction for the mutation, version bump, and audit INSERT.
`set_password()` alone does not run password policy validation.
No serializers, authorization services, automatic mutation hooks, or audit writers
are implemented in this phase. Audit enforcement of future account changes is deferred.

## Session revocation

The custom user extends Django's authentication hash with session_version while
retaining the encoded password and secret-key dependency. Django's inherited
fallback-key iteration calls the same override, so key rotation is preserved.
No session keys are stored in audit or user records.

Later role/deactivation/reset services must atomically increment session_version
with an F-expression or protected row update and audit the change. Django rejects
old hashes on subsequent authenticated requests. Password changes also change the
hash naturally. Reactivation must not reset the counter. Old database session rows
need not be scanned/deleted for invalidation; approved cleanup can remove expiry
rows later. This does not cancel an already authorized in-flight transaction.
Database-backed revocation behavior has NOT been tested in this phase.

## Prepared versus active settings

- **Active:** `config.settings`, unchanged. PostgreSQL read-only connection option
  remains on. Its existing development random SECRET_KEY fallback remains only
  for the schema-free health service.
- **Prepared:** `config.session_policy`, containing auth/contenttypes/sessions/apps,
  middleware order, session authentication, database session engine, password
  validators, host-only Secure/HttpOnly cookies, SameSite=Lax, and no trusted
  cross-origin exemptions. CSRF token acquisition must later use a masked-token
  endpoint because the CSRF cookie is HttpOnly.
- **Pending activation:** `config.session_settings`, which overlays that policy on
  the existing settings and refuses activation without an explicitly configured
  stable secret of at least 50 characters. It STILL inherits database read-only
  mode. No workflow or environment selects it.
- **Offline tooling:** `config.schema_settings` uses Django's unusable dummy
  database backend. It does not import runtime settings or read DATABASE_URL.
  Its public dummy secret is solely for deterministic offline checks, not a
  provisioned credential. Never use this module to serve requests. It is not a
  SQLite/database fallback.

Cookies are secure even in the pending development profile. A local HTTP exception
would require explicit approval, not automatic weakening based on DJANGO_ENV.
Current routing is `/` plus `/api` under the gateway. No CORS is added.
HTTPS, production cookie handling, proxy trust, and iframe behavior remain unverified.

The 12-hour cookie lifetime and 12-character minimum password are prepared defaults,
not verified product policy. Django session writes can reset relative expiry.
Phase 2B must implement/test an absolute deadline explicitly if that policy is
approved. Idle expiry, temporary-password lifetime, shared login throttling, and
Manager recovery still need decisions.

DRF's prepared stock SessionAuthentication may return 403 for anonymous requests.
Explicit anonymous-login CSRF protection, JSON CSRF failures, the agreed 401/403
adapter, throttling, and frontend CSRF submission belong to Phase 2B; they are NOT
provided by simply enabling these settings.

## Safe checks

From workspace root:

```sh
python -B artifacts/api-server/backend/manage.py check --settings=config.schema_settings
python -B artifacts/api-server/backend/manage.py makemigrations --check --dry-run --settings=config.schema_settings
python -B artifacts/api-server/backend/manage.py test accounts audit health config --settings=config.schema_settings --verbosity 2
ruff check artifacts/api-server/backend
```

All current tests are SimpleTestCase or unittest.TestCase; no Django TestCase or
TransactionTestCase asks the runner to create a database. Offline settings also
make a real connection impossible. Configuration subprocess tests only import
settings and do not connect. Do not use the offline profile for migrate/sqlmigrate.

## Approval and smallest activation sequence

1. Review both initial migrations, constraints, app list, schema ownership, and
   username/password/session policy. Do not change AUTH_USER_MODEL after first
   migrations have populated the schema.
2. Obtain explicit approval for an isolated PostgreSQL test database. Validate the
   migration graph/SQL, constraints, password expiry, persisted session revocation,
   transaction rollback, audit persistence, and concurrent last-Manager protection
   there. No such database has been created or modified here.
3. Obtain separate approval to remove only the connection's read-only option and
   apply reviewed migrations to the confirmed development target. Review its
   current schema again and arrange an appropriate backup before any application.
   Do not run migrations automatically in a startup command or via Drizzle.
4. Configure a stable secret through approved secret tooling, verify HTTPS/proxy
   settings, and select the session profile only after its schema exists and
   writes have been approved. Health endpoints must still pass.
5. Implement Phase 2B only after approval: CSRF/session endpoints, guarded account
   services, version bumps/audit transactions, Manager provisioning, and tests.
   Provisioning must be explicit, never a migration/startup side effect.
6. Production schema/deployment handling needs its own review; no production
   migration, deployment, or secure-cookie success is claimed.
