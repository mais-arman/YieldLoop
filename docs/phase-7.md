# Phase 7 — Rectangular Cutting Studio

## Scope and safety

Cutting plans are geometric **proposals**, linked to one production job. They do
not issue material, consume inventory, record production, approve compatibility,
or complete jobs. Weight-based reconciliation and inventory remain unchanged.
The existing material catalog provides an explicit immutable identifier only:
it supplies no thickness, density, dimensions, stock availability or physical
suitability. All pieces in a scenario refer to its selected material identity.
Different scenarios may explore different explicitly selected identities.

Supported unit: **mm**, explicitly selected, with at most three decimal places.
No kg-to-area or other-unit conversion. Numeric input is authoritative; the SVG
is only a scaled view. Areas are mm², returned as six-place decimal strings;
utilization is a percentage returned to three places. The geometry engine uses
integer micrometres (0.001 mm), avoiding floating-point boundary tolerances.

All stock dimensions, supplied board count, piece dimensions/quantity, rotation
permission, kerf, four margins and spacing-only constraint mode require explicit
input. No factory defaults are supplied. Zero kerf/margins are permitted only
when entered. The technical limits are 100000 mm per length, 1–10 identical boards
per scenario, 1–20 piece types, 100 required copies total, and 1–4 scenarios per
plan. These are resource limits, not asserted machine limits or stock levels.

Grain direction, defects, thickness, blade approach/exit, clamping, machine reach,
guillotine cut sequencing and physical material compatibility are unsupported.
The user explicitly selects `rectangular_spacing_only`; this is not confirmation
that unmodelled constraints have been satisfied. There is no actual offcut-stock
selection or suitability recommendation.

## Geometry rule

Board coordinates use a fixed top-left origin: x increases right, y increases
down even in Arabic RTL. The usable rectangle is
`[left, width − right] × [top, height − bottom]`, and must have positive width and
height. Every placed rectangle must be entirely within it, inclusively.

Rotation means exactly 90 degrees, exchanging width and height; permitted only
for piece types explicitly allowing it. No arbitrary angles or resizing.
Each placement identifies one piece type, zero-based copy index and zero-based
board index. A copy may appear only once across all boards, and cannot exceed
the requested quantity or supplied boards.

For any two rectangles on the same board, at least one of these must hold:

```
A.right + kerf <= B.left
B.right + kerf <= A.left
A.bottom + kerf <= B.top
B.bottom + kerf <= A.top
```

This reserves **one minimum inter-piece gap**, not one kerf per piece edge.
Margins already define board-edge clearance, so no additional edge kerf is
silently added. With zero kerf, touching edges are allowed; overlapping interiors
are never allowed. This conservative axis-separation model does not calculate a
cut path or the exact area physically removed by a blade.

Client feedback uses the same integer-grid rule; Django revalidates every saved
or evaluated layout. Client-supplied metrics are rejected; server metrics derive
from accepted dimensions and placements.

## Deterministic baseline: shelf_v1

Objective: find a valid rectangular placement within the supplied identical
boards, trying earlier boards/shelves before opening new ones. This is a
first-fit decreasing-area shelf heuristic, **not globally optimal nesting** and
not proof that the minimum board count has been found.

1. Sort piece types by descending area, descending longest side, then stable key.
2. Process each type's copies in increasing copy order.
3. Try boards in increasing index and their shelves in insertion order.
4. For a shelf, try unrotated first, then rotated only if allowed. A piece must fit
   its remaining width and established shelf height.
5. If no shelf fits on that board, try a new shelf below the last, separated by
   one kerf. The first placed piece fixes that shelf's height.
6. Continue to the next board; report a copy unplaced if no position is found.
7. Independently validate the entire returned layout before returning it.

Shelves are never repacked; cavities above shorter pieces are not revisited.
Heuristic failure is **not** evidence that every possible arrangement fails.
`cannot_fit` means neither permitted orientation fits even an empty usable board.
`not_placed` means no placement is currently present (manual layout or baseline
capacity/heuristic limitation). No piece is silently discarded.

Inputs, placements, results and origin (`manual` / `shelf_v1`) are associated per
scenario. Any manual change switches origin to manual. A saved shelf-v1 claim is
verified by reproducing the baseline and comparing placements; it cannot label
an arbitrary manual layout as algorithm output.

## Metric definitions

| Result | Definition |
|---|---|
| Board area | Explicit full width × full height, mm², not usable-area denominator. |
| Required area | Sum(piece width × height × required quantity), including unplaced copies. |
| Placed area | Sum of areas of valid placed copies only; rotation preserves area. |
| Available boards / area | User-specified board count and count × full board area; not verified physical stock. |
| Board count | Distinct board indices containing at least one placement. |
| Used-board area | Full board area × board count. |
| Utilization | Placed area / used-board area × 100; null if no boards used. |
| Unused area | Used-board area − placed area; includes margins, spacing and cavities. It is NOT reusable offcut inventory. |
| Placed / unplaced | Count of placed copies / requested copies minus placed copies. Unplaced rows identify type, quantity and reason. |
| Valid | All current placements satisfy modelled geometry; does not imply every requested copy is placed or a machine-ready plan. |

