# Final completion and acceptance — 2026-10-11

## Decision

**Functional production-material MVP/demo: PASS for the supported workflows
verified below. Packaging visual verification: PASS in local Chromium with
ANGLE/SwiftShader software WebGL (closure evidence below).
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
- **Historical first-pass limitation, now closed below:** browser WebGL context creation
  failed and the UI displayed its explicit unavailable state. That first pass did
  not establish rendering. Manufacturing-grade CAD or validated dielines remain
  outside the supported conceptual feature.

## Existing application data verification

A separate **read-only transaction** confirmed exactly one application record
for each IK reference, without seeding/updating it:

|Reference|Machine|Issued|Good|Scrap|Offcut|Pending|Variance|Yield|Scrap rate|
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
|IK-202|CT-2|1200|900|240|60|0|0|75%|20%|
|IK-203|CT-2|1000|820|100|80|0|0|82%|10%|

## Remaining evidence limits and required external actions

- Live 3D rendering/redraw is now verified with actual composited canvas screenshots
  in software-rendered Chromium; this does not certify every GPU/device or template.
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

## Remaining-acceptance closure — 2026-10-11

### Actual WebGL evidence

The managed test browser continued to report WebGL unavailable. Two context-level
launch-option attempts did not produce a working renderer; neither was reported as
a visual pass. A separately launched local Chromium process **did** support WebGL2:

```sh
chromium --headless --no-sandbox --disable-dev-shm-usage \
  --use-gl=angle --use-angle=swiftshader --enable-webgl \
  --ignore-gpu-blocklist --enable-unsafe-swiftshader \
  --remote-debugging-port=9333 --user-data-dir=/tmp/yl-gl-closure-profile about:blank
```

This temporary browser was used only against the loopback acceptance harness, not
production. These test-process flags do not change the application or its security
configuration. Renderer: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)
(0x0000C0DE)), SwiftShader driver)`.

Added a repeatable **test-only** CDP driver:

```sh
python -B artifacts/api-server/backend/acceptance_browser.py
# In a separate shell, use the private temporary path printed by that harness:
node scripts/verify-packaging-webgl.mjs /tmp/yieldloop-acceptance-<generated>.json
```

The script requires harness-style temporary credentials, loopback8099, and an empty
concept library before creating anything. Each new run needs a fresh harness
schema; it must not overwrite/reuse business records. No credentials are printed.

Actual successful invocation (the private file was removed during cleanup):
`node scripts/verify-packaging-webgl.mjs /tmp/yieldloop-acceptance-g2stb3_1.json`

Actual run used the fresh isolated harness and:

1. Entered tray dimensions200×120×60 mm, thickness2, in the real UI.
2. Captured the centered visible canvas using **Page.captureScreenshot from the
   same Chromium page**, not a different registered tab or an expired WebGL buffer.
3. Validated and saved revision1.
4. Changed only length200→300 via the UI; captured the visibly longer/narrower
   model **before pressing Validate**, proving live parameter-driven redraw.
5. Validated/saved revision2, navigated away, reopened and asserted length300.
   History confirmed revisions2 and1. Captured the reopened model.

Result: **PASS**. Before/after images were opened and visually inspected. The live
300 mm image and reopened revision2 image are byte-identical; before200 is distinct.
The camera automatically fits the changed geometry, so evidence compares proportions,
not a claim of fixed-camera millimetres-per-pixel.

Evidence files (ignored generated output, not application assets):

- `generated-artifacts/webgl-acceptance/before-200.png`
- `generated-artifacts/webgl-acceptance/after-live-300.png`
- `generated-artifacts/webgl-acceptance/reopened-revision-2.png`
- `generated-artifacts/webgl-acceptance/evidence.json` — renderer and saved/history data.

SHA-256 before200:
`737cf0a75aab706208da126a473905f8d26491eb0429f70ae5af616d267abd67`

SHA-256 live300 **and** reopened revision2:
`646ad152727080c0392a9396ddcb9442e2bc352e3d1422273a54ad0661b4f17e`

The first driver attempt stopped at an incorrect test selector before saving; the
selector was corrected and the complete driver then passed. An optional Pillow
image-composition attempt could not run because Pillow is not installed; no package
was installed. This did not affect original screenshots or their visual/byte checks.

### Checks after the final test-driver change

```sh
node --check scripts/verify-packaging-webgl.mjs
node scripts/verify-packaging-webgl.mjs /tmp/yieldloop-acceptance-<generated>.json
PYTHONPATH=artifacts/api-server/backend python -m unittest test_recovery_semantics -q
python -B artifacts/api-server/backend/manage.py test \
  accounts.tests audit.tests health config.tests config.test_request_limits \
  --settings=config.schema_settings
