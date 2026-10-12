# YieldLoop interactive demo — 2026-10-11

## Scope and safety

Performed the walkthrough in the existing, built YieldLoop UI served by
`python -B artifacts/api-server/backend/acceptance_browser.py`.
The harness positively checks the development cluster identity and database
`test_yieldloop_phase2b` before creating a fresh retained schema.
This demo uses **`ylpilot_58a3c1a3175e_1`**, subsequently identified by a read-only
transaction matching the isolated Manager account. No application/business or
production record was edited; no reset, delete, permission change or deployment ran.
Accounts were provisioned by the established harness; business transactions below
were entered through the real application forms, not database/API seeding.

## Access and lifetime

The running demonstration address is **http://localhost:8099/login**.
It is loopback-only, reachable by workspace browser tooling, **not a public URL or
the normal application preview**. The normal preview still uses its original data.
Exposing a testing-settings server publicly would not be a safe substitute for
an authenticated demo preview. A separately secured preview route remains needed
for direct access from the user's own browser.

The private, test-only credential file is `/tmp/yieldloop-acceptance-ugge65bo.json`.
Its keys are `manager`, `production_supervisor`, and `cutting_operator`.
The workspace owner can inspect that file privately in the Shell; do not commit,
publish or copy passwords into reports. No real user's credentials were used.
The server and accounts were left intact for continuation. The background server
is temporary; if the workspace/process stops, the URL stops working. Do not simply
rerun the harness expecting these records: it deliberately creates a new schema.

## Walkthrough and saved results

### 1. Manager — Dashboard, Production Jobs, Employees

Created the two main jobs on CT-2 and material DEMO Paperboard (kg).
Job creation is **Production Jobs → New job**. Employee administration is the
Manager's **Employees** menu. The final Dashboard has five open demo jobs, five
measured jobs, one available inventory lot and one helper-only attention item.

### 2. Supervisor — job Materials & reconciliation

|Page|Job|Issued|Good|Scrap|Offcut|Accounted|Variance|Yield|Scrap rate|
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
|`/jobs/1`|DEMO-IK-202|1200|900|240|60|1200|0|75%|20%|
|`/jobs/2`|DEMO-IK-203|1000|820|100|80|1000|0|82%|10%|

All quantities are kg. Source entries1–5 show IK-202's Issue, Good,180 Setup/layout
scrap,60 Damaged-material scrap and60 Offcut. Entries6–9 show IK-203's Issue,
Good,100 Scrap and80 Offcut. Its scrap reason is “Unspecified (not supplied)”,
not an invented cause. Both jobs are balanced, ready to close, and left Open.

### 3. Supervisor — comparison and report/source drilldowns

`/comparison?left=1&right=2` shows the same machine and material,7 percentage points
higher yield for IK-203, and10 percentage points lower scrap rate. IK-202 allocates
20% to scrap and5% to offcuts; IK-203 allocates10% to scrap and8% to offcuts.
That accounts arithmetically for the7-point yield difference. The largest recorded
scrap category is Setup/layout180 kg; these observations do not establish a cause.

Before helpers, Reports showed issued/accounted2200, Good1720, Scrap340, Offcut140,
zero variance, weighted yield78.182%, scrap15.455%.
The report has no per-job filter. After helpers, the material-filtered report at
`/reports?timezone=UTC&material_id=1&mname=DEMO+Paperboard` correctly includes five
jobs: issued2212, Good1722, Scrap340, Offcut148, accounted2210, variance+2,
yield77.848%, scrap15.371%, offcut6.691%. The source job rows explain the difference;
do not present this as the two-job aggregate.

### 4. Operator — My Work and permitted production

On `/jobs/3` (DEMO-OPERATOR), the first-issue material picker was empty. No restriction
was bypassed or permission changed. Supervisor entered Issue#10 for2 kg, then the
Operator entered Good#11 for2 kg. The saved authorship is visible. The job is now
balanced,100% yield. The limitation on initiating the first issue remains observable.
Operator navigation omits Reports/Employees; Cutting Studio is explicitly view-only.

### 5. Manager — offcut inventory

DEMO-STOCK-source (`/jobs/4`) has Issue#12 and Offcut#13, both8 kg.
Registered Inventory lot1 from that offcut, then reserved6 to DEMO-STOCK-receiver
(`/jobs/5`), consumed2 (creates receiver Issue#14), and released1.

|State|Remaining|Reserved|Available|
|---|---:|---:|---:|
|Registered|8|0|8|
|Reserved6|8|6|2|
|Consumed2|6|4|2|
|Released1|6|3|3|

`/inventory/1` retains the source and movement trail. Compatibility remains
unverified: these are recorded movements, not proof of physical suitability.
The receiver has2 kg issued and no output yet, deliberately producing the
dashboard's +2 kg attention item. It does not alter either main example.

### 6. Manager — Cutting Studio

`/jobs/4/cutting`: saved/reopened **DEMO 500x300 single-piece layout**, revision1.
Board500×300 mm, margin10 mm, kerf2 mm, one100×50 mm piece.
Manually changed position from(10,10) to(20,20); the reopened plan retains it.
Utilization3.333%. Geometry does not transfer inventory or validate grain,
defects, machine limits or guillotine cutting.

### 7. Manager — Packaging Concepts and languages

`/packaging`: validated tray200×120×60 mm, thickness2 mm; changed length300,
saved **DEMO packaging tray concept**, revision1, reopened and revalidated.
Summary: internal300×120×60, external304×124×62, five2 mm panels.
This is a concept, not validated manufacturing CAD or a dieline.
This walkthrough's managed browser reported WebGL unavailable; dimensions and
persistence were demonstrated, not a rendered model in that browser. The prior
separate software-Chromium rendering acceptance remains valid; see final-acceptance.md.
Switched to Arabic RTL, then back to English/LTR. Final browser page: Manager Dashboard.

## Genuine browser evidence

Screenshots captured during the walkthrough include:

- Manager dashboard `vzmwsc`, attention/source jobs `yh6bpt`.
- Main jobs `2rw2hw`, `gmlfoy`; comparison `mg36xc`.
- Two-job report before helpers `n8u235`; final helper-inclusive report `j1vant`.
- Operator handoff/authorship `mxsapn`, view-only cutting `1gmm4m`.
- Inventory registration `pn0fyi`, reservation `uusngh`, consumption `ae0ecw`,
  final release `ukawzj`.
- Moved cutting layout `sf61bc`, saved/reopened plan `03j6sd`.
- Packaging summary `m18kyl`, Arabic RTL `xk15ya`, returned English `52mpo6`.

Selected captures were displayed in chat. These IDs identify this browser session's
evidence, not publicly hosted URLs or screenshots of production.
No automated suite was rerun: no application code changed.

## Selective cleanup — not performed

When no longer needed, stop this demo server first. Have an authorized maintainer
verify the development cluster identity, `test_yieldloop_phase2b`, and the exact
schema `ylpilot_58a3c1a3175e_1` using the demo account/source references above.
Only then remove **that one disposable schema** and its dependent demo objects,
and remove the temporary credential file if still present. This irreversibly
removes this demo's five jobs, transactions, accounts and sessions together.
Never reset/drop the database, delete by a loose DEMO prefix, or remove other
`ylpilot_` schemas. A rerun uses a different schema, so never guess its name.
No cleanup command was executed or verified as part of the walkthrough.

Production recovery/authorization gates remain unchanged and **NOT READY**.
