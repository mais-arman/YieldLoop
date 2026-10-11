# Factory release decision register

Status as of 2026-10-11: **all entries awaiting factory approval**.
The owners below are required responsibilities, not assignments to named people.
No approval, threshold, allocation rule or machine capability is inferred.
The current MVP's behavior is a safety boundary, not an approved future policy.

| Decision | Responsible approver | Required recorded decision/evidence | Current boundary |
|---|---|---|---|
| Reconciliation tolerance | Factory production owner + quality lead | Absolute/relative tolerance by material/unit; rounding; negative variance treatment; exception escalation; worked examples | Signed variance remains visible; no pass/fail threshold or automatic closure |
| Rework | Production owner + material-accounting owner | Category, custody, repeated processing and receiving-job entries; double-count prevention; correction examples | No rework classification or implicit allocation |
| Job completion approval | Factory manager + quality lead | Who may complete, measurements/evidence required, tolerance checks, reopening/reversal, audit reason | Draft/Open/Cancelled only; no completion/approval |
| Operator recording | Factory manager | Recording versus verification duties, assignments, training and revocation requirements | Operator reads Open work only; no measurements/writes |
| Material compatibility | Materials/quality owner | Grade/thickness/condition/density/geometry attributes; permitted unit conversions; inspection evidence and approver | Immutable identity and kg; unverified suitability; no inferred conversion |
| Offcut reservation and reuse | Inventory owner + production/accounting owner | Reservation scope/expiry, partial quantities, physical custody, receiving-job accounting, concurrency examples | Foundation register only; reserve/release/consume blocked |
| Offcut reversal | Inventory owner + accounting/quality owner | Reversing reservations/consumption, downstream corrections, cancellation behavior and immutable event rules | Void registration before source correction; no consumption or reversal policy invented |
| Cutting-machine constraints | Machine operator lead + engineering/safety owner | Stock measurements, units, actual kerf, each margin, grain/rotation, defect zones, clamp exclusion, machine envelope, sequencing and validated samples | Explicit mm rectangular spacing-only proposals, not machine instructions |
| Report time meaning | Production/accounting owner | Whether creation-date cohorts/current balances suffice; occurrence dates/as-of histories and correction treatment if required | Clearly labeled current balances, not historical as-of |
| Pilot operations | Accountable factory owner | Named users, training, scope, prohibited operations, manual fallback, reconciliation review and acceptance criteria | Synthetic evaluation only until gates/sign-off close |

## Approval record required for each entry

Record decision ID/topic, chosen policy, rationale, worked examples, approver
and approval date, affected workflows and tests, and whether pilot-only or
permanent. Attach factory-approved evidence in its authorized record system.
Do not put credentials or unnecessary personal details in this repository.
Until approved, keep the boundary in the table; do not substitute guessed defaults.
