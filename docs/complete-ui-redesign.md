# YieldLoop complete UI/UX pass

## Scope

Existing React/Vite/Tailwind application retained. No new UI framework, API,
business feature, dependency, migration, production configuration or deployment.
Application records were not seeded or changed. Test-only temporary accounts
use random names/passwords in the existing isolated test database.

## Implemented surfaces

- Shared shell: collapsible remembered desktop sidebar, mobile drawer, centralized
  role menus/route checks, account dropdown language selection, password and logout.
- Branding/login: navy/teal palette, bilingual requested copy, original YieldLoop
  vector logo. No public signup or displayed credentials.
- Operator: `/jobs` operational home, Open-job recording links and scoped material
  exceptions. No management dashboard, Reports, comparison or Employees in its menu.
- Supervisor: `/dashboard` production overview starts with exceptions and omits
  management composition charts; operational navigation and Reports remain.
- Manager: management dashboard, authorized employee controls, full operational
  navigation. Materials/reconciliation uses existing job sections, not a dummy route.
- Jobs/details: compact paging, direct recording links, materials/closing first on
  Open jobs and reordered section links; other statuses keep identity/details first.
- Materials/inventory/detail: existing authoritative balances, corrections and
  history retained, shared styling/pagination and reduced duplicate guidance.
- Reports/comparison: shared styling and paging, removed generated/filter-summary
  metadata and expanded definition panels; filters and calculation semantics retained.
- Employees: search, role filter and 15-row client paging over the existing response.
  Creation/reset/deactivation safeguards remain unchanged.
- Cutting Studio: existing three-column desktop workspace and mobile Setup/Layout/
  Results retained; tabs linked to panels accessibly. Hidden panels remain mounted.
  Shared palette and compact plan/history paging; no geometry or placement changes.
- Packaging/evidence/password: shared visual system, consistent headings and reduced
  decorative movement. Packaging retains its concept disclaimer and hides unavailable
  AI proposal controls. Evidence remains available without AI.

Some existing detail/form layouts were retained where they already supported the
required workflow; this is not a replacement of every component or screen structure.

## Sign-in cause and correction

The form already prevented default submission. The unwanted document navigation
was the explicit `window.location.replace` in its success handler.

Login now awaits cancellation of old queries, removes old protected data, publishes
the identity returned by the secure login response and uses Wouter replace navigation.
`auth/me` accepts React Query's AbortSignal. A synchronous submission lock supplements
the pending-state button. A second identity-watch cleanup on anonymous-to-user
transition was removed: it could delete newly mounted protected queries and strand
their loading state. CSRF acquisition/rotation, cookies, backend validation, forced
password change and invalid-session handling were not weakened.

## Authorization boundaries

Backend remains authoritative. Operator reporting APIs still permit their previously
authorized Open-job scope; hiding report/comparison screens is a stricter **UI**
policy, not a claim of new server denial. Employee APIs remain Manager-only.
No independent material-catalogue administration route exists.
Optional packaging remains accessible to Operators directly but outside the primary
operational menu. Health remains public as before, with technical navigation removed.
Changing these backend policies requires separate explicit business-rule approval.

## Automated checks

```sh
pnpm --filter @workspace/yieldloop run typecheck
pnpm --filter @workspace/yieldloop run lint
cd artifacts/yieldloop
npx tsx --test src/lib/*.test.ts
PORT=5000 BASE_PATH=/ pnpm build
```

Typecheck/lint/build passed; **38 frontend tests passed**, including cancellation of
a stale anonymous identity response, logout cleanup, role landing/navigation and
single/multi-page presentation. Existing Vite sourcemap and large-bundle warnings remain.

Backend: an existing-database DiscoverRunner verified the explicitly named
`test_yieldloop_phase2b` development target, empty account/job tables and zero pending
migrations. It overrode database setup/teardown, so **no migrations were executed**.
The combined run found 147 tests: 145 passed and 2 failed because offline-only
schema/health tests were accidentally included under the active database profile.
All 114 database-backed tests passed. The offline group was then rerun correctly:

```sh
python -B artifacts/api-server/backend/manage.py test \
  accounts.tests audit.tests health config.tests config.test_request_limits \
  --settings=config.schema_settings
```

**33/33 passed.** The expected negative readiness test logs a PostgreSQL failure.
Database-backed coverage included account/session flows, jobs/core, materials,
inventory, reports/acceptance, cutting and assistance. No assertions were weakened.

## Data preservation

Read-only transactions compared ordered-row SHA-256 fingerprints before and after
the implementation for all eleven jobs, material, inventory, cutting and audit
tables. **All matched**, including persisted IK-202/IK-203 balances, revisions,
history and audit records. Test data was created only on the loopback test server.

## Known limits

- Employee paging is client-side because the existing API returns a plain list.
  No new unbounded request was introduced and no backend pagination was invented.
- Operator home exceptions preview the first ten accessible Open jobs.
- AI provider remains unavailable: no dead launcher, no credentials/configuration
  changes, no live AI claims or usage costs.
- This UI pass does not change existing recovery or production release gates.

## Actual browser verification

Used the loopback-only real Django test server at localhost:8099, random temporary
credentials and the isolated database—not mocked authentication or the application
database. The server was started with:

```sh
python -B artifacts/api-server/backend/acceptance_browser.py
```

Passed:

- Invalid credentials then valid login; double-click produced one successful
  login POST. A document marker survived and no beforeunload/document navigation
  occurred. Fresh Supervisor and Operator logins settled without manual reload.
- Manager session restoration after a deliberate protected-page reload; CSRF
  endpoint 200 and bad-token login 403; logout and cleared-cookie route denial.
- Three role landings; unauthorized Employee route denied; account-menu EN/AR,
  mobile drawer and desktop sidebar collapse.
- Real job creation/opening, unique material, 100 kg issue / 80 good / 15 scrap /
  5 offcut; offcut void with reason, audited history, recalculation, replacement,
  zero-variance closure and completed read-only state.
- Disposable employee create, role edit, password reset and deactivation.
  Employee search/filter; 15-row first page and one-row second page via Next.
  Searching the 12 extra fixtures hid the unnecessary one-page pager.
- Cutting: ArrowDown moved a part by 1 mm; ArrowRight was rejected by kerf
  validation; mouse drag moved it to y=40.007 mm. Saved revision 1, left the
  editor, reopened and verified both coordinates, setup and valid results.
- Arabic mobile Setup/Layout/Results and 768px tablet results; provider-off
  evidence view without chat controls; packaging concept disclaimers; bilingual
  password form read-only.

The first browser pass found long-username mobile overflow and post-login loading
that warranted investigation. Heading wrapping and identity cleanup were fixed.
Targeted follow-up confirmed settled 390px layouts fit and both role data queries
finish without reload. Final typecheck/lint/build passed after these fixes.

Limits: touch dragging was not exercised; responsive browser emulation is not
physical-device testing. Previous-page clicking was not substantiated, although
pagination helpers and boundary states passed automated checks. Inventory lot
source/history and a populated same-machine comparison were not browser-verified
in this pass (isolated fixtures lacked a registered lot/comparable pair); their
backend regression coverage passed. Screenshots are representative, not every
page × language × viewport combination. No password was changed on the three
login fixture accounts and no live AI was called.
