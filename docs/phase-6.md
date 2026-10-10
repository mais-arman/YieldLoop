# Phase 6 — Dashboard and reports

## Scope and date contract

Read-only operational reporting uses the existing authoritative Django/PostgreSQL
models, sessions, roles, corrections and inventory history. No new schema,
write API, export, reservation, consumption, optimization, AI or deployment.

**Date filters select jobs by `ProductionJob.created_at`.** All report metrics,
including inventory, use this same source-job cohort. They are current balances
for jobs created in the selected interval, NOT production activity in the
interval, inventory registrations in the interval or historical “as-of” balances.
Later corrections and current lifecycle/inventory states are reflected.
The filters do not select by job update time or snapshot time.

The explicit timezone selector supports UTC (default, not an inferred factory
timezone) and Asia/Jerusalem. Start and end are optional inclusive calendar dates:
`created_at >= local midnight(start)` and
`created_at < local midnight(end + 1 calendar day)`. This respects DST rather
than assuming every day has 24 hours. No dates means all creation dates; one
date means an open-ended range. Timestamps are server-persisted and non-null.
Invalid dates/order, unsupported zones/statuses, unexpected fields and page
values return explicit validation errors; no silent filter fallback.

All source jobs are filtered by current lifecycle status if supplied. Cancelled
data remains historical measured data for authorized readers; default “all”
includes it explicitly, not silently discarded. Operator visibility still
restricts the cohort to Open jobs before counts or aggregation.

## Metric dictionary

| Metric | Source and aggregation | Unit / availability |
|---|---|---|
| Job count and Draft/Open/Cancelled counts | Distinct permitted filtered `ProductionJob.id`, grouped by current `status` | Count; zero for empty cohort. Completed does not exist. |
| Measured jobs | Jobs with their latest persisted `Reconciliation` by highest `revision` | Count. |
| Unmeasured jobs | Job count minus measured jobs | Count. Missing snapshots are **not** presented as measured zero on job rows. |
| Actual issued | Sum of latest snapshot `issued` | kg, selected material only. |
| Good output | Sum of latest snapshot `good` | kg, selected material only. |
| Scrap | Sum of latest snapshot `scrap` | kg, selected material only. Never includes unexplained variance. |
| Recorded offcut output | Sum of latest snapshot `offcut` | kg, selected material only. Potential offcuts, not verified suitable/reusable stock. |
| Accounted | Sum of latest snapshot `accounted` = good + scrap + offcut | kg, selected material only. No fabricated rework or additional categories. |
| Unexplained variance | Sum of latest snapshot `variance` = issued − accounted | Signed kg; not waste classification or a tolerance decision. Net variance can cancel opposing discrepancies; per-job signed variances remain visible. |
| Yield rate | Sum(good) / sum(issued) × 100 | %, selected material only; NOT average of job rates. |
| Scrap rate | Sum(scrap) / sum(issued) × 100 | %, selected material only. |
| Offcut output rate | Sum(offcut) / sum(issued) × 100 | %, selected material only; NOT reuse rate. |
| Available registered lot count | `OffcutLot` whose source job is in cohort, with no `InventoryEvent(action=void)` | Count. Does not establish suitability or physical usability. |
| Voided lot count | Same cohort, with void event | Count; retained history, not disposed/consumed count. |
| Available original / remaining weight | Sum of immutable available lots' `source.quantity` | kg, selected material only. Foundation has no partial allocations, so values match. |
| Voided original weight | Sum of immutable voided lots' `source.quantity` | kg, selected material only; removed registrations, NOT consumption. |
| Voided remaining weight | Zero | kg, selected material only; does not imply physical disposal. |

Every metric uses the source-job creation-date and current-status filters above,
including inventory linked to those jobs. Snapshot, job and lot timestamps in
detail views provide provenance, not competing date filters.

### Material identity, corrections and unavailable values

Different material definitions are **never combined**, even if both use kg.
Without material selection, counts and per-job/per-lot detail are available,
but summary quantities/rates are null with `select_material`. Selecting a
material restricts jobs to that immutable material binding (latest reconciliation
material; the existing single-material rule means all revisions have that binding).
The read-only material selector uses the existing role-scoped catalog.

