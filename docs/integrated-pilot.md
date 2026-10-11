# Integrated pilot implementation — 2026-10-11

## Scope and readiness

Implemented on the existing Django/DRF/PostgreSQL and React/Vite stack, without
new dependencies, production access, deployment, write-guard changes or demo seeding.
**NOT READY for production.** Local feature verification is not recovery evidence.
The earlier current-application inventory describes the pre-implementation snapshot.

## Accounting and policy

- Reports and Comparison APIs now require Supervisor or Manager, including direct
  URL/API requests with known, nonexistent, closed or cancelled job IDs. Operators'
  My Work no longer calls the restricted reporting endpoint.
- Existing job scope/lifecycle, employee/catalogue administration, session/CSRF,
  temporary password and account-revocation protections remain.
- Operators can register offcuts from authorized Open jobs. Reserve/release/consume
  require Supervisor or Manager. Cutting edit permissions have not been expanded.
- Public liveness remains process-only; readiness exposes only status/connectivity,
  not credentials, connection parameters, database names or exceptions.
- `rework` is an immutable material disposition. Accounted =
  good + scrap + offcut + **pending rework**. Variance remains issued minus accounted.
- An output can reference `resolve_rework_id`; good or reasoned scrap reduces that
  source's pending quantity. Partial resolution supported; no over-resolution.
  Voiding an output restores pending. Source rework cannot be voided with active
  resolutions. Existing actor/time/note/reason/revision history remains immutable.
- Closure requires zero variance, no pending rework, existing positive issue/good
  and machine requirements. Missing issue produces null rates. Reports aggregate
  compatible material quantities and use weighted rates, not averages.
- Rework is displayed in job summaries/entries, reports, comparison, dashboard
  output chart and evidence. It is not added to good or scrap until resolved.

## Inventory ledger

`StockMovement` records positive decimal kg, action, destination, actor, timestamp,
reason, request UUID and linked receiving issue for consumption. All stock writes
use atomic transactions, stable job lock order and a locked lot; existing account
authorization locking is retained.

- Remaining = original − consumed; reserved = reserves − releases − consumes;
  available to reserve = remaining − reserved.
- Reserve/consume require a different Open receiving job and matching existing
  material identity/unit, or use the lot material for its first issue.
- Consume atomically creates the destination material issue and new reconciliation.
  If either stock/audit/accounting fails, the entire transaction rolls back.
- Release can clear a reservation after destination closure/cancellation.
- Revision/UUID checks reject stale or duplicate operations. Negative, excessive,
  too-precise, incompatible and unauthorized movements are rejected.
- A lot with movements cannot be ordinarily voided. An issue created by consumption
  cannot be voided independently and thereby silently restore or lose stock.
- **Limit:** no exceptional consumed-stock reversal workflow was added. Incorrect
  consumption cannot currently be reversed through the UI; ordinary correction is
  deliberately blocked rather than erasing provenance. This needs an explicitly
  designed linked accounting reversal before such corrections are supported.

Detail includes original/remaining/reserved/available, outstanding reservations and
paginated movement history. “Recorded, not physically verified” is not a guarantee
of quality, grain, fit, actual presence or suitability.

## Packaging and AI

Four parametric concepts: tray, sleeve, separate-lid carton and flat box. Parameters
are explicit internal millimetres; flat-box height cannot exceed its base dimensions.
Current locally valid parameters drive the live preview; invalid input pauses it
with localized errors. Server validation remains mandatory before save/export.
Saved concepts and immutable revisions support reopen/history and JSON parameter
export. They are **not manufacturing-validated dielines** and do not transfer to
cutting, inventory or kg records.

Unavailable AI entry points remain hidden. Non-AI evidence remains available.
Provider responses, missing configuration, malformed/oversized output, transport
failure and timeout have mocked tests. No real provider call or paid key was used.
Evidence now describes offcut physical suitability as unverified, not universally
non-consumable. No recorded category is represented as a proven root cause.

## Migrations and preservation evidence

Necessary migrations:

- `materials/0003_reworkresolution_and_more`: rework kind/links, pending quantity
  default zero, nonnegative pending and updated accounted-sum CHECK.
- `inventory/0002_stockmovement`: immutable movement ledger and positive/action/
  reason/consumption-issue CHECKs.
- `cutting/0002_packagingdesign_packagingrevision_and_more`: concepts and revisions.

Generated with the offline `config.schema_settings` profile; Django check passed.
Applied through `call_command('migrate', interactive=False)` only after asserting
development mode, no deployment flag, and actual PostgreSQL identities:

- test: `test_yieldloop_phase2b`, cluster `7694975907574124564`;
- development: `heliumdb`, same cluster.

Development migration wrapper compared ordered-row SHA-256 fingerprints for all
11 existing manufacturing/history tables before/after, excluding only the newly
added zero-default field. **All matched.** No historical entry/snapshot was rewritten.
Migrations are not automatically executed by startup. Do not reverse them after
new ledger data exists without a separately reviewed preservation procedure.

Current retained cases:

|Case|Machine|Issued|Good|Scrap|Offcut|Pending|Variance|Yield|Scrap rate|
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
|IK-202|CT-2|1200|900|240|60|0|0|75%|20%|
|IK-203|CT-2|1000|820|100|80|0|0|82%|10%|

IK-202 reason split remains Setup/layout180 and Damaged material60.
IK-203's reason remains unspecified. Left IK-202/right IK-203 gives scrap +10
and yield −7 percentage points. Existing cases were neither overwritten nor duplicated.

## Reproducible checks and actual outcomes

