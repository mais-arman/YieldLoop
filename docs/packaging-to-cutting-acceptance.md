# Packaging-to-cutting and practical assistant — 2026-10-11

## Scope and implementation

The user approved **separate rectangular panels**, not a folded carton blank.
The existing application and actual Preview are used. No separate server, schema
reset, migration, production operation or write-guard change was needed.

The supported template is `flat_box`. Its six part types represent ten physical
panels: base, two ends, two sides, lid top, two lid ends and two lid sides.
All dimensions are decimal millimetres derived on the server from the immutable
saved concept revision. For internal L/W/H, thickness t, clearance c and lid height h:

|Component|Width × height|Quantity|
|---|---|---|
|Base|(L+2t) × (W+2t)|1|
|Base ends|W × H|2|
|Base sides|(L+2t) × H|2|
|Lid top|(L+4t+2c) × (W+4t+2c)|1|
|Lid ends|(W+2t+2c) × h|2|
|Lid sides|(L+4t+2c) × h|2|

These reproduce the existing panel-built 3D geometry. They are not bounding
rectangles substituted for folded cartons. Each piece's rectangular dimensions
define its cut boundary; there are **no folds, integral tabs or flaps** in this
construction. No glue thickness, tooling allowance or bonding process is invented.
This is a planning kit, not an assembly specification or manufacturing-approved dieline.

`POST /api/v1/packaging/panel-kit` accepts the concept ID, exact revision and
`separate_panels_v1` method. Managers and Production Supervisors can derive kits.
The UI enables Send only for a supported, server-validated, saved, unchanged design.
Users choose an editable job and then explicitly supply material, stock dimensions,
board count, margins, kerf and rotations. No stock assumptions are filled in.

The existing planner and geometry validation remain authoritative. Panel dimensions
and quantities are fixed; rotation, stock and placements remain editable. Server
evaluation/save reject altered panel dimensions or quantities. The source is stored
in the scenario JSON and immutable plan revision history. Existing linked scenarios
cannot lose or replace their source on update. Historical concepts remain accessible
via `GET /api/v1/packaging/designs/{id}?revision=N`; source links open separately.
Saved plan URLs retain `?plan=ID`, including after refresh.

Other templates (`tray`, `sleeve`, `lid_box`), folded cartons, nonrectangular patterns,
hinges, flaps, glue tabs and machine programs are **unsupported for this conversion**.
They are not silently approximated. Existing concept creation remains available.

## Assistant

The existing bounded OpenAI adapter is preserved. Status on the actual demo
environment is `available:false`, provider `openai`, model `null`. **No real provider
request succeeded or was attempted with credentials.** Live AI is NOT VERIFIED.
No keys were requested, exposed or put into frontend code. The inactive floating
entry remains hidden; normal authorized records/evidence remain available.

AI analysis/proposal access is now limited server-side to Manager and Supervisor,
as requested. Operators receive no AI controls; analysis requests are denied403.
Ordinary job/material permissions and contextual packaging access are unchanged.

Analysis retrieves the selected job, up to two explicitly referenced peer jobs,
and up to20 visible jobs with nonzero variance or pending rework. Peer references
are matched to stored records, not demo names. A truncated attention list is labelled.
There are no hardcoded IK answers. The provider receives these authorized records;
server-authored facts/calculations remain separate from model-selected suggestions.
The UI includes peer quantities, attention-job links and evidence-record links.
Permissions and relevant revisions/context are rechecked after the provider call.
Existing timeout, redacted errors, strict structured-output validation and rejection
of invented IDs/prose remain in place. Variance explanations now include pending rework.

Read-only inspection of the actual Preview records confirmed:
- IK-202:1200 issued,900 good,240 scrap,60 offcut,0 variance;75% yield/20% scrap;
  largest category Setup/layout180 kg.
- IK-203:1000 issued,820 good,100 scrap,80 offcut,0 variance;82% yield/10% scrap;
  largest category Unspecified100 kg.
- The IK-202-vs-IK-203 question retrieves IK-203 as related evidence.
- No attention jobs existed at that inspection. A separate isolated automated
  fixture demonstrated actual10 kg issue/3 kg pending rework →7 kg variance.

These records do not establish a root cause, and offcuts are never relabelled scrap.
English/Arabic workflow wording was shortened; audit, quantities, provenance and
actionable errors remain visible.

## Actual Preview browser acceptance

The test browser initially failed to resolve the development hostname (NXDOMAIN),
although workspace HTTPS curl returned200. It resumed successfully through
`http://localhost:80/`, the **same actual shared Preview proxy**, not port8099.

