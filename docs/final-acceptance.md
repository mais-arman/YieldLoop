# Final completion and acceptance — 2026-10-11

## Decision

**Functional production-material MVP/demo: PASS for the supported workflows
verified below. Full visual verification: incomplete for live 3D packaging.
Production release: NOT READY.**

This is a final full automated run, replacing the staged-run limitation in
`integrated-pilot.md`. It is not approval for production access, consumption,
deployment or a change to the write guard. No application defect requiring a
business-logic or visual redesign change was established.

## Implemented change and safety

The browser acceptance harness previously required an empty shared test schema.
It now positively verifies the test database/cluster and creates a fresh isolated
schema using the existing non-destructive test-isolation helper before migration
and temporary-account creation. This makes repeat acceptance possible without
resetting or overwriting earlier fixtures.

No database was dropped/reset/truncated/reseeded. Existing application records
were not modified. Production was not accessed. No dependencies, credentials,
permissions or application write guards were changed. New test schemas and
fixtures remain isolated and retained. The loopback harness was stopped and its
temporary credential file removed after verification.

## Final automated commands and results

All commands below ran after the final executable-code change. No application
code was changed during or after the browser walkthrough.

```sh
DJANGO_SETTINGS_MODULE=config.test_settings python -B artifacts/api-server/backend/verify_pilot.py \
  accounts.test_flows jobs.tests jobs.test_core materials.tests materials.test_integrated \
  inventory.tests reports.tests reports.test_acceptance cutting.tests assistance.tests
```

**124 passed, 0 failed/errors, 0 skipped**, in 265.133 seconds. This was one full
PostgreSQL application test run, not a union of earlier partial results. Covers
auth/session/CSRF/revocation/throttling, role/API restrictions, jobs, accounting,
rework/corrections, inventory/concurrency, reports/comparison, cutting and AI/
packaging. Retained test-schema prefix: `ylpilot_39fc101016f7` (105 schemas).

```sh
python -B artifacts/api-server/backend/manage.py test \
  accounts.tests audit.tests health config.tests config.test_request_limits \
  --settings=config.schema_settings
PYTHONPATH=artifacts/api-server/backend python -m unittest test_recovery_semantics -v
pnpm --filter @workspace/yieldloop exec tsx --test 'src/lib/*.test.ts'
```

|Suite|Passed|Failed/errors|Skipped|
|---|---:|---:|---:|
|Offline Django checks|33|0|0|
|Recovery-checker regression tests|4|0|0|
|Frontend unit tests|39|0|0|
|PostgreSQL application tests above|124|0|0|
|**Total**|**200**|**0**|**0**|

The four recovery tests check fail-closed comparison logic, not a new restore
exercise or proof of independent backup availability.

```sh
ruff check artifacts/api-server/backend
python -B artifacts/api-server/backend/manage.py check --settings=config.schema_settings
python -B artifacts/api-server/backend/manage.py makemigrations --check --dry-run \
  --settings=config.schema_settings
pnpm --filter @workspace/yieldloop run typecheck
pnpm run typecheck
pnpm --filter @workspace/yieldloop run lint
(cd artifacts/yieldloop && PORT=5173 BASE_PATH=/ pnpm build)
```

All exited successfully: backend lint/check, no migration drift, frontend and
workspace TypeScript (including generated/shared libraries and other workspace
packages), frontend lint and production frontend build. Build retains sourcemap
diagnostics for some UI wrappers and the large-chunk warning; these did not fail
the build and were not treated as successful tests or runtime defects.

## Real-browser acceptance — isolated data, three roles

Command: `python -B artifacts/api-server/backend/acceptance_browser.py`
served the built SPA plus real Django API at loopback port8099, in a fresh test
schema with private random accounts. The same walkthrough continued through
remaining steps; previously passed flows were not restarted.

### Authentication and permissions

- Manager sign-in and normal page refresh retained the session. Refresh produced
  **zero login POST requests**.
- Manager provisioned a test Operator; first login required password replacement.
  Replacement signed the user out; login with the replacement password reached
  the normal Operator workspace. Explicit logout and subsequent login succeeded.
- Supervisor accessed reports, production/rework and inventory.
- Operator recorded permitted good output on an Open job. Reports, Comparison and
  Employees routes denied access; corresponding authenticated APIs returned403.
  A correctly shaped, CSRF-authenticated reserve POST also returned403.
- **Operator cutting view-only is intentional policy, not a defect.** Editing was
  tested as Manager; no authorization expansion was made.

### Production, comparison, reports and rework

