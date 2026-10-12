# Current Preview implementation and acceptance — 2026-10-11

## Actual running app, not the loopback harness

The existing YieldLoop Preview now uses `config.demo_settings` through the API
package's **development-only** run script. The same application database cluster
is used with the dedicated schema **yieldloop_preview_demo**, with no public-schema
fallback. Original application tables/records are untouched. The existing database
write guard was not edited. Normal password hashing, session security and CSRF
protection are retained; this does not use the weak-hash testing settings.
Production still starts via the original run.sh; the demo profile refuses production
or deployment environments. No deployment or external recovery exercise occurred.

Initialize with:

```sh
DJANGO_SETTINGS_MODULE=config.demo_settings python -B artifacts/api-server/backend/manage.py seed_preview_demo
```

The initializer verifies database and cluster identity before writes, claims only
its own schema, migrates only that schema and uses existing guarded services/API
handlers for business data. API seeding uses Django's in-process client, not claims
of a browser walkthrough. Packaging is validated by the actual validator and
saved through the actual save handler. Browser acceptance independently uses the
network API through the real Preview. A completed seed marker prevents reruns from
overwriting edits or duplicating records. A second execution confirmed no changes.
Initial attempts were rejected for incomplete API payloads/session setup; the
transaction rolled back those attempts. Corrected payloads and actual login passed.

Private random demo credentials: `/tmp/yieldloop-preview-credentials.json`.
Usernames: `demo_manager`, `demo_production_supervisor`, `demo_cutting_operator`.
The workspace owner can read that file privately in Shell. Do not commit or publish
passwords. Existing non-demo logins belong to the preserved original schema, not
this demo. The credential file is temporary; do not reset/reseed business data if it
is lost—use supported account recovery with a verified demo target.

Seeded: IK-202/IK-203 on CT-2 with their original exact quantities; draft and
cancelled jobs; completed Kraft production; an Open receiving job; two materials;
three inventory lots and reserve/consume/release history; an editable cutting plan;
two saved concepts; all three roles. Dimensions live in cutting plans and packaging,
not fabricated kg-to-area conversions. Subsequent browser tests add labelled DEMO
records without modifying the reference cases.

## Packaging defects and fixes

- Import previously required only the versioned export envelope. It now also
  accepts the exact plain server design schema and a UTF-8 BOM, while still rejecting
  unknown versions/fields, malformed geometry and incompatible metadata.
- Invalid dimensions are rejected **before replacing the editor**. Server
  validation remains mandatory; invalid files never become saved concepts.
- Import now clears the previously opened saved ID after successful validation.
  Saving an imported file creates a new concept instead of overwriting the original.
- The UI offered an optional note, but the server/database require nonblank audit
  reasons. Blank notes now produce localized “Concept created”/“Concept updated”
  reasons; constraints and audit history were not weakened.
- JSONB key ordering made reopened records appear stale. A tested field comparison
  now ignores key order while detecting actual name/state/parameter edits.

No rejected original sample was attached to this request, and no incompatible
example file was identified in the workspace search. Its exact bytes/rejection
cause therefore cannot be claimed. No evidence file was arbitrarily deleted.
The **only supplied example** is the actual exported file which passed the complete
browser round trip: `generated-artifacts/preview-fix/verified-concept.json`.
462 bytes; SHA-256:
`ecdad3240fe48cbfbfec9f66e5dede21d8b3c223297c191156f04b63eab08f7f`.

It is a350×350×40 mm flat carton,3 mm board,35 mm separate lid,1 mm clearance.
It is labelled pizza-style, **not** represented as a hinged pizza-box dieline.
The actual supported geometry reports an external364×364×47 mm envelope.

## Real Preview browser results

Tested the existing Replit development URL, not port8099.
“Passed” below applies to the listed actions, not every possible operation.

