# Phase 8 — MVP acceptance and production readiness

Assessment date: 2026-10-11. Scope: existing single-business React/TypeScript,
Django/DRF/PostgreSQL MVP only. No deployment, production data access,
production migrations, inventory consumption or accounting-policy changes.

## Release-gate remediation — current status

This section supersedes earlier findings below, which remain historical evidence.
Verdict remains **NOT READY**: dependency remediation does not replace factory
approval or verification of a real production-like staging environment.

| Gate | Category / priority | Status | Evidence / responsible next action |
|---|---|---|---|
| Production write authorization | Infrastructure/security — critical | **blocked** | Guard deliberately unchanged; infrastructure owner must approve target-specific staging/production authorization and least-privilege roles separately. |
| Two dependency advisories | Build security — high/moderate | **fixed** | Removed vulnerable dependency paths; final dependency scan has zero findings. Engineering owns ongoing scans. |
| Cross-module correctness/security | Code — high | **verified** | 81 DB tests plus 32 offline tests passed; new offline production-policy test passed separately. 114 unique backend tests now covered. |
| Arabic home overflow | Code/accessibility — high | **fixed** | Prior focused 390px confirmation retained; see original evidence below. |
| Cutting interactions | Code/accessibility — high | **verified** | See cutting-interaction-verification.md: desktop, touch emulation, keyboard, RTL, save/reopen and server denial; 3 frontend tests rerun and passed. |
| Comparison row meaning | Code/UX — low | **fixed** | Row now labeled “Layout source” / “مصدر التخطيط”, rather than Scenario; values intentionally identify manual vs shelf generation. |
| Bilingual/accessibility coverage | UX — high | **verified** (bounded browser pass) | All roles in EN/AR, mobile pagination/read-only permissions, error associations and measured home contrast; scope and remaining gaps below. Physical devices/assistive technology remain unverified. |
| Logical database recovery | Infrastructure — high | **blocked** (partial verification) | Restore reproduced all table rows/sequences; strict CHECK-definition comparison differs on reparsed array casts. Infrastructure/engineering must finish semantic constraint verification; details below. |
| Offsite backups, RPO/RTO and recovery ownership | Infrastructure — critical | **blocked** | Infrastructure/factory owners must approve objectives, retention, encryption and provider-specific disaster recovery; local drill is insufficient. |
| HTTPS, proxy, headers, secure session deployment | Infrastructure — critical | **blocked** | Offline production assertions verified; actual endpoint/certificate/proxy/SPA headers not deployed or measured. |
| Logs, monitoring and load | Infrastructure — high | **blocked** | No live alert test, retention/access approval or realistic concurrent load exercise. Account-wide serialization and shared-peer throttle require sizing. |
| Admin provisioning/recovery | Operations — high | **blocked** | Automated auth/revocation covered; operational recovery and responsible owner still need staging rehearsal/sign-off. |
| Factory policies | Factory — critical | **awaiting factory approval** | docs/factory-decision-register.md lists every decision, required evidence and responsible role. No policy is assumed approved. |
| Controlled-pilot scope/training/fallback | Factory/operations — critical | **awaiting factory approval** | Accountable factory owner must approve participants, restrictions and independent fallback records. |
| Bundle/sourcemap warnings | Engineering — low | **blocked** | Non-fatal, not accounting failures; deferred until measured performance needs justify optimization. |

### Dependency disposition

- `braces@3.0.3` / GHSA-vfj7-8cjw-p6xm (high): no published patched release
  found; `fast-glob@3.3.3` remained the direct parent. The sandbox's only call
  used a fixed, trusted TSX discovery pattern, not attacker-provided patterns.
  Replaced that call with Node 24's native filesystem glob and removed fast-glob,
  micromatch and braces from the dependency graph. Preserved nested TSX discovery,
  ignored underscore/private files, hidden files and non-TSX files; regression
  fixture and sandbox build passed. No vulnerable dependency was risk-accepted.
- `postcss-selector-parser@6.0.10` / GHSA-rj75-hqrm-r3gf (moderate): direct parent
  `@tailwindcss/typography@0.5.20` was latest and still pinned the vulnerable
  major. Code search found no prose/typography usage. Removed the unused plugin
  declaration and dependency instead of forcing a major parser override.
  Application CSS output retained the same filename/size after removal.
- Final dependency scan: **0 critical/high/moderate/low findings**.
  Static security and privacy/dataflow scans also completed with **0 findings**.
  These are scan results, not a claim of complete security.

