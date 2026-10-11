# AI Assistance and 3D Packaging Designer

Implementation: 2026-10-11. Existing React/Vite + Django/DRF architecture retained.
No database migrations, new production records, inventory consumption, schema
changes, cutting-algorithm changes, production access or deployment.

## Opening the features

Sign in with an existing ready account. The common navigation now includes
**AI Assistance** (`/assistant`) and **Packaging** (`/packaging`) after Reports.
Job details has an assistant link carrying the job ID.
All three roles can use these tools, but Operators can only inspect Open jobs,
exactly as in existing job access rules. Manager-only Employees remains unchanged.

## Production assistance

1. Select an authorized job. The evidence view works without an AI provider.
2. Inspect recorded entries, exact kg reconciliation and saved cutting results.
   Voided entries are marked; totals use the existing authoritative snapshot.
   Cutting metrics are recomputed with the existing geometry functions and remain
   area-based, never kg yield or measured waste.
3. When configured, enter an English/Arabic question and explicitly consent to
   sending the selected evidence and question. Notes are excluded by default and
   require an additional opt-in. Staff identities, full geometry and unrelated
   records are not sent.
4. Review the advisory answer and its source revision/time. Leads contain known
   record references, evidence needed and next steps, not production write actions.

Facts/calculations are server-owned. The real model selects from an allowlisted set
of investigation topics and reference IDs. The server validates the selection and
composes bilingual explanations. Unrestricted model prose is deliberately not
displayed as factual or causal analysis. This is guided production assistance, not
an unrestricted general chatbot.

Every answer states that the available records do not establish an exact root
cause. A 180 kg setup/layout record is only an investigation lead. The same
records can yield zero variance: 1200 issued = 900 good + 180 setup scrap +
60 damaged scrap + 60 offcut; measured yield is 75%. Neither variance nor scrap
automatically establishes stock availability or a physical loss cause.

Evidence is collected under the existing job lock for a consistent snapshot; the
provider call occurs after releasing it. After generation, current role/access and
source revisions are checked again. Hidden jobs return 404; changed revisions
return 409. A selected-job change clears the UI answer/consent, and changed source
revisions invalidate stale advice.

### Provider setup and limits

- Provider: server-side OpenAI Chat Completions over HTTPS.
- Configure **`YIELDLOOP_AI_API_KEY` as a server secret**, never a Vite variable.
- Optional server setting: `YIELDLOOP_AI_MODEL`, default `gpt-5-mini`.
- No provider credentials were configured or used in implementation verification.
  Live model behavior, latency, provider billing and real-account connectivity are
  **not verified**. Missing configuration returns `ai_unavailable` (503), never a
  fabricated answer. Authentication/network failures return `ai_provider_error`
  (502); rejected content returns `ai_invalid_output` (502), without provider details.
- Calls have a 35-second timeout, 6000 completion-token ceiling, 128 KiB response
  ceiling and six requests/minute per user via the configured Django cache.
  A process-local cache is not a distributed billing quota; provision shared
  throttling before any larger-scale paid rollout.
- Evidence includes at most 100 latest entries and five latest plans; truncation
  is disclosed. Totals are the full persisted reconciliation, not partial sums.
- No conversation persistence or AI write actions are implemented. No new audit
  records are needed for production changes because these endpoints cannot make
  such changes.

## Supported packaging concepts

All numeric inputs are **internal dimensions in mm**, decimal strings with at
most three decimal places. Dimensions: 1–5000 mm; thickness: 0.1–20 mm;
thickness must not exceed one quarter of the smallest internal dimension.
These are concept-input bounds, not certified material/manufacturing tolerances.

| Template | Geometry | Open state |
|---|---|---|
| Open tray | Base and four butt-jointed walls with explicit thickness | Separated panels; **not** an unfolded dieline |
| Sleeve | Four panels, open at both length-axis ends | Unsupported; clearly disabled |
| Box with separate lid | Tray plus an independently sized lid | Lid lifted vertically; no hinge implied |

