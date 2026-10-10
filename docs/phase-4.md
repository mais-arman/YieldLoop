# Phase 4 — Material recording and reconciliation

## Scope and unresolved policy

This is a conservative **single material per job, kilograms only** foundation.
The existing reference examples define weight accounting, not mixed-material
allocation or conversions. The first record must be an actual issue and pins
the material definition for the job permanently, including after all records
are voided. Additional issues of that same material are allowed.

Good output, scrap and reusable offcuts are separate mutually classified actual
measurements. No planned quantity is reused as an actual measurement. Rework is
unavailable: its treatment and potential double counting have not been defined.
Different materials cannot be combined merely because both use kg.

Unresolved factory decisions: rework disposition, multi-material attribution,
other units/conversions, tolerance/approval/completion rules, operator write
authority and assignment, and changing an already-bound material. A mistaken
material binding currently requires cancelling the job and creating the correct
one; the system does not rewrite history. No completion or finalization exists.
No offcut inventory, reuse transactions, exports, dashboards or cutting features.

## Precision and calculation policy

- Quantity: Decimal(15,3), positive, from 0.001 through 999999999999.999 kg.
- API quantities are **decimal strings**, not JSON floating-point numbers.
- Totals: Decimal(24,3), exact; no automatic rounding of entered quantities.
- Accounted = good + scrap + reusable offcuts.
- Variance = actual issued − accounted.
- Yield (%) = good / actual issued × 100.
- Scrap (%) = scrap / actual issued × 100.
- Rates use Decimal arithmetic, HALF_UP to three decimal places; denominator
  zero returns null, never NaN/Infinity.
- Positive or negative variance stays visible and is never converted to scrap.
  Over-accounting may produce rates above 100%; these are not clamped.
- A zero variance means an arithmetic match only, not approval or completion.

Each successful record/void atomically persists the inputs and a reconciliation
snapshot. Snapshot totals derive from all active records, not the current UI
page. Immutable entry references and the ordered revision actions reconstruct
which inputs were active for each historical calculation.

## Roles and corrections

| Action | Manager | Supervisor | Operator |
|---|---|---|---|
| Create immutable material definition | Yes | No | No |
| Read job records | All jobs | All jobs | Open jobs only |
| Add issue/output to Open job | Yes | Yes | No |
| Void incorrect Open-job record with reason | Yes | Yes | No |
| Write Draft/Cancelled records | No | No | No |

Material definitions are immutable name/specification/kg records; new definitions
are created instead of changing historical meaning. Case-insensitive duplicate
name/specification is rejected. Operators' catalogue is restricted to definitions
used on permitted Open jobs. No client-supplied actor or calculated result is
accepted. Existing session/CSRF/password-restriction protections are unchanged.

Correction means **void original with mandatory reason, then add a replacement**.
The original quantity, actor and time are retained, as are void reason/actor/time.
There is no delete, overwrite or finalized-record editing endpoint.

Every mutation acquires the existing account lock, revalidates the actor/session,
locks the job, then checks both job and material revisions. This serializes with
job cancellation and account revocation. Concurrent/stale requests return 409.
Client UUID uniqueness per job prevents duplicate retry records. Identical
measurements with distinct UUIDs are not inherently duplicates: repeated issues
and output measurements can be legitimate.

Reconciliation snapshots double as append-only typed audit events, identifying
actor, changed entry, action, time and revision. Material definitions themselves
retain creator/time. ORM immutability is not protection against privileged SQL.
Read responses lock the job to keep snapshot totals and record pages consistent.

## API and database

- GET/POST `/api/v1/materials`: paginated/searchable definitions, Manager create.
- GET `/api/v1/jobs/{id}/materials`: persisted snapshot plus paginated entries.
- POST `/api/v1/jobs/{id}/materials/entries`: add an actual measurement.
- POST `/api/v1/jobs/{id}/materials/entries/{entryId}/void`: reasoned correction.
- OpenAPI and generated TypeScript contracts updated; frontend uses the existing
  CSRF/session request wrapper.

Applied only `materials.0001_initial` to **development heliumdb**, cluster
`7694975907574124564`, after matching the platform query to the guarded Django
connection. Existing database-target/write guard unchanged. No production access,
startup migration, authentication change or package installation.

## Verification

Passed 45 isolated PostgreSQL tests (19 new accounting/material tests and 26
existing job/authentication tests), plus 30 existing offline checks.
Coverage: exact decimal/reference arithmetic, zero denominator, mixed units,
material mismatch, precision bounds, unauthorized categories, role scope,
cross-job references, spoofed fields, immutable audit records, CSRF/restricted
accounts, pagination, retries, stale revisions, simultaneous writers and
transaction rollback.

Workspace typecheck, frontend lint/build, backend lint and migration-drift checks
passed. The build retains existing non-fatal UI sourcemap warnings and now reports
a main-bundle size warning (approximately 530 kB before gzip).

HTTPS browser verification passed using disposable accounts for all three roles:
first login after rejection, job create/open, material-definition creation,
reference quantities and reload persistence, invalid quantities, mandatory-reason
void and replacement, Supervisor recording/voiding, Operator read-only and hidden
job scope, stale-form 409 with preserved inputs, cancellation while recording,
Arabic RTL at 390×844, English desktop, logout and both health endpoints.
No document-level mobile overflow was observed; navigation scrolls internally.
Browser pagination was not repeated; pagination is covered by backend tests.
All tracked QA accounts, jobs, materials and related records were removed after
verification, along with temporary credentials; existing records and shared peer
throttle counters were not removed. No default account was created.

Commands:

```sh
python -B artifacts/api-server/backend/manage.py test materials jobs accounts.test_flows --settings=config.test_settings --keepdb --noinput
python -B artifacts/api-server/backend/manage.py test accounts.tests audit.tests health config.tests --settings=config.schema_settings
ruff check artifacts/api-server/backend
python -B artifacts/api-server/backend/manage.py makemigrations --check --dry-run --settings=config.schema_settings
pnpm run typecheck
pnpm --filter @workspace/yieldloop run lint
PORT=22517 BASE_PATH=/ pnpm --filter @workspace/yieldloop run build
```
