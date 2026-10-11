# Original challenge completion evidence

Date: 2026-10-11. This is a functional completion assessment, not production release
approval. The next visual review is separate. No new 3D work or broad redesign.

## Authoritative workflows and definitions

- Job reference and cutting machine are optional on draft/open legacy jobs; a
  nonblank machine is required before completion. Managers create jobs, set external
  references and configure new machine names. Operators/Supervisors select only
  already configured machine names on Open jobs. Names are not
  hardcoded to a factory; comparison matches nonblank trimmed, case-insensitive
  machine names.
- Operators now record and void material on Open jobs and close balanced Open jobs,
  per explicit user approval. They cannot create jobs/material definitions, manage
  employees, create new machine names, edit job reference/title/notes, cancel jobs or mutate inventory.
  Supervisors/Managers retain their existing broader permissions.
- A shared read-only material catalogue lets an Operator select material for a
  first issue. This grants neither catalogue writes nor access to hidden job records.
- Reconciliation uses existing Decimal accounting:
  **issued = good + scrap + reusable offcuts**. Variance must be exactly zero.
  Good yield = good/issued ×100; scrap rate = scrap/issued ×100. Offcuts are never
  scrap. Stored quantities retain 0.001 kg precision; excess precision is rejected,
  not silently rounded. Rates are displayed to three decimal places.
- Completion locks the job, checks latest persisted reconciliation, requires
  positive issued and good quantities, and rejects missing machine/incomplete/
  unbalanced records. Existing job revision protection and audit events remain.
  Completed jobs cannot be edited or acquire new material/cutting writes.
- Completed jobs leave Operators' Open-only view; completion redirects them to
  the job list. Managers/Supervisors retain read-only access.
- Scrap reason is a structured field; blank means **unspecified**, not an inferred
  production cause. Voided entries are excluded from category totals and comparisons.
- Rework is **not implemented** as an accounting category. Neither supplied case
  contains rework, and none was invented. Separate rework treatment would require
  an explicit non-double-counting policy before implementation.
- Offcuts retain source job/entry provenance. Inventory registration uses the
  existing one-source/one-lot workflow. A registered source cannot be voided until
  authorized inventory voiding. No reservation or consumption was enabled.

## Data/schema changes

Applied only to positively identified development database **heliumdb**, PostgreSQL
cluster **7694975907574124564**:

- `jobs.0002_remove_jobevent_job_event_status_and_more`: reference, machine, demo
  flag, typed audit snapshots, completed status, unique nonempty case-insensitive
  reference constraint and completed-job machine constraint.
- `materials.0002_materialentry_scrap_reason_and_more`: scrap reason and a constraint
  preventing non-scrap entries carrying a scrap reason.

Existing quantities, IDs, internal YL references, accounts and audit events were
preserved. New fields default to blank/false for legacy data. Both migrations were
first exercised in the isolated PostgreSQL test database. The live migration plan
was checked to contain only these two migrations. No production connection,
startup migration, write-guard change, default account or credentials were created.

## Exact demonstration records

| Field | IK-202 | IK-203 |
|---|---:|---:|
| Persisted development job ID | 60 | 61 |
| Material | board | board |
| Machine | CT-2 | CT-2 |
| Issued kg | 1200.000 | 1000.000 |
| Good kg | 900.000 | 820.000 |
| Scrap kg | 240.000 | 100.000 |
| Reusable offcuts kg | 60.000 | 80.000 |
| Variance kg | 0.000 | 0.000 |
| Scrap rate | 20.000% | 10.000% |
| Good yield | 75.000% | 82.000% |
| Scrap categories | Setup/layout 180; damaged material 60 | Unspecified 100 |

Differences are **left minus right**: issued +200 kg, good +80 kg, scrap +140 kg,
offcuts −20 kg, scrap rate **+10 percentage points**, good yield
**−7 percentage points**. These are not relative percentage changes.

Material specification is explicitly unspecified; no board/sheet/product dimensions,
planned yield, operator observations or historical production dates were invented.
Job notes explain that auto-generated timestamps are import times. Both jobs carry
an immutable-through-API demo flag. Original internal YL identifiers are retained
alongside the supplied external references.

### Seeding and read-back

The command requires an existing active, ready Manager and explicit target identity:

```sh
python -B artifacts/api-server/backend/manage.py seed_challenge_demo \
  --settings=config.session_settings --actor-id <existing-manager-id> \
  --confirm-database heliumdb --confirm-cluster 7694975907574124564
```

Before either seed, development identity was confirmed through the platform's
read-only `SELECT current_database(), system_identifier::text FROM pg_control_system()`
and the guarded Django connection. Only development is accepted; production flags,
wrong names/clusters, inactive/non-Manager actors and conflicting preexisting case
references fail closed. The command never overwrites differing demo records.

Actual execution used `call_command('seed_challenge_demo', actor_id=actor.pk,
confirm_database='heliumdb', confirm_cluster='7694975907574124564')` twice inside
the explicitly selected session-settings process. An existing ready Manager was
selected; no account was provisioned.