Lid boxes additionally require wall height (≤ box internal height) and clearance
per side (0.1–20 mm). Lid internal length/width = base internal dimension +
two thicknesses + two clearances. Clearance is user-specified, not a guaranteed
manufacturing allowance.

The actual Three.js WebGL renderer supports mouse/touch orbit, zoom and pan;
labelled keyboard-operable controls and reset are provided. Text dimensions remain
available if WebGL is unavailable. There is no continuous animation.

Edits require **Validate preview / Validate changes**. Server validation precedes
rendering. A previous model is explicitly marked stale until new validation succeeds,
and stale export is disabled. Requests cannot overwrite a newer form snapshot.

### Concept files and AI proposals

Export/import uses `yieldloop.packaging-concept`, version 1 JSON:
`concept: true`, `production_validated: false`, `unit: mm`,
`dimension_basis: internal`, and the design parameters/state. Unsupported metadata,
units, templates, versions and invalid dimensions are rejected. Imports are
server-validated before use. Files are user-owned exports, not saved database
designs or browser-stored production data; reloads do not restore unsaved work.

When configured, AI can propose only the three supported templates. Missing values
stay missing; unsupported shapes return no template. Every supplied value is
range-checked and complete proposals receive cross-field validation. Applying a
proposal only fills the editable form; it does not render, save, approve or transfer
anything automatically. Users must verify all proposed values against measurements.

**Not implemented:** arbitrary meshes, curved packaging, hinges, flaps/tabs,
fold allowances, material properties, structural strength, bend radii, grain,
machine constraints, dieline export, cutting-plan transfer or manufacturing approval.
No claim is made that these geometric concepts can be produced as shown.

## Extending templates

Keep the layers separate:

- Backend catalogue and validation: `assistance/packaging.py`.
- Shared API contracts: `lib/api-spec/openapi.yaml` (regenerate clients).
- Frontend parameter metadata/validation: `lib/packaging-templates.ts`,
  `lib/packaging-validation.ts`.
- Pure box-panel geometry: `lib/packaging-geometry.ts`.
- WebGL rendering: `components/packaging/concept-viewer.tsx`.
- File format/strict metadata: `lib/packaging-file.ts`.

Add bilingual field labels, explicit bounds/relationships, matching server/client
validation, geometry tests and actual rendered interaction checks for each new
template. Do not silently turn “open” into a validated fold/dieline.

## Verification commands and results

```sh
pnpm --filter @workspace/api-spec run codegen
python -B artifacts/api-server/backend/manage.py test assistance --settings=config.test_settings --keepdb --noinput
python -B artifacts/api-server/backend/manage.py test assistance cutting reports inventory materials jobs accounts.test_flows --settings=config.test_settings --keepdb --noinput
python -B artifacts/api-server/backend/manage.py test assistance.tests.AssistanceTests.test_voided_entries_are_marked_and_excluded_from_totals --settings=config.test_settings --keepdb --noinput
python -B artifacts/api-server/backend/manage.py test accounts.tests audit.tests health config.tests config.test_request_limits --settings=config.schema_settings
python -m ruff check artifacts/api-server/backend/assistance artifacts/api-server/backend/config/auth_urls.py
# From artifacts/yieldloop:
pnpm typecheck
pnpm lint
PORT=5000 BASE_PATH=/ pnpm build
npx tsx --test src/lib/*.test.ts
```

- Codegen and shared-library typecheck passed.
- First 21-test assistance run: 20 passed; one test fixture omitted the required
  temporary-password expiry. Fixed the fixture, not the constraint.
- Expanded 104-test run: 103 passed; one newly added void fixture wrongly supplied
  an unsupported request_id. Removed that field; focused rerun passed (1.030s).
  Thus all 104 cases have passing evidence across the suite and targeted rerun.
- Separate auth/audit/health/config suite: 33 passed (2.309s); the negative readiness
  test intentionally logs a database-readiness failure.
- New tests cover schema bounds/templates, exact dimensions, provider unavailable,
  malformed/truncated/oversized responses, safe English/Arabic leads, 180 kg example,
  forged IDs/causal prose, notes opt-in, role restrictions, post-provider permission
  and revision changes, CSRF, throttling, voids, real cutting metrics and partial AI
  proposals. Provider responses are mocked **only in tests**.