### Remediation commands and verification

- `pnpm --filter @workspace/yieldloop remove @tailwindcss/typography`
- `pnpm --filter @workspace/mockup-sandbox remove fast-glob`
- Full PostgreSQL command in the original table: **81 passed**, 55.128s.
- Original offline command plus `config.test_request_limits`: **32 passed**,
  2.112s.
- After adding offline production session/HTTPS/TLS/guard assertions:
  `python -B artifacts/api-server/backend/manage.py test config.tests --settings=config.schema_settings`
  — **8 passed**, 1.901s (7 previously covered plus 1 new test).
- `ruff check artifacts/api-server/backend`: pass.
- `pnpm run typecheck` and frontend lint: pass.
- App build: pass, 11.10s; sandbox build with PORT=22518 BASE_PATH=/: pass, 1.72s.
- Native Node glob regression using temporary nested/public/private/hidden files:
  pass, exactly the two expected visible TSX files discovered.
- Three committed cutting frontend geometry tests: pass.
- Migration drift (`makemigrations --check --dry-run`, offline schema settings):
  no changes detected. No migrations added/applied outside isolated test setup.

### Staging and decisions

See **docs/staging-recovery-runbook.md** for architecture, exact configuration
requirements, offline versus deployed evidence boundaries, safe schema workflow,
and isolated recovery procedure. See **docs/factory-decision-register.md** for
approval records. Neither document enables writes or grants factory approval.

### Bilingual/accessibility remediation evidence

Tested the built app at 390×844 against the identity-guarded isolated test DB:
all three roles signed in/rendered in English and Arabic; Supervisor Draft PATCH
denied with 403 and no revision change; Operator viewed populated Open measurements
and reports without write controls; Manager jobs/reports paginated 21 jobs as
20+1; Arabic quantities remained LTR. Mobile cards did not widen the document.
The Compare table scrolled within its 333px region (512px content), including
keyboard-focusable controls; document width stayed 375px. Both localized
“Layout source” labels were verified.

The browser pass found and remediation fixed:

1. **Critical axe finding:** viewport maximum-scale=1 prevented mobile zoom.
   Removed that restriction; recheck confirmed unrestricted viewport metadata.
2. **Serious axe finding:** unselected role descriptions inherited opacity 0.6,
   yielding **2.86:1** small-text contrast. Removed opacity; measured recheck
   **7.46:1 unselected / 6.61:1 selected**. Axe-core 4.10.3 reported zero WCAG
   2.1 A/AA violations on the checked English and Arabic home pages.
3. Cutting custom selects, material search and piece-label errors lacked
   programmatic associations. Linked actual error elements; invalid save now
   selects the first invalid scenario and focuses its first invalid control.
   Arabic recheck verified every listed association and focused stock label.
4. Save-dialog close lost focus to BODY. Added restoration to enabled Save or
   the plan-name control when Save becomes disabled. Keyboard Cancel restoration
   was confirmed after animation frames; successful-save fallback was code/type
   checked but not re-exercised by the focused tester.
5. Focused recheck found scenario-name error text incorrectly said plan name.
   Replaced it with dedicated English/Arabic scenario-name text. This small copy
   correction was verified by source inspection, typecheck/lint/build, not
   another browser pass.

After final copy correction, frontend typecheck/lint/build passed (10.60s).
App/sandbox workflows were restarted successfully after the substantive batch.
No claim of whole-app WCAG certification: physical devices, screen readers,
complete contrast audit across all pages, successful-save focus fallback, and
populated inventory pagination remain unverified in this pass. Previous cutting
mouse/touch/keyboard evidence remains valid; the algorithm was not changed.
Observed anonymous `/api/v1/auth/me` 401 and intentional Supervisor 403 were
expected, not unexplained application failures.

### Recovery evidence and safety

Executed the committed recovery drill after stopping the synthetic browser
server. Source and destination are fixed isolated test DB names, with source
cluster identity asserted. Initial PostgreSQL 17.5-client restore failed on
unsupported transaction_timeout. A compatibility branch removes only that
session SET for pre-17 servers, then restores transactionally with fail-on-error.
Restored public-table row fingerprints and sequence values matched exactly.
Strict constraint text differed on text-array CHECK casts; that gate remains
**blocked**, not accepted based on apparent equivalence. Diagnostic comparisons
did not find row/sequence differences. See the recovery runbook for details.