|Case|Result|
|---|---|
|Open saved flat-box concept#4/revision1|PASS; existing validated350×350×40, t3, lid35, c1|
|Send to DEMO receiving job#15|PASS; source unchanged; six types/ten panels as specified|
|Stock/spacing/rotation input|PASS;1000×1000 mm,2 boards,10 mm margins,2 mm kerf; rotations allowed|
|Generate and validate|PASS;10 placed,0 unplaced,1 board used;36.625% utilization; valid spacing/bounds|
|Save/refresh/reopen|PASS; new DEMO plan#3/revision1; source#4/revision1, placements and audit reason retained|
|Source link|Initially opened same tab; fixed native anchor; final Chromium user-gesture check confirmed a new tab and preserved plan tab|
|Unsupported tray|PASS; unchanged concept#2; Send disabled|
|Operator derivation / Supervisor derivation|PASS; authenticated403 /200 respectively|
|Remove source from saved plan request|PASS;400 rejection; immediate GET unchanged revision1/source|
|IK evidence reads|PASS; both authorized200 with unchanged quantities/reconciliation|
|English/Arabic|PASS; EnglishLTR, ArabicRTL and translated packaging interface|
|Unavailable provider|PASS; actual statusfalse; floating assistant hidden|
|Live AI answers/provider transport|NOT TESTED; no configured credential|
|Historical source after concept update|Automated PASS on isolated fixtures; browser update NOT TESTED to preserve seeded concepts|
|3D rendering in managed tester|UNAVAILABLE; browser WebGL context creation fails; geometry summaries and2D workflow remained functional|
|Physical manufacturing or mobile-device acceptance|NOT TESTED; no manufacturing approval asserted|

Only a clearly labelled DEMO cutting plan was added. The four seeded concepts and
IK-202/IK-203 were not changed. Screenshot:
`generated-artifacts/panel-kit/saved-plan.png` (actual HTTPS Preview, saved plan).

## Exact checks

```sh
pnpm --filter @workspace/api-spec run codegen
DJANGO_SETTINGS_MODULE=config.test_settings python -B artifacts/api-server/backend/verify_pilot.py \
  cutting.tests cutting.test_panel_kit assistance.tests
DJANGO_SETTINGS_MODULE=config.test_settings python -B artifacts/api-server/backend/verify_pilot.py \
  assistance.tests.AssistanceTests.test_source_facts_calculations_and_180kg_causation
DJANGO_SETTINGS_MODULE=config.test_settings python -B artifacts/api-server/backend/verify_pilot.py \
  cutting.test_panel_kit.PanelKitTests.test_attention_uses_actual_variance_and_pending_rework
pnpm --filter @workspace/yieldloop exec tsx --test 'src/lib/*.test.ts'
pnpm --filter @workspace/yieldloop run typecheck
pnpm --filter @workspace/yieldloop run lint
ruff check artifacts/api-server/backend
(cd artifacts/yieldloop && PORT=5173 BASE_PATH=/ pnpm build)
```

Results:
- Main focused backend run:42 passed in62.353s. Initially one test expected404
  after demotion; updated to the explicitly requested AI-role denial403, then passed.
- Post-prompt-change existing causation test:1 passed in3.369s (repeat, not a new case).
- Added positive variance/rework test:1 passed in3.319s. Thus43 distinct backend
  cases ran across these commands; the earlier42 run predates this additional test.
- Frontend:41 passed,0 failed,0 skipped, including source round-trip regression.
- Codegen/shared-library types, frontend types, ESLint, Ruff and build:PASS.
  Initial bad OpenAPI reference and nullable-user TypeScript error were corrected.
  Build retains nonfatal large-chunk/sourcemap warnings.
- Database tests used positively verified isolated retained schemas, never reset
  application/demo data. The prior full acceptance baseline was not rerun or
  relabelled as this focused run.
- A synthetic CDP click without a user gesture was popup-blocked. Repeating with
  a real user-gesture flag verified new-tab behavior; no application workaround
  weakening browser security was introduced.

## Remaining gates

The approved separate-panel MVP path is verified. Live AI requires an authorized
administrator to configure an approved provider securely, then a real EN/AR request
and evidence-link/error acceptance pass. Mocked provider tests are not live success.

Production remains **NOT READY**. Existing offsite backup/independent retrieval,
real cluster-loss recovery, target role/grant/ownership evidence, accountable
recovery ownership, and signed/measured RPO/RTO gates remain governed by
`staging-recovery-runbook.md` and `phase-8-acceptance.md`. This work neither repeats
nor supersedes the preserved local CHECK-equivalence and isolated-role evidence.
No production access, deployment or external recovery claim was made.