- Final Python lint passed after import/style fixes.
- Frontend typecheck, lint and build passed. **18 frontend tests passed** including
  nine initial packaging tests and panel-intersection regression coverage plus the
  existing eight tests. Format tests reject incompatible units/basis/approval flags.
- Three.js is lazy-loaded. Existing sourcemap and bundle-size warnings remain
  non-fatal; 3D chunk approximately 549 kB, main bundle approximately 784 kB.

### Browser verification: actual results

Built SPA served by:

```sh
python -B artifacts/api-server/backend/acceptance_browser.py
```

Only `http://localhost:8099` and the explicitly guarded
`test_yieldloop_phase2b` database were used by the tester. All data was synthetic.

Passed:

- Wrong-password then first successful login; all three roles reach both tools.
- Open job facts/timestamps and 1200/900/180/60/60 kg reconciliation, zero variance,
  75% yield, source revisions and non-AI evidence label.
- Manager/Supervisor can inspect Draft evidence; Operator receives 404 and cannot
  select it. Invalid IDs use a localized unavailable-job state.
- Actual unconfigured-provider state; no simulated live AI responses.
- All three templates, validated parameter changes, stale preview/export disabling,
  invalid numeric values/thickness/lid-height rejection.
- Valid JSON export/import round trip and rejection of malformed JSON, unsupported
  version/unit/template, and extra fields at root/design/parameter levels.
- English/Arabic at 390, 768 and 1440 px without document overflow; Arabic numeric
  ranges/units remain LTR and readable.

The first pass found extra import keys being dropped, mixed-direction Arabic
numeric placeholders, and generic 404 feedback. All three were fixed and verified
in a targeted browser recheck.

The default browser could not create WebGL. Real 3D verification therefore used
Chromium 152 with:

```text
--headless --no-sandbox --use-angle=swiftshader
--enable-unsafe-swiftshader --use-gl=angle
```

ANGLE SwiftShader genuinely rendered the tray, separated tray panels, sleeve and
lifted lid. Changing length 300→450 changed the rendered image. Desktop mouse
orbit/right-drag pan/wheel zoom and keyboard movement changed canvas hashes;
Reset restored the baseline hash. A CDP touch gesture changed the view at 390 px.
These are software-browser checks, not physical-device certification.

**Unresolved tablet interaction check:** an initial 768 px white capture was
diagnosed as offscreen clipping. In a fresh 768×1024 session, centering the canvas
produced visible geometry at `(25,243,718,538)`; context was not lost and WebGL
`getError()` was zero. Resizing 390→768 produced the same valid baseline image.
However, subsequent touch, keyboard and pan-button checks did not change its
captured image despite received pointer/touch events. This is not a verified pass,
nor a proven app-versus-headless-browser root cause. Tablet interaction remains
an open verification gap; do not advertise complete tablet acceptance.

Evidence images were inspected under `/tmp/yieldloop-swiftshader-*.png`,
`/tmp/yieldloop-controls-*.png`, and `/tmp/yieldloop-768-*.png`.
These are temporary verification files, not durable product assets.

Live AI answers/proposals and the enabled-provider consent UI were **not**
browser-tested because credentials were absent. Backend provider-output handling
has mocked unit/integration coverage. The existing Cutting Studio editor opened,
but its save/reopen/drag browser smoke was not completed in this pass; its existing
backend and frontend geometry/regression tests passed.

After verification, the browser harness was stopped. Cleanup loaded only
`config.test_settings`, asserted TESTING, development, no deployment flag, exact
database name `test_yieldloop_phase2b` and matching development cluster identifier,
then ran `call_command('flush', interactive=False, verbosity=0)`. Zero users/jobs
remained in that disposable database; the private credential file was removed.
The application database was not touched by cleanup.

Frontend and API workflows are running. Latest build, typecheck, lint and 18
frontend tests passed after the UI fixes. Existing external recovery release gates
remain unchanged. **This work does not mark YieldLoop production-ready.**