No development data or production database was accessed by the browser or drill.
No production migration, deployment, default credential, inventory consumption,
or write-guard weakening occurred. Temporary restore databases/archives were
removed even on failure; synthetic source fixtures/private credentials were
cleaned up after verification.

### Prioritized remaining actions

1. **Infrastructure/security:** separately approve target-specific write
   authorization and least-privilege staging roles; current guard stays closed.
2. **Infrastructure/engineering:** complete semantic constraint recovery
   verification, test offsite/cluster-loss recovery, and approve RPO/RTO.
3. **Factory:** resolve and sign each decision-register entry and bounded-pilot
   scope/training/fallback; do not infer accounting or consumption policies.
4. **Infrastructure:** verify actual HTTPS/proxy/cookie/CSRF/SPA security headers,
   log controls, monitoring alerts, provisioning and recovery in staging.
5. **QA/factory:** finish the explicitly unverified accessibility/device cases.
6. **Engineering/operations:** measure concurrent load, shared-peer throttling
   and account-lock contention using representative factory load.
7. **Release owner:** re-evaluate controlled-pilot readiness from that evidence.
   Automated passes alone do not authorize release. **Current verdict: NOT READY.**

## Original assessment — historical evidence (verdict: NOT READY)

The paragraphs below record the original assessment, including advisories and
browser gaps subsequently remediated above. Use the release-gate status table at
the beginning of this document for current dispositions.

The supported workflow passes automated cross-module acceptance, but the current
workspace is **not ready for operational production or a deployed factory pilot**.
This is not a finding that its accounting is incorrect. Release gates remain:

1. The database guard intentionally enables writes only on the verified
   development target and explicitly named test database. Production connections
   start read-only and are never approved by that guard. Session creation and
   operational writes therefore cannot work in a production deployment as-is.
   This safeguard was preserved, not bypassed.
2. No production-like staging deployment, backup restoration, least-privilege
   database access, HTTPS/proxy configuration, monitoring or recovery exercise
   was verified. A passing local build is not evidence for these properties.
3. Two dependency advisories remain in development/build tooling, requiring
   resolution or explicit, documented risk acceptance for the release process.
4. Factory owners have not approved the operational policies below or signed off
   on the bounded pilot scope. Arithmetic balance is not approval/completion;
   registered offcuts are not physically verified reusable stock.

The MVP can continue **isolated evaluation with synthetic data**. A later
controlled-pilot decision should be based on closing the relevant gates, not
silently enabling excluded workflows.

## Architecture and lifecycle inspected

Reviewed the four YieldLoop skills, phase 3–7 records, current endpoint routing,
permissions, mutation services, account/session security, serializers, models,
migrations, database guard, frontend architecture and existing test cases.
The authoritative implementation is the Django modular monolith, not the unused
Express/Drizzle scaffolding. Reports use repeatable-read, read-only transactions.
Transactions recheck account/session identity and lock the source job before
operational writes. Revision checks and unique request identifiers protect
applicable mutations; append-only snapshots preserve corrections and history.

| Capability | Manager | Supervisor | Operator |
|---|---|---|---|
| Create Draft job | Yes | No | No |
| Open Draft | Yes | Yes | No |
| Change title | Draft/Open | No | No |
| Change notes | Draft/Open | Open only | No |
| Cancel Draft/Open | Yes | No | No |
| Record/void actual kg measurements | Open only | Open only | No |
| Register/void offcut lot | Open source only | Open source only | No |
| Create/revise/evaluate cutting plan | Draft/Open | Open only | No |
| Read jobs, measurements, plans, inventory and reports | All | All | Open sources only |
| Create immutable material definition/manage employees | Yes | No | No |

Cancelled is terminal; historical records remain readable to authorized roles.
Completed, approval, reservation and consumption are not supported states or
workflows. Operator visibility is all Open jobs in this single business, not
per-employee assignments or multi-tenant isolation.

## New repeatable end-to-end acceptance

`reports/test_acceptance.py` adds two PostgreSQL acceptance tests. Test setup
asserts the exact isolated database name and creates three roles with ephemeral
random passwords, never default credentials. Business inputs are deterministic.

1. Authenticate all roles through real session/CSRF endpoints.
2. Verify Manager-only Draft creation, Operator hidden Drafts and Supervisor
   opening a job.
3. Record 1200 kg issued, 900 good, erroneous 250 scrap, and 60 offcut.
   Verify signed variance −10 kg.