Counts read before: 3 users, 2 jobs, 0 material entries, 0 lots, 0 inventory events.
After first and second runs: **3 users, 4 jobs, 9 entries, 2 lots, 2 events**.
The second run changed none of these counts. Fresh ORM reads verified both exact
cases, all category quantities, reconciliation snapshots and source-linked lots.
Existing unrelated jobs/users were retained. Audit records identify the executing
Manager. Case creation/recording/registration use existing application services.

## Comparison and investigation

`GET /api/v1/reports/comparison?left=60&right=61` authorizes each job, locks in
consistent order, uses authoritative snapshots and active source entries, and returns
category totals/source IDs. Different or missing machines are not a same-machine
comparison. Different materials suppress differences instead of mixing quantities.

The Reports → Compare jobs UI exposes both selectors, source links, definitions and
explicit percentage-point labels. It uses returned decimal strings, not client-side
floating-point accounting.

Assistant evidence now includes the supplied reference, structured scrap categories
and the actual largest active category. For IK-202 this is setup/layout, 180 kg.
It is shown as recorded/calculated evidence, not AI or causal proof. An AI-selected
lead cites that category/reference and asks for cutting instructions, layout/setup
records, material issues, weighing and operator evidence. Unsupported causes are
not asserted. Arabic/English uncertainty tests use actual seeded records.

**Real AI remains unavailable:** no `YIELDLOOP_AI_API_KEY` was configured.
`YIELDLOOP_AI_MODEL` optionally overrides the default `gpt-5-mini`. The adapter is
implemented; real-provider connectivity/responses remain unverified. Unit tests
mock provider output only; the application shows an honest unavailable state.

## Automated verification

```sh
python -B artifacts/api-server/backend/manage.py test jobs.test_core jobs.tests materials.tests cutting reports inventory assistance accounts.test_flows --settings=config.test_settings --keepdb --noinput
python -B artifacts/api-server/backend/manage.py test jobs.test_core materials.tests reports.test_acceptance reports.tests assistance.tests --settings=config.test_settings --keepdb --noinput
python -B artifacts/api-server/backend/manage.py test accounts.tests audit.tests health config.tests config.test_request_limits --settings=config.schema_settings
python -B artifacts/api-server/backend/manage.py test jobs.test_core --settings=config.test_settings --keepdb --noinput
python -B artifacts/api-server/backend/manage.py makemigrations --check --dry-run --settings=config.schema_settings
python -m ruff check artifacts/api-server/backend
pnpm --filter @workspace/api-spec run codegen
# artifacts/yieldloop:
pnpm typecheck
pnpm lint
npx tsx --test src/lib/*.test.ts
PORT=5000 BASE_PATH=/ pnpm build
```

Actual runs:

- Initial 111-case database run: 107 passed; four assertions still expected old
  Operator denial/completed-status exclusion or the prior exact advisory wording.
  Tests were updated for the approved permissions/status; uncertainty wording
  remains explicit. One test-edit indentation error was caught and fixed before rerun.
- Corrected focused run: **62 passed**, 56.076 seconds.
- Auth/audit/health/config run: **33 passed**, 2.350 seconds. Negative readiness
  test intentionally logs a database-check failure.
- Additional core/correction/stale-revision run: **26 passed**, 23.429 seconds
  (includes reused material test-class coverage; these totals are not unique sums).
- Existing Cutting Studio regression cases passed in the initial run.
- Migration drift: no changes. Backend lint passed.
- Codegen/library typecheck, frontend typecheck/lint/build passed;
  **23 frontend tests passed**, including new core display/status helpers.
- Existing non-fatal bundle-size/sourcemap warnings remain.

Additional final checks:

```sh
python -B artifacts/api-server/backend/manage.py test jobs.test_core jobs.tests --settings=config.test_settings --keepdb --noinput
python -B artifacts/api-server/backend/manage.py test jobs.test_core.CoreTests.test_renamed_demo_is_detected_without_recreating_it --settings=config.test_settings --keepdb --noinput
```

**42 passed** in 37.034 seconds after adding Operator selection of existing machines;
**1 passed** in 1.752 seconds for refusing to recreate a renamed demo. Repeated
frontend typecheck/lint/build and backend lint passed after the final UI fixes.
The imported fixture class was then referenced through its module to avoid counting
its tests twice in future core-only discovery; original material tests remain intact.

### Browser acceptance

One complete pass plus a focused failed-layout/new-machine-selection follow-up
used the built SPA at loopback port 8099 and the verified disposable
`test_yieldloop_phase2b` database. No browser exercise mutated the application
demonstration records.

- Manager login, job cards, exact demo quantities/categories/rates and source links:
  **PASS**.
- Reports comparison in English desktop and Arabic mobile: expected +10/−7 pp
  and quantity differences: **PASS**.
- Seeded inventory exactly two source-linked 60/80 kg lots: **PASS**.
- Assistant honestly unavailable while recorded largest category remains 180 kg:
  **PASS**.
