# Phase 5 — Offcut inventory foundation

## Approved scope and missing policy

The user chose **inventory foundation only**: no reservation, release or
consumption until compatibility and receiving-job accounting policies are
approved. This supersedes the broader reuse request for this phase.

Existing source data includes material identity, free-text name/specification,
kg quantity to three decimal places, job, immutable output, and reconciliation
snapshot. It does not establish dimensions, grade, condition, thickness, density,
physical fit or conversion rules. No such attributes are inferred. Compatibility
is always `unverified`; reuse is blocked with `policy_not_defined`.

## Registration and transitions

Managers and Supervisors explicitly register a non-voided offcut output from an
Open job, with a reason. One whole output becomes one inventory lot exactly once.
The server derives its material, quantity, source job and original reconciliation
snapshot. No client quantity, unit, actor, target job or calculated balance is
accepted. This supports existing outputs without an automatic backfill.

- Registration → **available** (registered balance, NOT suitability approval).
- Available → **voided**, mandatory reason and matching revision.
- Voided is terminal; no delete, reactivation, overwrite or re-registration.
- Reserved and consumed are deliberately unreachable. Their API operations return
  409 `reuse_policy_required` for authorized writers, without side effects.
- Partial registration/consumption is not supported. Remaining registered stock
  is exactly the original Decimal quantity while available, zero when voided.
  Zero after void means removal from this register, not physical consumption.

No source or destination reconciliation changes on inventory operations.
Voiding inventory is not scrap classification or a production correction.
To correct the original offcut measurement, explicitly void its inventory first,
then use the existing Phase 4 reasoned measurement-void/replacement workflow.
Original measurements and historical reconciliation snapshots remain intact.
Incorrect registration is corrected by voiding; no future consumption reversal
policy is invented.

Cancellation leaves inventory history intact and exposes the source's Cancelled
status, but disables writes. It does not falsely record disposal or consumption.

## Permissions

| Action | Manager | Supervisor | Operator |
|---|---|---|---|
| Inventory list/detail/history | All | All | Source Open jobs only |
| Register source output | Open source jobs | Open source jobs | No |
| Void inventory with reason | Open source jobs | Open source jobs | No |
| Reserve/release/consume | Blocked | Blocked | Blocked |
| Write Draft/Cancelled sources | No | No | No |

Existing Django sessions, CSRF, password restrictions and identity checks remain.
No multi-tenant scope or client-selected ownership is introduced.

## Integrity, history and API

OffcutLot is immutable with unique source output, reconciliation and request UUID.
InventoryEvent is append-only with actor, time, action, reason and request UUID.
Source job/output/snapshot are traced through the lot. No target job exists while
reuse is disabled. History contains one addition and at most one void, so a
separate history paginator is unnecessary.

Mutation transactions use the established account lock and source-job row lock,
serializing with cancellation, material corrections and account revocation.
Unique constraints additionally prevent duplicates and double voiding.
Duplicate UUIDs are rejected, not silently replayed into additional lots.
Audit failure rolls back the entire mutation. ORM immutability does not claim
protection against privileged direct SQL.

- GET/POST `/api/v1/inventory`: role-scoped pagination, search, state/job filter;
  explicit whole-output registration.
- GET `/api/v1/inventory/{id}`: detail and bounded history.
- POST `/api/v1/inventory/{id}/void`: reason, revision and request UUID required.
- POST `/api/v1/inventory/{id}/{reserve|release|consume}`: explicitly blocked.
- PATCH/DELETE are not supported.

## Migration and checks

Applied `inventory.0001_initial` only to development **heliumdb**, cluster
`7694975907574124564`, after matching platform and guarded Django queries.
Existing target/write guard unchanged. No production or startup migration.

Passed 54 isolated database-suite tests (9 inventory plus 45 existing), 30 offline
checks, backend lint and migration-drift checks. Inventory coverage includes
exact fractional quantity/provenance, remaining balance, duplicate source/UUID,
simultaneous registration and voiding, invalid sources/transitions, blocked partial
reuse, role scope, cross-job references, Draft/Cancelled jobs, append-only history,
source correction ordering, rollback, pagination/search, CSRF and authentication.
Reservation/consumption success tests do not apply to the explicitly blocked
foundation: rejection and unchanged balances are tested instead.

Workspace typecheck, frontend lint/build passed. Existing non-fatal sourcemap
and bundle-size warnings remain. HTTPS browser verification passed registration,
reload/provenance, duplicate rejection, required confirmations, stale-void reason
preservation, unchanged accounting on inventory changes, explicit source correction
ordering, Supervisor registration/void, Operator direct-write denial, cancelled
source restrictions, Arabic 390px list/detail/dialogs, English desktop, health and
logout. Operator UI was observed with voided rather than available lots; backend
tests cover available-lot read/write permissions. Shared workspace identity labels
look crowded with long QA names; this is outside the inventory changes.

All precisely tracked disposable users, jobs, materials, inventory/history and
related test records were removed after browser verification. Existing employee
accounts and shared peer throttle counters were untouched.

Pending factory decisions before reuse: sufficient material/condition attributes,
physical suitability authorization, receiving-job issue linkage, partial allocation,
cancellation/reversal rules and when physical stock is considered usable.