4. Void 250 scrap: variance +240 kg. Replace with 240: accounted 1200,
   variance 0, yield 75%, scrap 20%.
5. Register the 60 kg offcut; assert source identity and compatibility
   `unverified`. The complete material state is unchanged. Direct source
   correction is rejected while its inventory registration remains active.
6. Generate two cutting scenarios, including a changed board width. Manager and
   Supervisor runs produce identical results. Save, reopen as Operator, revise,
   reject duplicate/stale saves, and retain two revision snapshots.
7. Assert planning did not add reconciliation snapshots, alter material state,
   change inventory, or change report totals/rows. Report generation timestamps
   are intentionally excluded from equality: they identify the read operation.
8. Void inventory first; material state remains unchanged. Then void the source
   measurement and replace it with 50 kg offcut, registering a new lot.
   Assert variance +10, available stock 50, original voided stock 60 and no
   double-counting of historical measurements or snapshots.
9. Verify report material/status filtering, page-size limit and Operator totals.
   Cancel the job: Operator can no longer read it, accounting/planning writes
   fail, Manager retains plan history.
10. Verify cross-job source references fail, Operator writes fail, missing CSRF
    fails, Manager deactivation revokes an existing Supervisor session, and
    logout removes Operator access.

The pre-existing suites additionally exercise fractional values, both reference
examples, zero denominators, rates over 100%, hidden materials, independent report
pagination, inclusive calendar-date filters, Jerusalem DST, current-balance
cohorts, concurrent report consistency, concurrent writers, audit rollback,
immutable history, invalid units, geometric precision, exact fits, margins,
kerf, prohibited/permitted rotation, impossible layouts and unplaced quantities.

## Verification commands and actual results

All commands run from repository root. No production commands were executed.

| Executed check | Actual result |
|---|---|
| `python -B artifacts/api-server/backend/manage.py test cutting reports inventory materials jobs accounts.test_flows --settings=config.test_settings --keepdb --noinput` | PASS: 81 tests, no skips, 53.528s. |
| `python -B artifacts/api-server/backend/manage.py test accounts.tests audit.tests health config.tests --settings=config.schema_settings` | PASS: 30 tests, no skips, 2.113s. The printed readiness-failure message is an exercised failure-path test, not a suite failure. |
| `python -B artifacts/api-server/backend/manage.py test config.test_request_limits --settings=config.schema_settings` | PASS: 2 tests, no skips, 0.005s; oversized JSON/form parsing rejected under a small configured limit. |
| `ruff check artifacts/api-server/backend` | PASS after removing unused lint suppression comments in the new browser harness. |
| `python -B artifacts/api-server/backend/manage.py makemigrations --check --dry-run --settings=config.schema_settings` | PASS: no changes detected. |
| `pnpm --filter @workspace/api-spec run codegen` | PASS: OpenAPI validation/generation and generated-library typecheck. |
| `pnpm run typecheck` | PASS: libraries, app, API scaffold, sandbox and scripts. |
| `pnpm --filter @workspace/yieldloop run lint` | PASS. |
| `PORT=22517 BASE_PATH=/ pnpm --filter @workspace/yieldloop run build` | PASS: 1869 modules, 10.60s; JS 688.65 kB / 202.31 kB gzip. Non-fatal existing UI sourcemap and >500 kB bundle warnings remain. |
| `python -B artifacts/api-server/backend/manage.py check --deploy --settings=config.session_settings` | Executed against development configuration: 3 warnings, not a production pass. W002 missing frame middleware, W004 development HSTS=0, W008 development HTTPS redirect disabled. |
| `python -B artifacts/api-server/backend/manage.py showmigrations --plan --settings=config.test_settings` | All existing migration nodes applied in the isolated test DB; no new migration created. |
| Dependency scan | Initially 12 advisory records (1 critical, 4 high, 7 moderate); after updates 2 (0 critical, 1 high, 1 moderate). Some initial DRF records were duplicate aliases of the same advisories. |
| Static security scan | Completed, not incomplete; 0 findings. Not proof of vulnerability absence. |
| Privacy/dataflow scan | Completed; 0 findings. Not a privacy certification. |

**Total automated backend tests: 113 passing; zero skipped.**
An initial acceptance assertion failed only because it compared the report's
generation timestamp across reads; it was corrected to compare business totals
and rows. The corrected acceptance test and then the complete suite passed.
An initial lint run flagged four unnecessary `noqa` comments; final lint passed.