- Isolated IK-202: issued/accounted1200 = good900 + scrap240 + offcut60; scrap
  reasons Setup/layout180 and Damaged material60; variance0, yield75%, scrap20%.
- Isolated IK-203: issued/accounted1000 = good820 + scrap100 + offcut80;
  variance0, yield82%, scrap10%; no invented scrap reason.
- Same CT-2/material comparison accepted both jobs and provided underlying source
  links. Source entries and the arithmetic were visible in the UI.
- Supervisor resolved pending rework to good, voided that resolution with a
  correction reason, and re-resolved to scrap. Original/voided history remained;
  unresolved rework blocked closure and resolved balanced work became eligible.
- Same-material report included all five test jobs, **including helpers**:
  issued/accounted2220 = good1730 + scrap342 + offcut148 + pending0; variance0.
  Displayed weighted yield77.928%, scrap15.405%, offcut6.667%. Helper-inclusive
  reporting was not incorrectly represented as the two-job comparison.

### Inventory

- Registered8 kg from a separate balanced source helper.
- Reserved6, consumed2 into a traceable receiving issue, released1:
  **remaining6, reserved3, available3**.
- Source job remained issue8/offcut8/variance0; movement history linked source
  entry and receiving issue. Later Manager read after denied Operator mutation
  confirmed the same6/3/3 balances.
- Unsupported consumed-stock reversal/independent issue void remains prohibited,
  as requested; no incomplete reversal feature was introduced.

### Cutting Studio

- Manager used 500×300 mm stock,10 mm margins,2 mm kerf and two100×50 mm parts.
- Numeric placement20/20; keyboard ArrowRight changed x20→21; keyboard R rotated;
  mouse drag positioned x118.030/y82.530.
- Saved revision1, navigated away and reopened: rotated position118.030/82.530
  restored. One of two copies was placed; this was not presented as a complete
  industrial optimization or machine-ready cutting program.
- x999 rejected with explicit boundary/margin message and previous position kept.
  A temporary600 mm kerf rejected nearby second placement with overlap/kerf
  feedback. Unsaved invalid experiments did not overwrite revision1.
- Touch-enabled390×844 Chromium touchStart/move/end changed unsaved x118.030→
  168.468, retaining y82.530. Unsaved indicator and Save reflected the movement.
  Physical touch hardware was not used.

### Packaging and localization

- Tray100×80×50 mm, thickness2.5 saved revision1; reopened matching inputs and
  actor/reason history. Summary external105×85×52.5 with five panels.
- Changed length to110, validated and saved revision2. Summary became internal
  110×80×50, external115×85×52.5. Downloaded revision2 JSON was parsed and confirmed
  length110,width80,height50,thickness2.5,template tray,state assembled.
- English and Arabic mobile controls were exercised. Arabic document/body RTL
  and no horizontal overflow were verified at390px; mobile cutting was single-column.
- **Live 3D visual output remains unverified:** browser WebGL context creation
  failed and the UI displayed its explicit unavailable state. No rendering pass,
  manufacturing-grade CAD or validated dieline is claimed.

## Existing application data verification

A separate **read-only transaction** confirmed exactly one application record
for each IK reference, without seeding/updating it:

|Reference|Machine|Issued|Good|Scrap|Offcut|Pending|Variance|Yield|Scrap rate|
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
|IK-202|CT-2|1200|900|240|60|0|0|75%|20%|
|IK-203|CT-2|1000|820|100|80|0|0|82%|10%|

## Remaining evidence limits and required external actions

- Live 3D rendering/redraw needs a WebGL-capable browser/device with reliable
  visual capture. Parameter persistence, server dimensions and exported values
  passed; they do not substitute for rendered-geometry evidence.
- Responsive/touch emulation is not physical-device or real-operator acceptance.
- Optional live AI provider calls were not made; unavailable behavior and mocked
  provider/error/authorization tests passed. No fabricated provider result.
- Production owner must supply independent/offsite backup availability/retrieval
  evidence; a named recovery owner must conduct an authorized cluster-loss restore
  into independent non-production infrastructure, including the expanded schema.
- Verify actual database roles, grants, ownership and least-privilege allow/deny
  behavior. Approve numerical RPO/RTO targets and demonstrate measured loss/time.
- Existing local recovery evidence is preserved, not recast as offsite/cluster-loss
  proof. None of these external approvals or exercises occurred in this pass.

See `staging-recovery-runbook.md` for procedure and evidence requirements.
Production remains **NOT READY** regardless of the green automated suite.