|Role|Route|Status and scope|
|---|---|---|
|Manager|Dashboard|Passed: demo summary and navigation|
|Manager|Jobs/details|Passed: create Draft, edit existing DEMO note, refresh; IK cases unchanged|
|Manager|Inventory|Passed: view lot, reserve1, consume0.5, release1; receiving issue and matching output persisted|
|Manager|Reports/comparison|Passed: source rows and CT-2 comparison, correct original IK values|
|Manager|Cutting|Passed: open seed, generate separate two-piece layout, save, refresh, reopen|
|Manager|Packaging|Passed: exact export/import, server validation, blank-note save, refresh, reopen; malformed/version rejection|
|Manager|Employees/password|Passed: create helper, forced replacement, subsequent login, deactivate only helper|
|Manager|Arabic/English|Passed: Arabic labels/RTL sidebar, return to English|
|Supervisor|Dashboard/jobs/inventory/reports/comparison/cutting/packaging|Passed: permitted route/data access; Supervisor-specific writes were Not Tested in this browser pass|
|Supervisor|Employees|Passed: denied screen and authenticated API403|
|Operator|My Work/job recording|Passed: issue0.5 and matching Good0.5 on DEMO receiving helper|
|Operator|Inventory/cutting|Passed: permitted read views and disabled cutting edit controls|
|Operator|Reports/comparison/employees|Passed: direct-route access denied|
|Operator|Create job API|Passed: CSRF-authenticated request denied403 before validation|
|Operator|Packaging direct route|Passed: existing policy intentionally allows contextual access; primary navigation omits it|
|All|Live AI, production deployment/recovery, physical-device operation|Not Tested; not configured/authorized as part of this change|

No unresolved application failure was established after the fixes. The tester's
initial Operator Packaging “failure” was withdrawn after checking the explicit
existing policy; permissions were deliberately preserved.

After exact-file imports, Saved Concepts shows **four**, including two separate
round-trip records. Original#1 survived; imported#4 reopened with350×350×40 and
revision1. Final same-page CDP browser check against the actual HTTPS Preview
confirmed Export and Save are enabled immediately on reopen, without pressing
Validate. `generated-artifacts/preview-fix/reopened-in-preview.png` is the real
screen: rendered flat carton, saved#4, matching dimensions and no stale warning.
This separate Chromium used ANGLE/SwiftShader because the managed test browser
cannot create WebGL. This is genuine software rendering, not manufacturing approval.

Inventory final:7.5 kg remaining,2.5 reserved,5 available. Receiving job has3 kg
issued/accounted, zero variance. Completed source is unchanged at100 issued,
85 Good,5 Scrap,10 Offcut, zero variance. IK-202 and IK-203 remain75%/20% and82%/10%.

Expected log events: signed-out401, forbidden403, deliberately invalid400, and
managed-browser WebGL errors. No uncaught route-rendering defect was observed.

## Automated commands and results

```sh
DJANGO_SETTINGS_MODULE=config.test_settings python -B artifacts/api-server/backend/verify_pilot.py \
  accounts.test_flows jobs.tests jobs.test_core materials.tests materials.test_integrated \
  inventory.tests reports.tests reports.test_acceptance cutting.tests assistance.tests
python -B artifacts/api-server/backend/manage.py test accounts.tests audit.tests health \
  config.tests config.test_request_limits config.test_demo_profile --settings=config.schema_settings
pnpm --filter @workspace/yieldloop exec tsx --test 'src/lib/*.test.ts'
pnpm --filter @workspace/yieldloop run typecheck
pnpm --filter @workspace/yieldloop run lint
ruff check artifacts/api-server/backend
(cd artifacts/yieldloop && PORT=5173 BASE_PATH=/ pnpm build)
```

Results: **124 PostgreSQL +36 offline +40 frontend =200 tests passed**. No failures
or skips in these final passing suites. Three new offline profile checks prove
development isolation/strong authentication and rejection of production/deployment.
Final frontend tests include plain/envelope/BOM imports, invalid dimensions and
JSONB key-order regression. Relevant frontend checks were rerun after the final
functional change; backend checks remain valid because backend code did not change.
An initial TypeScript indexing error and test-file lint warnings were corrected.
Build passed with the existing nonfatal sourcemap/large-chunk warnings.
Recovery-checker tests were not rerun and are not included in this200 count.

## Factory-facing copy and internal limitations

Removed duplicate packaging warnings and the incorrect “not saved” statement;
shortened EN/AR leads, balance text, inventory suitability notices and cutting
warnings. Kept status, audit, provenance, permission errors and numeric validation.

Internal constraints: packaging has no validated dieline, tolerances, hinges or
machine program. Cutting verifies rectangle boundaries/margins/kerf/overlap, not
grain/defects/guillotine feasibility. Stock ledger movements do not establish
physical material suitability. Weight reconciliation and geometric utilization
are separate metrics. These limitations do not need repeated paragraphs on each
factory screen.

## Cleanup / restore original development view

Do not delete demo records individually by loose prefixes. Stop the demo API first;
an authorized maintainer must verify the development cluster and exact demo schema
before removing only `yieldloop_preview_demo` and its private credentials.
That irreversibly deletes the demo, not the original public-schema records.
To restore the original development view without deletion, use the original
development run command (`sh ./run.sh`) with the original session settings.
Production and external recovery gates remain **NOT READY**, unchanged.