Only one latest reconciliation per job contributes. It already excludes voided
measurements and includes replacements, so historical snapshots and original
entries are never added again. All-zero latest snapshots remain “measured”.
An empty selected-material cohort has zero quantities and null rates; the empty
cohort is identified, not described as a production result.

Calculations use PostgreSQL exact Decimal aggregation. API quantities and rates
are decimal strings, three places; rates use 60-digit Decimal working precision,
ROUND_HALF_UP, and null for zero issued. Values above 100% and negative variance
are not clamped. There are no unknown-unit conversions or float totals in JS.

Inventory registration/voiding does not modify reconciliation. Original lot
weights remain history after void; they are not “available”. Source output
correction still requires explicit inventory void first. Cancelled source lots
retain their current register state and source status; no automatic disposal or
reuse approval is inferred.

## Permissions and consistency

Manager and Production Supervisor see all current-business permitted jobs/lots.
Cutting Operator sees Open source jobs/lots only. Counts, snapshot aggregation,
material lookup, pagination and lot history all respect that scope. A material
hidden from an Operator returns 404, not a leaked name or count. No tenant,
assignment or new role powers are introduced. Restricted-password and signed-out
accounts cannot access reporting. The API is GET only; no reporting writes.

`GET /api/v1/reports/overview` supports:

- `start_date`, `end_date`, `timezone`;
- `status` (draft/open/cancelled), `material_id`;
- `job_page`, `lot_page` (independent), `page_size` (1–100, default 20).

It returns filter metadata, generation timestamp, counts, nullable selected-
material totals, inventory states, and independently paginated jobs and lots.
Job rows include the latest snapshot ID/revision/time, material identity and
measurements, or null reconciliation. Existing authorized job/lot detail URLs
provide drill-downs.

Each response runs in a PostgreSQL **REPEATABLE READ, READ ONLY** transaction.
Summary, pages and state annotations use one consistent database snapshot without
blocking writers or permitting mutations. Latest snapshots for page rows are
retrieved in a bounded batch, not per-row queries. Different requests can reflect
later changes; explicit refresh, refetch-on-focus and generation time communicate
freshness. Pages can legitimately become out of range; the UI offers recovery.

## Verification and migration

No models or migrations added; migration drift reports **No changes detected**.
No development or production migration run. Existing database/write guards
unchanged. Tests use the established isolated PostgreSQL test target, not
production data.

Passed 65 PostgreSQL tests, including 11 new report tests, plus 30 offline tests:
empty/missing snapshots; zero denominators; exact and weighted rates; corrected
entries/latest revision only; distinct materials; inventory available/voided
counts and weights; negative variance; creation cohorts with later records;
UTC/Jerusalem boundaries and DST; pagination; invalid filters; all roles,
restricted accounts and hidden materials; bounded query count; and concurrent
measurement changes without mixed summary/detail snapshots.

Backend lint, migration-drift checks, workspace typecheck, frontend lint and build
passed. Existing non-fatal UI sourcemap and >500kB bundle-size warnings remain.

HTTPS browser verification passed English dashboard/material selection and
weighted totals; current available/voided inventory; filter-preserving report
links; source job/lot drill-downs; UTC/Jerusalem calendar filters; invalid ranges,
invalid-zone API errors and recovery; empty cohorts; injected one-time network
failure with retry; refresh and reload persistence; 26-job pagination (20 then
6 disjoint rows with stable totals); all three roles including Operator hidden
Draft data; zero-issued unavailable rates; Arabic RTL at 390px without page-level
overflow; health and logout. Raw filter validation codes discovered in this pass
were replaced by localized instructions and checked by typecheck/lint afterward.

Browser gaps: full keyboard sequence, skeleton timing, a second inventory page
and automated contrast audit were not exercised. DST boundaries and independent
inventory pagination are covered by backend tests. Navigation scrolls internally
on mobile. This does not claim complete accessibility or production certification.

Precisely tagged disposable QA accounts, fixtures and private temporary
credentials were removed; database counts returned to baseline. No existing
employee account, business record or shared peer throttle state was modified.

## Still undefined or unavailable

Production completion, factory tolerances/targets, rework, multi-material
allocation, other units/conversions, production occurrence dates, historical
as-of reports, geometric suitability, physical stock approval, reservation and
consumption accounting remain outside this phase. No synthetic historical values,
waste causes, reuse rates or performance targets are presented.