## Security and integrity assessment

### Changes made

- Upgraded DRF 3.16.1 → 3.17.2, locked below 3.18. Both the active Python runtime
  and frozen UV runtime reported 3.17.2. Small, offline regression tests verified
  request-size rejection for JSON and form payloads. JSON-only rendering also
  avoids the advisory's AdminRenderer disclosure path.
- Updated compatible transitive packages: brace-expansion 5.0.12,
  fast-uri 3.1.8, proxy-addr 2.0.8 and source-map-js 1.2.2. Existing package
  firewall and minimum-release-age controls were retained.
- No role powers, reconciliation formula, lifecycle state, database write guard,
  production configuration or authentication mechanism was changed.

### Residual advisories

| Severity | Finding | Reachability and action |
|---|---|---|
| High | `braces@3.0.3`, GHSA-vfj7-8cjw-p6xm | Through sandbox development `fast-glob → micromatch`; latest available braces/parent check yielded no fix. No YieldLoop request endpoint accepts glob patterns. Keep untrusted patterns out of tooling; require patched dependency or explicit release-tooling risk acceptance. |
| Moderate | `postcss-selector-parser@6.0.10`, GHSA-rj75-hqrm-r3gf | Through `@tailwindcss/typography`, a build dependency; ordinary trusted-source builds are not the advisory's attacker-selector request path. Updating the direct parent to latest compatible left it unresolved. Fix requires a major transitive version or upstream release; not forced blindly during this assessment. |

The initial critical proxy-addr finding was in the unused Express dependency
tree, not Django's active proxy handling, but was still updated. The remaining
findings are not demonstrated live application exploits. They are also not
silently dismissed as harmless.

### Controls reviewed

- Write endpoints enforce roles in Django, not only buttons. Hidden job/source
  lookups are scoped before returning content; foreign child IDs are rejected.
- Same-origin sessions: Secure, HttpOnly, SameSite=Lax cookies, fixed 12-hour
  lifetime, CSRF-protected unsafe requests, no wildcard trusted origins.
- Login counters are database-backed, keyed by HMAC; forwarded client IPs are
  not trusted for throttling. The shared proxy-peer limit can affect many users
  behind one gateway; realistic load testing remains outstanding.
- Account changes invalidate existing session hashes. Operational transactions
  re-read actor state under the account advisory lock; source-job locks serialize
  cancellation with writes. This favors correctness over high write throughput.
- Decimal kg values and integer-grid geometry are authoritative server-side;
  quantities, units, counts, limits and client-owned fields are validated.
- Validation responses expose field codes, not submitted passwords or bodies.
  DEBUG is false. Access logs contain paths/statuses, not request bodies;
  production log access, retention and redaction still need operational approval.
- Audit immutability is ORM-level plus database constraints, **not** tamper-proof
  against a privileged SQL administrator. Database least privilege/backups matter.
- Production verified database TLS and explicit allowed hosts are required.
  Frame protection for the actual deployed SPA must be set at its serving edge;
  adding an API-only header would not secure the frontend. Workspace preview
  framing is not evidence of a production clickjacking policy.

## Browser, accessibility and responsive acceptance

`acceptance_browser.py` serves the built SPA and Django API on loopback
`http://localhost:8099`, using **only** `config.test_settings`. It asserts the
isolated database name and expected cluster, refuses pre-existing test users,
creates private mode-0600 temporary credentials and never prints passwords.
The test suite must finish first; do not run DB-flushing tests concurrently.
This is a test harness, not a deployment server. Its fast password hasher is
inherited from test settings and must never be used for real accounts.
After verification, the loopback server was stopped, its private credential file
removed, and synthetic browser fixtures cleared only after asserting the isolated
test database name. No development business data or existing employee was changed.

Browser run completed the English desktop journey across all three roles:
fresh rejected login followed by successful automatic navigation; Manager job/
material creation; Supervisor recording; 100 issued, 80 good, scrap corrected
15→14, 5 offcut; traceable unverified inventory; final variance +1; report
filters and injected 503/retry recovery; saved/reopened two-scenario cutting plan
with two revisions, unchanged kg totals; keyboard cancellation and read-only
history. No JavaScript exception was observed. Some sign-in requests returned
401 without captured paths, so they cannot all be classified as expected.