- Actual Operator UI issue 10 → good 8 → scrap 1 (Trim) → offcut 1: close disabled
  until variance zero, confirmation succeeds, job disappears from Operator list,
  Manager sees Completed/read-only: **PASS**.
- Operator direct requests to create jobs, employees and materials: all **403**.
- Actual void/replacement does not double count; registered offcut refuses source
  void until Manager voids inventory lot: **PASS**.
- Cutting Studio generate/save/navigate away/reopen keeps positions (5,5) and
  (37,5) for synthetic test-only geometry: **PASS**. These dimensions were never
  inserted into development demo records.
- Initial Arabic 390 px unselected comparison picker had 469 px page width and the
  header said “Not found”: **FAIL, FIXED**. Added constrained grid sizing and the
  correct Reports context. Focused recheck: body/document/client width all 375 px
  at 390×768 and all 768 px at 768×768; no page-level overflow. Selected comparison
  table remains in its intentional local horizontal scroll region.
- New machine selection: Manager opened a machineless test job; Operator chose
  CT-2 from a native selector, saved and reloaded at revision 3. New-name and blank
  attempts returned **403**, with unchanged saved data: **PASS**.

Supervisor record/close, unlike-machine/different-material comparison and typed
completion audit were verified in backend integration tests rather than this
browser pass. Physical-device touch panning was not verified. No optional 3D
interaction was rerun.

After verification the loopback harness was stopped. An explicitly verified
test-settings process called `verify_target('test_yieldloop_phase2b',
'7694975907574124564')` before `call_command('flush', interactive=False,
verbosity=0)`. Temporary credential files were removed. Application data was not
flushed. Both managed application workflows restarted cleanly; the actual preview
sign-in screen rendered, with only the expected unauthenticated 401.

## Final functional gate

| Requirement | Status | Evidence |
|---|---|---|
| Job creation/opening and reference/machine selection | PASS | Manager browser creation/opening; Operator native selection/save/reload; guarded new-name rejection |
| Material issues, good output, scrap by reason, offcuts | PASS | Operator four-entry browser flow; development jobs 60/61 and nine persisted entries |
| Exact reconciliation and closure | PASS | Core integration tests reject 0.001 kg imbalance; browser disabled/enabled close and immutable Completed job |
| Correct rates, category definitions and source traceability | PASS | `/jobs/60`, `/jobs/61`; source entry lists and comparison results |
| Same-machine comparison | PASS | `/comparison?left=60&right=61`; +10/−7 pp; backend mismatch/void tests |
| Permissions, revisions, correction and offcut safeguards | PASS | Operator 403 tests, stale close test, void/replace and inventory-lot-first browser checks |
| Reproducible, nonduplicating supplied demonstration | PASS | Two development seeds, unchanged second-run counts, fresh read-back; collision/rename refusal tests |
| Evidence-based investigation and uncertainty | PASS | Largest category 180 kg from active records; bilingual provider-output tests and unavailable-provider browser state |
| Live AI responses | BLOCKED | No provider key; real-provider connectivity not verified |
| Separate rework accounting | OPTIONAL / unsupported | No supplied rework data; no rework quantities invented or silently included |
| Advanced 3D | OPTIONAL | Preserved existing implementation; no new work or acceptance claim |
| Production release | BLOCKED / NOT READY | Existing external recovery and release approvals remain outstanding |

There are no unresolved failures in the verified core recording/comparison/demo
flows. This does not imply that blocked external services or production gates pass.

## Open and demonstrate the cases

1. Sign in using an existing account. In **Production Jobs**, search `IK-202`;
   open job **60** and its Material recording section.
2. Repeat with `IK-203`, job **61**. Both display CT-2 and a Demo data badge.
3. Open **Reports → Compare jobs**; choose IK-202 on the left and IK-203 on the
   right. The direct in-app route is `/comparison?left=60&right=61`.
4. In **Inventory**, inspect the 60 kg and 80 kg lots and follow their source links.
5. In **Production Assistant**, select IK-202 to inspect the actual setup/layout
   180 kg category. Provider-unavailable is expected, not a simulated answer.

Use a separate practice job to demonstrate recording/closing without altering the
supplied cases. Closing a demo is terminal and removes it from Operators'
Open-only list; Managers/Supervisors still see it. Repeat seeding preserves completed
unchanged cases and refuses altered or renamed cases instead of overwriting data.

## Production release remains separate

See `docs/phase-8-acceptance.md` and `docs/staging-recovery-runbook.md`. Existing
offsite backup availability, independent cluster-loss recovery, approved
roles/grants/ownership baseline restoration, approved numeric RPO/RTO and timed
demonstration remain blocked or unapproved. The resolved local CHECK-equivalence
evidence was not replaced or claimed to validate this new schema snapshot.

No production access, deployment, consumption enablement, security bypass or
external recovery exercise occurred. Core challenge acceptance does **not** make
YieldLoop production-ready. Optional 3D tablet interaction limitations remain
documented in `docs/ai-packaging.md`; they are outside this core completion gate.