Scenarios may have different material identity, board supply or demand, so their
inputs are shown with their results for meaningful manual comparison. There is
no automatic winner, approved plan, optimum claim or weight-yield comparison.

## Persistence, lifecycle and permission matrix

| Action | Manager | Production Supervisor | Cutting Operator |
|---|---|---|---|
| Read plans/history | All jobs | All jobs | Open jobs only |
| Evaluate, create, revise | Draft/Open jobs | Open jobs | No |
| Mutate Cancelled jobs | No | No | No |

These follow existing job-edit scope rather than broadening Operator authority.
Manager can plan a Draft job without opening it; Supervisor can use the existing
job-opening action, not edit a Draft plan directly. Cancelled plans remain
historical, read-only proposals. Job references cannot be reassigned by editing.

`CuttingPlan` holds current name, job, revision, scenarios/results, creator and
timestamps. `PlanRevision` holds an immutable full snapshot of name/scenarios,
reason, actor/time and globally unique request UUID, unique per plan/revision.
All saved scenarios are validated together. A stale revision, duplicate request,
invalid scenario or audit failure commits **nothing**. Repeated UUIDs explicitly
return 409 rather than creating extra revisions. There is no delete API.
ORM immutability does not protect against privileged direct SQL.

Writes and evaluation use the established account advisory lock and fresh actor,
then the job row lock. They serialize with job cancellation/account revocation.
Existing session, password restriction and CSRF checks apply. Stale edits preserve
draft inputs until the user explicitly chooses to discard/reload.

## API and frontend

- GET/POST `/api/v1/jobs/{jobId}/cutting`: paginated summaries / create.
- POST `/api/v1/jobs/{jobId}/cutting/evaluate`: validate or generate a scenario;
  returns results without saving it.
- GET/PUT `/api/v1/jobs/{jobId}/cutting/{id}`: reopen / save a new revision.
- GET `/api/v1/jobs/{jobId}/cutting/{id}/history`: paginated revision snapshots.

Create sends revision 0; update sends the loaded revision. Every save requires a
reason and request UUID. API errors distinguish geometry problems, role denial,
closed jobs, missing records, stale edits and duplicate requests. OpenAPI and
generated client contracts document the payloads; the session-aware UI wrapper
strips derived result fields before writes.

Studio entry is linked to jobs. The UI provides numeric configuration, SVG
selection/dragging, equivalent numeric coordinates/board selection, permitted
rotation, individual removal/reset, server validation and baseline generation,
scenario comparison, saved plan reopening and revision history.

## Migration and verification

Added `cutting.0001_initial` for CuttingPlan and PlanRevision with revision,
reason, name and uniqueness constraints. Applied only to development `heliumdb`,
cluster `7694975907574124564`, after matching the platform query and guarded
Django connection. Existing guards unchanged. No production/startup migrations.

Passed 79 database-suite tests (14 new Cutting Studio tests), plus 30 offline
tests. New coverage: exact fits; fractional dimensions; all edge/margin/kerf
boundaries; overlap; allowed/forbidden rotation; copy and board bounds; impossible
layouts; deterministic multi-board output and seeded randomized cases;
area/denominator definitions; explicit units and missing inputs; server-side
geometry and derived-field rejection; persistence and two-scenario comparison;
reopening/history; no accounting/inventory side effects; roles; Draft/Open/
Cancelled restrictions; cross-job references; CSRF; stale and concurrent saves;
duplicate UUIDs; rollback; immutable audit; and history pagination.

Backend lint and migration drift, generated API contracts, workspace typecheck,
frontend lint and production build passed. Build retains non-blocking sourcemap
and bundle-size warnings.

Browser verification passed the desktop English journey: explicit blank inputs,
baseline (7 copies / 41.250% utilization), illegal overlap/boundary rejection,
allowed/forbidden rotation, numeric move, pointer drag, removal/re-addition/reset,
independent second scenario, comparison, save/reopen, three revisions/history and
stale-edit preservation with explicit discard/reload. Operator read-only,
Supervisor Open/Draft scope and Manager cancelled-job history were verified.
Arabic at 390px had no page-level horizontal overflow; canvas and LTR numeric
coordinates were usable. The comparison table requires local scrolling; explicit
left/right controls and keyboard focus were added after the pass because physical
touchscreen swiping could not be verified in the test browser. A stale-reload list
revision refresh was also corrected. No JS runtime errors were observed.
