# Phase 3 — Production Jobs

## Scope and lifecycle

One business, existing three roles, same React/DRF/PostgreSQL stack and Django
session/CSRF protection. No new authentication or tenant system.

Jobs have a server-generated unique `YL-` number, title (1–200 nonblank characters),
optional notes (up to 5,000 characters), status, server-derived creator, creation
and update timestamps, and an optimistic-lock revision starting at 1.
Numbers and creators are immutable through the API.

- Creation always produces **Draft**.
- Draft → **Open / In progress**.
- Draft or Open → **Cancelled**, Manager only.
- Cancelled is terminal and read-only; no reopen or delete API.
- **Completed is deliberately excluded.** Completion must later enforce material
  reconciliation; Phase 3 has no material data and cannot validate that rule.

No quantities, yield/scrap, dashboard, reporting, optimization, or AI functionality.

## Actual permission policy

The source of truth is `backend/jobs/policy.py`; services use it for mutations and
serializers return the same capabilities to the UI.

| Action | Manager | Production Supervisor | Cutting Operator |
|---|---|---|---|
| List/detail | All jobs | All jobs | Open jobs only |
| Create Draft | Yes | No | No |
| Edit title | Draft/Open | No | No |
| Edit notes | Draft/Open | Open only | No |
| Open Draft | Yes | Yes | No |
| Cancel Draft/Open | Yes | No | No |
| Edit Cancelled | No | No | No |

Operator permission is **all Open jobs within this single business**, not an
assignment subsystem. Hidden records return 404; filtering, counts, search and
pagination are scoped before evaluation. No client-supplied role or creator is
accepted. Password-restricted accounts cannot access jobs.

## API and consistency

- `GET /api/v1/jobs?page=1&page_size=20&search=...&status=draft`
  - Search matches job number, title, or notes; case-insensitive and max 120 chars.
  - Page size 1–100, default 20. Ordered by creation time and ID descending.
  - Envelope: count, page, page_size, total_pages, results.
  - Empty collections have page 1 of 1; out-of-range pages return 404.
- `POST /api/v1/jobs`: title and optional notes; returns 201.
- `GET /api/v1/jobs/{id}`.
- `PATCH /api/v1/jobs/{id}`: required revision, plus title, notes and/or status.

Every write requires CSRF and runs within a transaction. The established account
lock is acquired before re-reading the active actor/session, preventing role or
activation changes from racing a mutation. The job row is then locked and its
revision checked. Stale edits return 409 `stale_revision`, never last-writer-wins.
No-op text updates do not increment revision. Empty notes explicitly clear notes.

Validation returns 400 `validation_error` with field **codes**, never submitted
values. Lifecycle failures return 400 `invalid_transition`; terminal changes
409 `job_closed`; disallowed actions 403; missing/hidden jobs 404.

Job changes and typed `JobEvent` snapshots commit together or roll back together.
Events contain actor, time, correlation UUID, job/revision and old/new
title/notes/status; no arbitrary request body. Events are append-only through the
ORM, like the existing account audit model. Privileged direct SQL is not prevented
by ORM protections. Job events are not exposed through a new audit UI in this phase.

The common account lock intentionally serializes job writes with account changes.
This favors correct revocation over throughput for the current single-business
scope; revisit only with a measured need and equivalent concurrency guarantees.

## Frontend

`/jobs`, `/jobs/new` (Manager only), and `/jobs/:id`, linked from the existing
authenticated shell. Real search, status filtering, pagination, create, edit,
detail and status confirmations; English/Arabic, RTL/LTR and responsive layouts.
The server supplies per-record editable fields and permitted transitions.

Successful mutations update detail and invalidate lists. Queries refresh on
mount/window focus. Dirty forms keep their original revision during background
refreshes. Stale conflicts preserve edits and offer explicit reload; transitions
require saving or discarding edits first. Cancellation warns that it is permanent.

## Database target and migration

On 2026-10-10 the platform development query and guarded Django connection both
reported `heliumdb`, PostgreSQL cluster `7694975907574124564`.
The existing connection write guard was **not modified or weakened**.

Explicitly applied `jobs.0001_initial` to that development database: ProductionJob,
JobEvent, indexes, uniqueness and check constraints. No existing business records
were modified and no production connection was migrated. Startup does not migrate.

Integration tests use the existing isolated `test_yieldloop_phase2b` database:
the historical name is retained rather than widening or changing the write guard.

## Verification commands

Keep the PostgreSQL and offline suites separate. The offline suite intentionally
asserts a dummy database engine and the original health-only URL configuration.

```sh
python -B artifacts/api-server/backend/manage.py test jobs accounts.test_flows \
  --settings=config.test_settings --keepdb --noinput
python -B artifacts/api-server/backend/manage.py test accounts.tests audit.tests health config.tests \
  --settings=config.schema_settings
ruff check artifacts/api-server/backend
python -B artifacts/api-server/backend/manage.py makemigrations --check --dry-run \
  --settings=config.schema_settings
pnpm run typecheck
pnpm --filter @workspace/yieldloop run lint
PORT=22517 BASE_PATH=/ pnpm --filter @workspace/yieldloop run build
```

Passed: 16 new jobs integration tests, 10 authentication integration tests and
30 existing database-free checks; backend lint and migration drift; workspace
typecheck, frontend lint/build. Existing UI sourcemap warnings remain non-fatal.

Coverage includes DB constraints and reload persistence, all roles, spoofed fields,
CSRF/restricted accounts, terminal/invalid transitions, pagination/search/filtering,
stale revisions, real concurrent updates, atomic audit rollback and append-only
audit behavior. See the final delivery report for browser-verification results.

HTTPS browser verification passed: first login after rejection, Manager creation/
edit/reload/search/filter/pagination, Supervisor open-and-notes operations, Operator
scope and rejected writes, concurrent-writer conflict recovery, cancellation/
read-only persistence, Arabic mobile and English desktop, health, logout/reload.
The test's three disposable accounts, 22 tracked jobs and related audit/throttle
records were cleaned up without touching preexisting data or shared peer counters.
A minor mobile header-width issue was addressed by allowing wrapping; job
confirmations now unmount immediately on success rather than retaining an exit
animation. These final UI-only adjustments were checked by typecheck/lint/build,
not a second full browser run.

No default credentials or real Manager were provisioned. First-Manager setup remains
the explicit trusted procedure in Phase 2B. No deployment or production readiness
claim is made.