The run found a major Arabic home-page overflow at 390×844 (463px document
width). Fixed grid/flex minimum sizing and wrapping for long usernames without
hiding content. A focused authenticated recheck passed: document/body width
375px within the 390px viewport, zero horizontal page offset; identity and
username fit. Navigation remains intentionally internally scrollable.
Frontend typecheck/lint/build passed again after this fix (build 11.08s).

Accessibility evidence: login fields/errors exposed accessible labels, Arabic
RTL direction, LTR numeric quantities, keyboard cancellation focus sequence,
focusable Compare scrolling control, and mobile inventory fitting its viewport.
Screenshots captured corrected RTL home, inventory trace, corrected/voided scrap
and scenario comparison. Both application workflows restarted cleanly afterward.

**Not verified in this pass:** Arabic mobile Manager/Supervisor sign-in;
Supervisor Draft denial in the browser; populated Open-job Operator views;
browser pagination; mobile canvas/compare scrolling; exhaustive keyboard
navigation; contrast measurement; axe; physical touch/screen-reader testing.
Role denial and pagination are covered by backend tests, not substitutes for
these UX checks. Initial browser run stopped on the overflow; the focused
post-fix check does not constitute a full second acceptance pass.

Minor residual: comparison's separate Scenario row repeats “Shelf v1 baseline”
while distinct headers/dimensions/results are correct. Review its labeling in
later UX work; no numeric mismatch was observed. Accessibility certification
and full bilingual mobile acceptance are **not claimed**.

## Factory decisions awaiting explicit approval

1. Accepted signed variance, absolute/relative tolerances, rounding and escalation.
2. Rework classification, whether/when it remains accounted stock, and prevention
   of double counting on eventual reprocessing.
3. Completion/closure approval, responsible roles and reconciliation prerequisites.
4. Operator measurement-recording authority, supervision and any assignment scope.
5. Material identity, immutable specifications, mixed-material jobs, grade,
   thickness, density, allowed units/conversions and compatibility verification.
6. Offcut physical inspection/suitability; reservation, consumption, partial
   quantities, receiving-job accounting, cancellation and reversal policies.
7. Actual stock dimensions/units and availability, kerf, each edge margin,
   rotation/grain direction, defect zones, clamping, machine limits and cut order.
8. Whether reporting remains **current balances for job-creation cohorts** or
   requires true as-of historical snapshots/production occurrence dates.

No value is inferred from kg measurements. No geometric plan is a machine-ready
cut sequence or guarantee of globally optimal nesting.

## Safe deployment and migration checklist — NOT executed

1. Obtain factory sign-off for the bounded pilot, prohibited workflows, named
   data owner, measurements, training and manual fallback.
2. Resolve/accept residual dependency findings; freeze the reviewed source and
   lockfiles; rerun acceptance after any changes.
3. Design and separately approve production database write enablement and
   least-privilege runtime/migration roles. **Do not remove the guard or reuse
   development target identifiers.** Current production must remain read-only
   until that separate work has been reviewed and tested.
4. Provision a staging clone with verified TLS, explicit hosts, stable secret
   management, trusted-proxy behavior and same-origin API/static routing. Never
   use test settings, the loopback harness or development Vite server in production.
5. Take a backup and demonstrate restoration. Record recovery objectives,
   migration owner, maintenance window and rollback/forward-repair procedure.
6. Establish managed versus external database ownership before choosing a schema
   workflow. Replit-managed production uses the reviewed Publish schema-diff/
   confirmation flow only when separately authorized; do not add production DDL
   scripts, build hooks or startup migrations. External databases require their
   own explicitly approved migration/recovery procedure.
7. Verify Django migration state and schema constraints in staging before any
   write authorization. Phase 8 introduces **no schema migrations** and this
   assessment does not authorize production schema changes.
8. Serve the production-built frontend, configure frame/CSP and HTTPS headers at
   the actual serving layer, validate secure cookies/CSRF/hosts and run
   `check --deploy` in real production-equivalent configuration.
9. Use the trusted first-Manager provisioning procedure; no default credentials.
   Verify account recovery, revocation and least-privilege role checks.
10. Exercise the supported end-to-end workflow in staging, verify reports against
    persisted records, test backup recovery, representative concurrent load,
    logging/alerting and accessibility with actual factory users/devices.
11. Obtain explicit pilot approval, monitor a small cohort, and keep independent
    production records until the owner accepts accuracy and operating procedures.

No publish/deploy action was performed or requested. Stop after this assessment.
