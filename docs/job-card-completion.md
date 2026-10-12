# Core requirements completion — 12 October 2026

## Scope and limits

Additive optional planning metadata: product specification, sheet width/height
with explicit mm/cm/in unit, planned good-weight yield (0–100%), and cutting
instructions. Existing jobs remain unset: no backfill or fabricated reference
specifications. Fields are readable under the existing job visibility rules.
Only Managers can edit planning metadata on Draft/Open jobs, consistent with
job creation/reference ownership; this does not expand Operator/Supervisor
planning permissions. Revisions and old/new planning snapshots are audited.

Planned good-weight yield is not actual good yield or geometric cutting-area
utilization. The API uses decimal strings, up to three places, with complete
positive sheet dimensions and explicit units. Blank fields can be cleared.

Private attachments are deferred, not implemented or verified. This Django
application has no approved private object storage path/retention policy.
Required decision: authorize storage, retention and document types/size limits.
Implementation must include authenticated per-job reads, authorization on every
download, non-public objects, safe generated keys, content/type validation,
size limits and upload/scan handling. No local-disk/public upload fallback exists.

## Preserved factory policies requiring owner answers

| Policy preserved | Exact owner decision required |
|---|---|
| Exact-zero variance to complete | Is there a permitted weighing tolerance? If so, define kg/relative limits, scale resolution, authority and audit treatment. |
| Positive issued and good output | May a fully accounted all-scrap job close? If yes, what review/sign-off is required? |
| Pending rework prevents completion | Must all rework resolve before closure? Which terminal outcomes are authorized? |
| Blank scrap reasons remain Unspecified; free text permitted | Must new scrap entries have an approved category? How should historical unspecified entries and synonyms be handled without inventing data? |
| Reports select by job creation date | Should a future report use entry date, production date or completion date instead? Define timezone, late corrections and reopened/reporting periods. |

No tolerance, automatic balancing, invented scrap category or relaxed permission
was introduced. Current report date semantics are now explicitly explained in
English and Arabic. Latest measurements for jobs in the creation-date cohort
include later corrections; the date filter is not a material-entry date filter.

## Rates and source navigation

Shared backend Decimal percentage calculation supplies job summary, reports and
comparison. Offcut rate is offcut / issued × 100; zero/no issue gives null.
Comparison uses left minus right (kg or percentage points), only for compatible
machine/material selections. Direct entry links use an authorized job-material
GET with entry_id to locate the correct page, including voided source history.
Wrong-job/missing entries return 404; Operator access remains Open jobs only.

Over-accounting suppresses the misleading stacked bar and shows a signed
destructive balance alert. Under-accounting also explicitly blocks completion.

## Migration and verification

Migration: jobs/0003_production_planning_card.py. Additive nullable/blank fields,
audit snapshots and CHECK constraints; no data migration or business-data update.

Exact execution results are recorded in docs/final-acceptance.md after checks.
Production release remains NOT READY; this work supplies no new offsite backup,
cluster-loss recovery, production grants/ownership, approved RPO/RTO or live-AI
evidence.