python -B artifacts/api-server/backend/manage.py makemigrations --check --dry-run \
  --settings=config.schema_settings
sha256sum generated-artifacts/webgl-acceptance/*.png
cmp -s generated-artifacts/webgl-acceptance/after-live-300.png \
  generated-artifacts/webgl-acceptance/reopened-revision-2.png
```

Results: script syntax and complete browser driver passed; **4/4 recovery-checker
and33/33 offline tests passed,0 failed,0 skipped**; no migration drift; `cmp` exit0.
The earlier complete **200/200 baseline is preserved**, not relabeled as newly rerun.
No application code changed, no application migration ran, and no regression was
observed. Fresh test schemas only were migrated by the existing verified harness.
Temporary browser/server processes were stopped and private credentials removed.

### Genuinely outstanding release gates

|Gate|Current evidence status|Who and what closes it|
|---|---|---|
|Independent/offsite backup availability|Not demonstrated here|Infrastructure/backup owner supplies dated inventory, retention/encryption/access controls, checksum and successful independent retrieval evidence.|
|Independent cluster-loss recovery|Not demonstrated here|Named DBA/recovery owner obtains an authorized disposable independent cluster and conducts a timed restore without relying on the original cluster; retain expanded-schema integrity and service/workflow acceptance evidence.|
|Database roles/grants/ownership|Not demonstrated here|DBA/security owner approves a sanitized role/ACL/ownership/default-privilege baseline, restores it and logs in as actual exercise roles to prove both allowed and denied actions. A no-owner/no-acl data restore is insufficient.|
|Approved and demonstrated RPO/RTO|No approved numeric targets or measured exercise evidence supplied|Business owner approves targets and scope; recovery owner records backup/transaction cutoff, observed loss, start/end and business-ready timestamps; obtain sign-off against targets.|
|Production authorization and factory sign-off|Not authorized by this pass|Authorized infrastructure/security/factory owners approve the actual target, least-privilege environment, staging/factory acceptance and release. Write guard remains unchanged; no deployment performed.|

These gates need external infrastructure and/or authorized personnel. No local
software test, screenshot, synthetic role or scripted restore was substituted for
their missing evidence. See the recovery runbook for the concrete procedure.

## Packaging-to-cutting follow-up — 2026-10-11

The approved separate-panel flat-box workflow is implemented and verified in the
actual Preview: ten panels, validated placement, save/refresh/reopen, immutable
source-revision link, and Manager/Supervisor permissions. See
[`packaging-to-cutting-acceptance.md`](packaging-to-cutting-acceptance.md) for exact
geometry, commands, results and remaining limitations.

Focused checks:42 backend tests passed, one additional positive variance/rework
test passed, one existing causation test repeated after prompt cleanup passed,
and41 frontend tests passed. Codegen/types/lint/build passed. These are focused
runs, not a rerun of the earlier full baseline. Live AI remains unverified because
no provider is configured. Production readiness remains **NOT READY**.

## 2026-10-12 — Required job-card and comparison completion

Implemented optional, Manager-editable planning fields (product specification,
sheet width/height/unit, planned good-weight yield, cutting instructions) with
backend/frontend validation, DB CHECK constraints, revision protection and
old/new audit snapshots. Existing metadata is not inferred. Added shared Decimal
offcut percentages to material summaries/comparison, including left-minus-right
percentage-point differences. Scrap category/source links locate the authorized
entry's page and focus it. Over-accounting now hides the misleading stacked bar
and shows a signed destructive balance alert. Creation-date reporting semantics
and existing rework/role help text are clarified in English and Arabic.

### Exact automated checks

```sh
DJANGO_SETTINGS_MODULE=config.test_settings python -B artifacts/api-server/backend/verify_pilot.py accounts.test_flows jobs.tests jobs.test_core jobs.test_card materials.tests materials.test_integrated reports.tests inventory.tests
```

**91 passed, 0 failed in 254.757s.** Guarded test DB only; 89 isolated schemas
retained. Includes the prior 85 focused backend checks plus six planning/rates/
navigation regression tests; this is not a rerun of every historical project test.

```sh
pnpm --filter @workspace/yieldloop exec tsx --test 'src/lib/*.test.ts'
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/yieldloop run typecheck
```

**44 frontend tests passed, 0 failed/skipped**, including three new planning
validation tests. Codegen, shared-library TypeScript build and app typecheck
passed. No packages added or authentication/security settings changed.

```sh
DJANGO_SETTINGS_MODULE=config.demo_settings python -B scripts/verify_job_card_preview.py --migrate
DJANGO_SETTINGS_MODULE=config.demo_settings python -B artifacts/api-server/backend/manage.py makemigrations --check --dry-run
DJANGO_SETTINGS_MODULE=config.demo_settings python -B artifacts/api-server/backend/manage.py showmigrations jobs
DANGEROUSLY_ALLOW_GIT=1 git diff --check
```

**Passed.** Additive `jobs.0003_production_planning_card` applied only to the
guard-verified `yieldloop_preview_demo` schema. No pending model migrations.
Before/after business fingerprints matched for **15 tables** (new columns
excluded); original values/rows preserved. Both supplied cases retain unset
planning fields. No seeds, user changes, business-record test writes, schema
resets or production migrations were performed. The existing write guard was
not altered. The Git command is read-only; its prefix satisfies the environment's
index-lock scrutiny, not a commit or reset.

### Current reference results

Read-only authenticated view dispatch against actual Preview data, corroborated
by isolated fixture tests and the signed-in comparison browser check:

|Reference|Issued|Good|Scrap|Offcut|Variance|Yield|Scrap rate|Offcut rate|
|---|---:|---:|---:|---:|---:|---:|---:|---:|
|IK-202|1200|900|240|60|0|75%|20%|5%|
|IK-203|1000|820|100|80|0|82%|10%|8%|

CT-2/same material; left-minus-right: scrap **+140 kg/+10 pp**, good yield
**−7 pp**, offcut rate **−3 pp**. Largest recorded IK-202 category is Setup/layout,
180 kg. IK-203 breakdown remains unspecified; offcuts are excluded from scrap.

### Browser evidence and boundaries

First read-only actual-Preview pass verified both blank planning cards,
offcut summary rates, comparison results and the Setup/layout link to focused
entry 34. It also verified invalid new-job planning inputs show useful feedback,
without submitting. Initial mobile check found horizontal overflow, prompting
the focused follow-up below. Screenshots: `51mswl` (card), `yawve5` (comparison),
`3iivgp` (focused entry), `e0xmgd` (initial mobile validation).

Follow-up **passed** after removing the new fieldset's intrinsic minimum width:
at 390×844 the viewport client width, document scrollWidth and body scrollWidth
all measured **375px**, with no page overflow. New-job and job-detail pages and
comparison were verified in Arabic/RTL. Comparison's wide table remains inside
its intended horizontal-scroll wrapper, not overflowing the document. Arabic
Reports displayed the exact creation-date/latest-corrections explanation.
No crashes on the rechecked pages; only Vite/React informational logs. Screenshots:
`wb0khs` (fixed mobile), `gfpuc1` (Arabic job), `9cb404` (Arabic comparison),
`l5p4hk` (Arabic new-job), `fdetp1` (report date semantics).

Browser writes to business records were prohibited; create/edit persistence and
permission mutations were verified by the isolated API tests, not by saving
Preview jobs. No password/account resets. No live AI, fresh WebGL or recovery
claim is made.

### Remaining decisions and delivery manifest

See `docs/job-card-completion.md` for exact factory questions: weight tolerance,
all-scrap closure, rework outcomes, required scrap categories and reporting dates.
Current behavior is preserved. Private document attachments are explicitly
deferred pending an approved secure storage/access/retention design.

Files changed for this completion:
- Backend `jobs/{card.py,models.py,policy.py,serializers.py,services.py,test_card.py}`
  and `jobs/migrations/0003_production_planning_card.py`: planning data/authorization,
  immutable audit snapshots, schema and regression tests.
- Backend `materials/{accounting.py,serializers.py,services.py,views.py}` and
  `reports/{views.py,comparison.py}`: shared percentages and authorized entry paging.
- Frontend `components/job-card-fields.tsx`, `lib/job-card.ts`,
  `lib/job-card.test.ts`, `pages/{job-new.tsx,job-detail.tsx}`: planning form/read views.
- Frontend `components/materials/materials-section.tsx`,
  `lib/{materials.ts,core.ts,role-access.ts}`, `pages/{comparison.tsx,reports.tsx}`:
  rates, source links, balance feedback and localized clarity fixes.
- `lib/api-spec/openapi.yaml` and regenerated API client/Zod files: compatible
  optional planning fields, offcut rate, edit capability and entry_id query.
- `scripts/verify_job_card_preview.py`, this acceptance addendum and
  `docs/job-card-completion.md`: safety checks and evidence.

Existing unrelated workspace changes were preserved. Production remains
**NOT READY** pending the previously documented external release gates.

## 2026-10-12 — Full interactive core acceptance and bug remediation

**Demonstration verdict: READY WITH DOCUMENTED LIMITATIONS.**
**Production verdict: NOT READY.** This does not supersede unresolved recovery
requirements. Existing browser credentials for Operator/Supervisor were rejected;
no resets, account edits or role changes were attempted.

### Actual UI results

Initial browser pass: **17 atomic checks — 12 PASS, 1 PARTIAL, 2 FAIL, 2 BLOCKED**.
One failure was fixed and verified; the other (mobile overflow) did not reproduce
in the controlled follow-up. All follow-up checks passed. The two role-login
blocks remain; no claim is made that their signed-in browser flows passed.

| Requirement | Result/evidence |
|---|---|
| Manager login/navigation, lists and empty search | PASS through actual Preview; Clear filters restored the list |
| Create/edit/reopen structured planning card | PASS, QA job 17: specification, 210×297 mm, planned yield 82.5%, cutting instructions; CT-2 persisted |
| Open job, material issue/output/scrap/offcut/rework | PASS through real UI, not a mocked successful request |
| Pending rework and unbalanced closure prevention | PASS; pending 10 kg prevented completion; resolved through UI to Good |
| Balanced completion and read-only reopening | PASS; job 17 completed with issued/accounted100, good80, scrap10, offcut10, pending0, variance0; rates80/10/10 |
| Negative quantity/invalid planned yield | PASS; −1 rejected; yield110 disabled Save; Discard preserved revision |
| Invalid dimensions | PASS automated regression; not independently completed as a new browser assertion in this pass |
| Under/over-accounting | PASS, job18 showed +100 kg and −10 kg signed variance and prevented closing |
| Scrap reason recording | PARTIAL in first end-to-end job: tester entered “QA trim” in note, leaving reason unspecified. Dedicated reason field subsequently verified on job18 entry59, then that QA-only entry was voided. Not an app defect |
| Reference cases and comparison | PASS in actual UI: all quantities/rates from the preceding reference table, CT-2/board, Setup/layout180, IK-203 reasons unspecified; deltas+140kg/−7pp/+10pp/−3pp |
| Source entry navigation | PASS: #34 and #39 opened and received focus on their correct jobs |
| Incompatible comparisons | PASS: jobs18/17 mismatched machines; follow-up17/10 same CT-2 but different materials showed warning/dashes, no deltas |
| Reports | PASS Manager UI and creation-date/latest-measurements explanation |
| English/Arabic/mobile | PASS inspected screens; stable EN/AR job17 and missing-entry routes fit390px; login also checked both locales |
| Operator/Supervisor browser permissions | BLOCKED: both available credential attempts returned401. Runtime API permission tests passed separately |
| Artificially delayed loading/network-error retry | NOT RUN in browser; do not infer coverage from ordinary successful loads |

All browser writes were limited to new, explicitly labelled QA records:
- Job17 `QA-E2E-CORE-1791753799841`, completed, reference `YL-15613AC78FF4`.
- Job18 `QA-E2E-VARIANCE-1791753945829`, Open, reference `YL-7A4EEC7B45B8`;
  intentionally over-accounted, machine `QA-E2E-ALT-MACHINE`.
- New material `QA-E2E-MAT-CORE-1791753849283`; entries51–59.
These records were retained, not deleted. They may appear in unfiltered demo
reports; do not mistake job18's deliberately invalid balance for factory data.

### Confirmed bug, fix and focused browser confirmation

**Missing source entry:** `/jobs/17?entry=999999#entry-999999` previously said
the *job* did not exist, although the completed job remained visible. Root cause:
the materials panel reused the generic404 job error for an entry lookup404.
Added a distinct authorized-job/source-entry error and localized recovery button
which clears the entry query and returns to `/jobs/17#materials`.

Changed `components/materials/materials-section.tsx`; added pure classifier
`lib/source-entry.ts` and regression `lib/source-entry.test.ts`. The regression
distinguishes missing entry from no requested entry,401/403/409/500/503 and network
errors. Server visibility, geometry, revision and write guards are unchanged.

Focused real-browser confirmation **PASS in EN and AR**: recovery restored all
six entries and balanced100kg; job17 stayed Completed/read-only. Screenshots
`n16c5n`, `ncmbjf`.

**Mobile observation, not a claimed CSS repair:** initial document width465px
was not reproducible after restart/stable-font measurement. No speculative CSS
change was made. Before any masking, stable EN/AR valid-job client/document/body
widths were390px; missing-entry routes measured375px each (15px vertical
scrollbar). No element crossed the viewport. Screenshots masked with
visibility:hidden only after measurement: `1i5p4t`, `73bqqf`. Material mismatch
evidence: `laflxn`.

### Exact commands and results

```sh
DJANGO_SETTINGS_MODULE=config.demo_settings python -B scripts/verify_e2e_records.py capture /tmp/yieldloop-e2e-baseline.json
DJANGO_SETTINGS_MODULE=config.test_settings python -B artifacts/api-server/backend/verify_pilot.py accounts.tests accounts.test_flows audit.tests jobs.tests jobs.test_core jobs.test_card materials.tests materials.test_integrated inventory.tests reports.tests reports.test_acceptance assistance.tests cutting.tests cutting.test_panel_kit config.test_demo_profile config.test_request_limits config.tests health.tests
python -B artifacts/api-server/backend/manage.py test accounts.tests audit.tests health config.tests --settings=config.schema_settings
pnpm --filter @workspace/yieldloop exec tsx --test 'src/lib/*.test.ts'
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/yieldloop run typecheck
pnpm --filter @workspace/yieldloop run lint
PORT=22517 BASE_PATH=/ pnpm --filter @workspace/yieldloop run build
DJANGO_SETTINGS_MODULE=config.demo_settings python -B artifacts/api-server/backend/manage.py makemigrations --check --dry-run
DJANGO_SETTINGS_MODULE=config.demo_settings python -B scripts/verify_e2e_records.py verify /tmp/yieldloop-e2e-baseline.json
```

- Initial combined backend invocation: **172 run,170 passed,2 failed,0 skipped**,
  334.809s. Both failures were **incorrect test-profile selection**, not app
  regressions: offline DB expected dummy rather than PostgreSQL; offline routes
  expected404 rather than runtime unauthenticated401. Preserved tests and guards.
- Correctly rerun offline group: **31/31 passed**,2.829s. The other **141 runtime
  checks already passed** in their correct guarded PostgreSQL environment.
  Thus **172 distinct backend checks have passing evidence across appropriate
  profiles**; do not call the original combined command a clean successful run.
  Retained117 isolated schemas, prefix `ylpilot_b1d008f2351c`.
- Frontend before fix: **44/44 passed**. After fix: **45/45 passed**,0 failed,
  0 skipped,2873.905ms. Typecheck and lint passed again after the fix.
- Codegen/shared-library type build passed; contract unchanged by UI fix.
- Initial bare build lacked the workflow-supplied PORT and stopped at configuration.
  Correct invocation with explicit non-secret development build settings passed;
  repeated after fix, **passed in23.08s**. Existing >500kB chunk warning remains,
  not a build failure and not addressed with unrelated refactoring.
- Migration consistency: **No changes detected**. No migration executed.
- New `scripts/verify_e2e_records.py`: hash-only capture/verification under
  positively identified isolated Preview. **All94 original business rows across
  15 tables unchanged;32 newly created test rows retained**. No credential content
  stored in evidence. No production access or original-schema switch.
- Actual managed Preview frontend/browser and backend were used. Frontend
  workflow restarted after the UI fix; protected views checked by the authenticated
  tester. No mock positive persistence, external changes or deployment.

### Remaining limits and approvals

1. Authorized existing Operator/Supervisor login is required to complete their
   actual UI coverage. Existing supplied credentials were rejected. Obtain valid
   access privately; any reset requires explicit approval. Backend permission
   checks do not substitute for their unexecuted browser scenarios.
2. Factory decisions remain unchanged: exact-zero tolerance, positive-good/all-
   scrap closure, pending-rework outcomes, required reasons, report time basis.
3. Attachments remain deferred pending approved private storage/access/retention.
4. No live AI/provider, new WebGL interaction, external backup, independent
   cluster-loss restore, target role/grant/ownership recovery or approved/measured
   RPO/RTO was demonstrated in this pass. Existing production blockers remain.

For demonstration, use IK-202, IK-203 and their comparison. QA17 illustrates a
saved/closed full workflow; QA18 intentionally illustrates a rejected balance.
Complete the blocked role logins before claiming comprehensive all-role UI
acceptance. Production remains **NOT READY**.
