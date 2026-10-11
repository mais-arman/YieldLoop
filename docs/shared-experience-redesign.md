# Shared application experience redesign

Implemented 2026-10-11 in the existing frontend. No API, schema, backend
permission, accounting, geometry algorithm or write-guard changes.
Release readiness is still governed by phase-8-acceptance.md; no deployment.

## Screens and behavior

- Shared navy sidebar, mobile/tablet drawer, page context and account menu.
  Common order: Dashboard, Production Jobs, Cutting Studio, Inventory, Reports.
  Only Manager gets Employees; route authorization remains enforced.
- `/` and authenticated `/login` redirect to Dashboard. Removed redundant
  Overview/role showcase and development-phase labels.
- Dashboard: compact KPIs, material-filtered quantities, first-ten-cohort-job
  attention list with explicit scope, recent/cohort links, collapsible filters.
- Reports: detailed filters, definitions, paginated job/lot tables, source links,
  focusable internal scroll regions without page overflow.
- Jobs: desktop table, mobile/tablet cards, predictable actions; details organize
  identity, lifecycle actions, cutting and material sections.
- Materials: issued/accounted totals, distinct good/scrap/offcut/variance,
  grouped input/output records and authorized first-entry action.
- Cutting: three-column desktop workspace, Setup/Layout/Results on smaller
  screens, collapsible inputs, early board outline, Rectangle/Square actions,
  exact-decimal presentation without changing stored calculations. No usable-area
  claim until margins are explicitly valid. Existing canvas interactions remain.
- Inventory: concise foundation-only notice with optional policy details.
- Employees: consistent account management, role filter/counts and role-change
  confirmation. Password and system-health presentation updated.
- English/Arabic strings and direction-aware layouts retained throughout.

## Files changed

Under `artifacts/yieldloop/src/`:

- `App.tsx`
- `components/app-shell.tsx`, `components/inventory-ui.tsx`
- `components/materials/materials-section.tsx`
- `components/cutting/input-editor.tsx`, `plan-editor.tsx`,
  `scenario-workspace.tsx`, `result-panel.tsx`
- `lib/i18n.tsx`
- New `lib/ui-i18n.ts`, `lib/display-format.ts`, `lib/display-format.test.ts`
- `pages/reports.tsx`, `jobs.tsx`, `job-detail.tsx`, `employees.tsx`,
  `password.tsx`, `connectivity.tsx`, `cutting-studio.tsx`, `login.tsx`
- Removed `pages/home.tsx`

Documentation: this report and the shared-role-experience project memory.
Existing board-canvas implementation, API adapters and backend remain unchanged.

## Tests actually run

```sh
python -B artifacts/api-server/backend/manage.py test cutting reports inventory materials jobs accounts.test_flows --settings=config.test_settings --keepdb --noinput
python -B artifacts/api-server/backend/manage.py test accounts.tests audit.tests health config.tests config.test_request_limits --settings=config.schema_settings
pnpm --filter @workspace/yieldloop run typecheck
pnpm --filter @workspace/yieldloop run lint
PORT=22517 BASE_PATH=/ pnpm --filter @workspace/yieldloop run build
# Frontend tests run by the implementation helper from artifacts/yieldloop:
npx --no-install tsx --test src/lib/*.test.ts
```

- Backend: **81 passed in 58.376s**, **33 passed in 2.157s** (114 total).
  The readiness-failure log is from the expected negative health test.
- Frontend: **8 tests passed** (existing placement tests plus display precision,
  early preview/margins and square-lock helper tests).
- Final frontend typecheck/lint passed; final build passed in **10.86s**.
  Existing sourcemap and >500KB bundle warnings remain non-fatal.
- Vite workflow restarted after the implementation batch.

## Browser evidence

Used the loopback-only built-SPA harness on `localhost:8099`, backed exclusively
by the identity-guarded `test_yieldloop_phase2b` database, with private ephemeral
credentials. No application/deployment data used.

Main pass covered all three roles, English/Arabic, desktop/tablet/mobile:
Manager-only Employees route denial for other roles; account controls and
Manager self-protection; password required validation; health status; distinct
Dashboard/Reports; materials 100 kg issued / 80 good / 5 scrap / 15 offcut,
zero variance and 80% yield; source-linked inventory, including a voided lot.
Job update advanced revision; stale save returned 409 with Load latest.
An injected single Jobs 503 produced Retry and recovered to a successful list.

Cutting checks covered manual placement, keyboard movement/rotation/Delete,
invalid out-of-bounds rejection, reset confirmation and genuine CDP touch drag.
Invalid save from Layout revealed Setup and focused the invalid width field.
Unsaved touch/reset/Delete/invalid-input changes were discarded; reopening
preserved revision 1 and placement x=1, y=10, 400×800 mm, rotated.

The first pass found four regressions, fixed before the targeted recheck:

1. Arabic 390px Dashboard overflow: grid sections now shrink correctly.
   Recheck document/client/body widths all 375px; panels fit.
2. Tablet Jobs overflow: cards now remain through 1279px, fixed table starts
   at 1280px. Verified at 390, 768, 1279, 1280 and 1440px without overflow.
3. Job-detail section navigation scrollbar: wraps instead.
   Arabic mobile navigation client/scroll width both 351px.
4. Drawer Escape lost focus to BODY: explicit restoration to navigation opener.
   Targeted keyboard recheck passed.

Targeted recheck also seeded 20 more jobs: Jobs and Reports showed 20 records on
page 1 and one on page 2, with correct Previous/Next state. Report table regions
were focusable with visible outlines; their scrolling stayed within the page.
Desktop Dashboard/Cutting and Arabic mobile screenshots were visually reviewed.

## Final small fixes and verification limits

- Screenshot review found Jobs and Cutting both highlighted on a cutting route.
  Route matching now selects only Cutting; source/typecheck/lint/build verified.
- The tester confirmed report-region focus but not native arrow-key scrolling
  in RTL. Added explicit physical left/right scrolling for focused table regions,
  leaving descendant controls untouched. Compile/build verified; this final small
  handler was not re-exercised in a browser.
- Square-lock state is an editing convenience and is not persisted; exact equal
  width/height values are persisted in the existing rectangular part model.
- Square/preview helpers passed unit tests. The browser report did not explicitly
  certify every Add Square/preview state, comparison/history interaction, or the
  fresh rejected-login→successful-login transition. Existing backend/geometry
  coverage remains, but no exhaustive browser claim is made for these paths.
- Inventory-lot report pagination only had one page in this pass.
- Touch was browser-emulated, not physical-device certification; no screen-reader
  certification or exhaustive contrast audit is claimed.

The harness was stopped, synthetic fixtures were flushed only after asserting
the exact isolated test DB name, and its private credential file was removed.
No application data, production records or inventory consumption changed.
