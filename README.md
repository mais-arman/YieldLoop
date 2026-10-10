# YieldLoop — Phase 1 foundation

Phase 2A adds **inactive authentication schema and reviewable migrations**.
The running service remains the Phase 1 health API; no migrations were applied.
See [Phase 2A review and activation gates](docs/phase-2a.md) before changing the
schema or enabling authentication. The Phase 1 record below describes the runtime.

This is a runnable foundation, not an operational manufacturing application.
No authentication flows, business models, or factory records are enabled.

## Structure

- `artifacts/yieldloop`: React/TypeScript/Vite frontend, Tailwind/shadcn controls,
  English and Arabic text, LTR/RTL layout, live status and retry.
- `artifacts/api-server/backend/config`: Django settings, routes, WSGI and settings tests.
- `artifacts/api-server/backend/health`: DRF liveness/readiness views and focused tests.
- `artifacts/api-server/run.sh`: Gunicorn startup using the assigned `PORT`.
- `lib/api-spec`: OpenAPI contract; generated client and schemas in sibling packages.
- `infra`, `compose.yaml`: optional Docker-compatible configuration.
- `pyproject.toml`, `uv.lock`: Python constraints and resolved dependencies.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`: existing JavaScript workspace and lockfile.

The original Express `artifacts/api-server/src` and Drizzle `lib/db` starter code
are preserved but unused by YieldLoop. Do not use their schema push commands.
The preexisting component sandbox is unchanged.

## Environment differences from the conversation audit

The new project supplied Node 24.13.0, pnpm 10.26.1, a Git repository, Express
starter, shared API generation, and a PostgreSQL 16.10 database. The earlier
conversation sandbox had none of that application setup. Python 3.12.12 was
installed for this project rather than using the conversation's Python 3.14.
Resolved versions include Django 5.2.18, DRF 3.16.1, psycopg 3.3.6, Gunicorn 25.3.0.
The user-provided skills remain accessible under
`.local/conversation-workspace/files/.local/custom_skills/`.

## Configuration

Use Replit's provisioned `DATABASE_URL`; never print or commit it. No external
database provisioning was needed here. Elsewhere, supply a PostgreSQL database
and its URL through your environment/secret manager. `.env.example` is
documentation only: the application does not automatically load `.env` files.

Development defaults: `DJANGO_ENV=development`, debug disabled, explicit local
and Replit development hosts, and an ephemeral random Django signing key if no
key is configured. There are no signed sessions or authentication in Phase 1.
Missing database configuration permits liveness but readiness returns 503.
Non-PostgreSQL and malformed URLs fail safely; there is no SQLite fallback.

Production (`DJANGO_ENV=production`) requires:

- `DJANGO_SECRET_KEY` of at least 50 random characters, supplied as a secret.
- Explicit `DJANGO_ALLOWED_HOSTS` (comma separated, no wildcard).
- `DATABASE_URL` with `sslmode=verify-full` or `verify-ca` and any required CA
  certificate configuration from your database provider.
- HTTPS termination. Set `DJANGO_TRUST_PROXY=1` only when a trusted ingress
  strips client-supplied forwarded protocol headers and sets its own.

Production uses HTTPS redirection and HSTS; verify the actual ingress before
publishing. Production credentials, TLS, and hosting have NOT been verified.
Do not use a `VITE_` variable for any secret.

## Install and run

Python 3.12, uv, Node 24 and pnpm 10.26.1 are required:

```sh
pnpm install --frozen-lockfile
uv sync --frozen
```

In Replit, start the existing workflows:

- `artifacts/api-server: API Server`
- `artifacts/yieldloop: web`

The shared router sends `/api` to Django and `/` to Vite. Do not add a second
Express service or a Vite proxy in Replit. Workflows supply the ports.

For manual execution outside Replit:

```sh
PORT=8080 sh artifacts/api-server/run.sh
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/yieldloop run dev
```

These commands start separate processes; an external reverse proxy must route
`/api` to port 8080 and the rest to port 5173 for same-origin browser requests.
There is no CORS workaround or hardcoded browser localhost URL.

## API contract

| Endpoint | Meaning | Result |
|---|---|---|
| `GET /api/healthz` | Process liveness, no database access | 200 `{"status":"ok"}` |
| `GET /api/v1/health/ready` | Executes a real PostgreSQL `SELECT 1` | 200 `{"status":"ready","database":"connected"}` |
| Same readiness endpoint on failure | Unconfigured/unavailable DB | 503 `{"status":"unavailable","database":"unavailable"}` |

Responses are not cached. Connection and statement timeouts are 3 seconds.
Database exception details are not returned or logged. Connectivity does not
claim schema readiness, write permissions, or production readiness. Phase 1
connections explicitly request read-only transactions.

## Verification commands

```sh
uv run --frozen python artifacts/api-server/backend/manage.py check
uv run --frozen python artifacts/api-server/backend/manage.py test health config --verbosity 2
uv run --frozen ruff check artifacts/api-server/backend
pnpm --filter @workspace/api-spec run codegen
pnpm run typecheck
pnpm --filter @workspace/yieldloop run lint
PORT=22517 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/yieldloop run build
curl --fail-with-body http://localhost:80/api/healthz
curl --fail-with-body http://localhost:80/api/v1/health/ready
```

The Django test suite does not create a test database or run migrations.
Mocked failures are confined to tests. The running readiness endpoint is real.

## Docker validation boundaries

The following static checks validate configuration and Dockerfile instructions:

```sh
docker compose config --no-interpolate --quiet
docker build --check -f infra/backend.Dockerfile .
docker build --check -f infra/frontend.Dockerfile .
```

These are not image builds or container runtime tests. Docker deployment has
NOT been verified. The optional Compose setup describes HTTP-only local access
on `127.0.0.1:8081`, with externally supplied `DATABASE_URL`; it is deliberately
not a production TLS deployment. Do not treat it as production-ready.

## Next phase and migrations

Stop for user review before authentication or organization/business models.
First agree the identity, membership and authorization model, then create and
review Django migrations and their SQL before applying approved development
schema changes. Remove Phase 1's connection read-only setting only in that
approved phase. Confirm the separate production migration process with the
chosen hosting/database provider; never run migrations implicitly at startup.
The post-merge setup installs locked dependencies only and performs no schema push.

## Phase 1 verification record

- Django system check: passed, no issues.
- Backend suite: 14 tests passed; unused database setup skipped, no migrations.
- Ruff backend lint: passed after correcting three initial lint findings.
- Shared API code generation and workspace TypeScript checks: passed.
- Frontend ESLint: passed; unmodified shadcn UI and toast-hook scaffolds excluded.
- Vite production build: passed. It emitted a non-fatal sourcemap warning for
  the scaffold's tooltip component.
- Running proxied API requests: both endpoints returned HTTP 200 with expected
  payloads. A separate read-only database query confirmed PostgreSQL 16.10.
- Browser preview: rendered both successful checks using actual backend responses;
  browser console showed no application errors.
- Compose configuration and both Dockerfile static checks: passed, no Dockerfile
  warnings. Images were not built and containers were not run.
- Git whitespace check and shell startup-script syntax checks: passed.
- Targeted credential/file-pattern inspection: no credential candidates found.
  SQLite appears only in a rejection test, not application configuration.
- Arabic switching, retry interactions, and rendered failure states were inspected
  in code but not exercised through an automated browser interaction suite.