`verify_pilot.py` asserts the exact test target and creates a fresh PostgreSQL schema
for each database test, running migrations there. It never creates/drops/resets/
truncates a database or flushes records. Schemas are **retained** as isolated test
evidence. Schema search paths also apply to concurrency-worker connections.
This is not a production runner. An unset/wrong settings profile fails closed.

```sh
DJANGO_SETTINGS_MODULE=config.test_settings python -B artifacts/api-server/backend/verify_pilot.py \
  accounts.test_flows jobs.tests jobs.test_core materials.tests materials.test_integrated \
  inventory.tests reports.tests reports.test_acceptance cutting.tests assistance.tests
```

Initial integrated regression: **121 run, 110 passed, 11 failed**. Failures included
superseded policy/schema expectations, one incorrect expected void HTTP status,
and an actual inventory-query-count regression. Existing restrictive tests were
updated to assert the newly approved role/accounting behavior, not deleted.
Inventory prefetching fixed query growth; the original `<30` query assertion remains.

Corrected affected-module run:

```sh
DJANGO_SETTINGS_MODULE=config.test_settings python -B artifacts/api-server/backend/verify_pilot.py \
  jobs.test_core.CoreTests.test_comparison_sources_categories_and_permissions \
  materials.tests materials.test_integrated inventory.tests reports.tests reports.test_acceptance \
  assistance.tests.PackagingValidationTests assistance.tests.ProviderTests
```

**58 run, 57 passed, 1 failed**: a second old comparison assertion still expected
404 instead of the now-required blanket Operator403. Fixed and confirmed next.

Final expanded focused run:

```sh
DJANGO_SETTINGS_MODULE=config.test_settings python -B artifacts/api-server/backend/verify_pilot.py \
  materials.test_integrated jobs.test_core.CoreTests.test_comparison_sources_categories_and_permissions assistance.tests
```

**34 run, 32 passed, 2 failed**: newly added closure assertions expected409 instead
of the existing domain-validation400. Corrected to assert both400 and exact
`rework_pending` error; final targeted rerun of these two rework tests **2/2 passed**.
All encountered failures now have passing replacement checks; this is staged
verification, not a claim of one final full-suite green run.

Additional checks:

```sh
python -B artifacts/api-server/backend/manage.py test \
  accounts.tests audit.tests health config.tests config.test_request_limits --settings=config.schema_settings
python -B artifacts/api-server/backend/manage.py makemigrations --check --dry-run --settings=config.schema_settings
ruff check artifacts/api-server/backend
pnpm --filter @workspace/yieldloop exec tsx --test 'src/lib/*.test.ts'
pnpm --filter @workspace/yieldloop run typecheck
pnpm --filter @workspace/yieldloop run lint
# From artifacts/yieldloop:
PORT=5173 BASE_PATH=/ pnpm build
```

Results: **33 offline tests passed; 39 frontend tests passed; no migration drift;
backend lint, TypeScript, frontend lint and production build passed.** Existing
bundle-size warnings remain. No dependencies were added. Concurrency checks
confirmed only one competing reservation wins and stock cannot be overspent.

A final lock-safety adjustment reloads lot annotations/prefetched movements after
acquiring locks before voiding, preventing use of a pre-lock ledger snapshot.
Three relevant inventory invalid-operation/void/concurrency regression tests passed
after that adjustment. The API workflow was restarted with the final change.

## Real isolated-browser verification

`python -B artifacts/api-server/backend/acceptance_browser.py` served the built SPA
and real Django API on localhost:8099 with random temporary accounts in the test
database. No application or production records were used for writes.

Passed:

- Issue100/good70/rework30; resolve10 good and20 scrap with reason; variance0,
  pending0. Void scrap resolution restores pending20 and blocks closure.
- Register offcut8; reserve6/consume2/release1 → remaining6/reserved3/available3;
  linked receiving issue2 survives reload; movement history visible.
- Operator Reports/Comparison/Employees APIs return403; routes show denied state.
- Flat-box validation, saved concept reopen, revision2/history, parsed JSON export.
- Arabic RTL at390px for rework dialog, inventory movements and packaging controls.

**Live geometry redraw remains visually UNVERIFIED.** Standard test Chromium had
WebGL disabled. A focused ANGLE/SwiftShader browser started with WebGL available and
valid local preview state, but capture tooling could not obtain reliable composited
before/after canvas images. Uniform offscreen buffers are not evidence of a rendering
failure or success. Physical devices, real touch hardware and real AI were not tested.

Test schemas and browser fixtures remain only in the isolated test database;
no database reset was used for cleanup. Private credential file is removed when the
harness stops; accounts are not production credentials.

## Production release gates — unchanged and BLOCKED

Follow `docs/staging-recovery-runbook.md` and `docs/phase-8-acceptance.md`.

1. **Independent/offsite backups:** owner supplies timestamped backup inventory,
   retention/encryption/access evidence and a successful independent retrieval.
2. **Cluster-loss recovery:** named DBA/recovery owner conducts an authorized,
   timed exercise into a separate non-production environment without relying on
   the original cluster; retain sanitized commands, logs and integrity results.
3. **Roles/grants/ownership:** restore the approved baseline and demonstrate both
   allowed and denied actions as each actual role; no-owner/no-acl restore is not proof.
4. **RPO/RTO:** business owner approves numerical targets; record backup age,
   recovered transaction cutoff, start/end timings and observed loss/downtime.
5. **Staging/production configuration:** separately review least privilege,
   environment separation, secrets delivery, TLS/session/CSRF, backup monitoring,
   rollback and recovery ownership. Production write approval remains separate.

No target, owner approval, backup receipt, role restore or external exercise was
invented. None of these gates can be satisfied by this coding pass alone.
