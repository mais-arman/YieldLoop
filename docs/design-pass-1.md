# Design improvement pass 1

## Scope and preservation

Focused login, branding, shared shell, dashboard and assistant presentation pass
for Ibn Khaldoun Printing and Publishing. Implemented in the existing React app.
No backend, API contracts, schema, migrations, dependencies, database records,
write guard, authentication/CSRF rules, accounting formulas, inventory policy,
cutting algorithms, production configuration or deployment were changed.

## Changed files

All application paths below are under `artifacts/yieldloop/`:

- `src/index.css`: shared deep-blue/teal light theme and card treatment.
- `src/components/brand.tsx`: original sheet/cut/recovery-loop SVG and globe control.
- `src/components/app-shell.tsx`: lighter shared sidebar/header; assistant provider;
  technical health links removed from employee navigation, route retained.
- `src/pages/login.tsx`: bilingual product/factory copy and restrained illustration;
  existing login mutation, session transition, validation and password control retained.
- `src/pages/reports.tsx`: redesigned Dashboard using the existing report query;
  detailed Reports retains its filters, definitions, pagination and drill-downs.
- `src/App.tsx`: passes the authenticated user to the existing Dashboard component.
- `src/pages/assistant.tsx`: recorded/calculated evidence retained, full-size chat and
  persistent unavailable warning removed.
- `src/components/assistant-panel.tsx`: conditional floating panel, consent, notes
  opt-in, authorized job selection, uncertainty/source responses and keyboard close.
- `src/lib/ui-i18n.ts`: English and Arabic copy.
- `src/lib/dashboard-data.ts`, `src/lib/assistant-panel.ts`: presentation helpers.
- `src/lib/dashboard.test.ts`: focused regression tests.

## Dashboard and role emphasis

The shared layout uses a welcome heading, compact expandable existing filters,
metric cards, actual job-status composition, a single-material output chart, and
recent jobs with source links. Quantities have kg units; definitions are compact
tooltips instead of a standalone dashboard block. Nonzero net variance remains
visibly identified. No previous-period figures, trend arrows, assignments or
timeseries were invented.

Without a selected material, the dashboard shows authorized counts and prompts
for material selection rather than combining different materials' weights.
Selected-material cards use the server's issued/good/scrap/offcut/yield values.
Recharts is the existing chart dependency; no chart package was installed.

- Operator: permitted Open work, recording/job links and material information.
- Supervisor: Open-first work emphasis, reconciliation exceptions and comparison.
- Manager: overall authorized indicators, inventory counts and management links.

The layout and core components are shared. Employee navigation remains Manager-only.
Recent-job/attention previews use the first ten returned jobs; detailed lists remain
available. Open-first headings do not falsely describe every Supervisor result as Open.

Removed from the normal dashboard: standalone definitions, freshness/refresh
block and system status. Error retry, data-loading/empty states and automatic
query refresh behavior remain. Backend health endpoints were not removed.

## Assistant

The floating entry exists only when the server reports availability. It sits at
the logical end of the viewport (right English, left Arabic). The compact panel
retains consent, optional notes, evidence revision checks, same-job response
checks, localized errors and recorded-source links. Closing restores trigger focus.

Suggestions depend on accessible records; comparisons navigate to the existing
comparison page rather than pretending the per-job AI endpoint analyzes two jobs.
The suggestion list uses the currently fetched first page; absent peers do not
produce fabricated suggestions.

With the actual unavailable provider, there is no floating entry, question input
or persistent technical banner. `/assistant` remains an authorized evidence view.
No provider was configured and no live model response was claimed.

## Verification and boundaries

Commands executed:

```sh
pnpm --filter @workspace/yieldloop run typecheck
pnpm --filter @workspace/yieldloop run lint
cd artifacts/yieldloop
npx tsx --test src/lib/*.test.ts
PORT=5000 BASE_PATH=/ pnpm build
# From workspace root:
python -B artifacts/api-server/backend/manage.py test \
  accounts.tests audit.tests health config.tests config.test_request_limits \
  --settings=config.schema_settings
```

Results: frontend **29 tests passed**, TypeScript/lint/build passed; backend
**33 database-free regression tests passed**. The negative health-readiness test
intentionally logs a PostgreSQL-check failure. Existing bundle-size warning remains.
The build requires PORT, as before. The web workflow restarted and served cleanly.
The real proxied login rendered correctly; unauthenticated `/auth/me` returned the
expected 401.

To honor the no-record-changes requirement, no database-backed test suite, seed,
fixture-account creation, login session creation or destructive cleanup was run.
For browser UI checks, a read-only repeatable-read transaction exported authorized
role-shaped response fixtures. Its scope explicitly prohibited database writes.
The export used in-memory synthetic actor objects, not persisted accounts; fixture
read locks were omitted within the stable read-only snapshot. A loopback static
server has no live API or database connection; browser API interception supplies
the fixtures. This checks UI behavior, not live session authentication or a real
provider. Live login/logout with fresh credentials was not exercised in this pass.

### Browser results

The bounded fixture-only pass verified:

- Synthetic login/CSRF/logout and authenticated reload; password reveal, keyboard
  entry and language switching. An initially missing CSRF interceptor was a test
  harness issue, corrected before the successful flow.
- All three role layouts at desktop 1280, mobile 390 and tablet 768 widths;
  Manager employee access and Supervisor navigation restrictions.
- Mixed-material quantities withheld; selecting board displayed **2200 issued =
  1720 good + 340 scrap + 140 offcuts**, with zero variance.
- English/Arabic layouts, dashboard loading skeleton, controlled 503/retry and
  empty state. Read-only reports, inventory, comparison, job/material details
  and the Cutting Studio empty state rendered.
- Unavailable AI entry/form hidden while recorded evidence and the 180 kg
  Setup/layout category remained available.
- Configured **test-only** panel: record-derived suggestions, comparison link,
  consent, notes opt-in, synthetic advisory answer, controlled 503 and retry.

One defect was found: Escape closed the panel without restoring focus. The fix
uses the actual Radix trigger and explicit Escape focus restoration. A focused
follow-up passed at Arabic 390px and English 1280px: Escape restores trigger focus
immediately and after 200ms; Close restores it after the closing animation.
The dashboard's six-column breakpoint was subsequently widened to 1536px and
quantity/unit wrapping added after screenshot review. Typecheck, lint and build
passed after this final CSS-only adjustment; no additional full browser pass ran.

Remaining observations: the previous advisory answer stays visible alongside a
temporary retry error; the mobile drawer briefly appeared clipped during an
intermediate transition, but the settled drawer rendered correctly and a stable
failure was not reproduced. There is no separate Manager page to verify; Manager
uses the common application plus authorized management controls.

Live provider verification remains **BLOCKED (not configured)**. Fresh live
authentication/authorization is **NOT VERIFIED by this fixture pass**. Existing
backend regression tests are not a substitute for that evidence. The existing
recovery/production release gates remain unchanged; this design pass does not
declare the release READY.
