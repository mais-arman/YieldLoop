# Staging and recovery release gates

## Safe staging design (not provisioned or deployed)

Use the same reviewed commit/lockfiles as release: production-built React static
assets and Django/DRF Gunicorn behind one HTTPS origin, PostgreSQL with verified
TLS, database-backed sessions. Keep the optional mockup sandbox out of the
operational staging runtime. Use isolated synthetic data, not a production clone.

The current guard **does not enable production-mode writes**. Provisioning a
fully writable production-like staging environment needs separately approved
target-specific write authorization and least-privilege roles. Do not set
`DJANGO_ENV=development`, reuse development guard identifiers, remove the guard,
or use test settings to make staging writable. This runbook does not authorize
that change. Local browser acceptance uses test settings and is not staging.

Required configuration/evidence:

| Area | Requirement and verification |
|---|---|
| Runtime | Production build served by the selected static host; Gunicorn API routes under `/api/v1`; health/readiness routed separately. No Vite development server, test hasher or browser harness. |
| Secret | Stable randomly generated `DJANGO_SECRET_KEY` supplied via secrets tooling, never source or logs; rotation/revocation procedure approved. |
| Hosts | `DJANGO_ENV=production`; exact `DJANGO_ALLOWED_HOSTS`, no wildcard; independently provisioned database target. |
| Database | `DATABASE_URL` with verified TLS (prefer verify-full), trusted CA, least-privilege application role, approved target identity and schema workflow. Database guard remains fail-closed meanwhile. |
| HTTPS/proxy | Edge HTTPS redirect; trust forwarded protocol only when the proxy strips client-supplied headers. Verify actual behavior before enabling `DJANGO_TRUST_PROXY=1`; prevent redirect loops/spoofing. |
| Session/CSRF | Same-origin requests; Secure/HttpOnly/Lax host-only cookies, CSRF on unsafe methods, no wildcard origins, 12-hour expiry and revocation tests over real HTTPS. |
| Headers | Set frame-ancestors/CSP at the layer serving the actual SPA; approve required embedding explicitly. Validate HSTS domain implications before using it on real domains. |
| Logging | No request bodies, cookies, authorization or secrets; restricted log access/retention; alert on auth failures, unexpected 5xx, readiness failures, backup/restore failures. Test alerts with synthetic events. |
| Recovery | Approved RPO/RTO, backup owner, encryption/access controls, retention, restore target and rehearsal schedule; verify provider backup and restoration semantics before choosing a service. |
| Operations | Load/lock-contention testing, first-Manager provisioning, access recovery, independent fallback records, factory training and sign-off. |

Offline tests validate production configuration's fail-closed requirements and
cookie/session/HTTPS/TLS settings without connecting to any production host.
They do not prove deployed proxy behavior, certificate validity, logging controls
or successful production operations.

### Schema workflow correction

First establish whether the eventual database is Replit-managed or external.
For Replit-managed production databases, use the platform's reviewed Publish
schema-diff/confirmation flow when publication is separately authorized; do not
add custom production migration scripts or startup/build DDL. For an external
database, establish an explicitly approved migration/recovery procedure matching
that provider. Django migration-state compatibility must also be verified in
staging. No production inspection, migration, publication or schema change is
authorized or executed by this remediation.

## Repeatable isolated recovery drill

1. Use the already-migrated isolated test database `test_yieldloop_phase2b`.
   No browser or fresh fixtures are required for constraint verification.
   For a separate populated business-record drill, use only synthetic records.
   Never use real factory records or migrate the application database.
2. Stop that harness and all other writers to the isolated test database.
3. Run:

   `python -B artifacts/api-server/backend/recovery_drill.py`

4. The drill asserts development/test mode, exact source database
   `test_yieldloop_phase2b`, expected cluster and absence of the fixed destination
   `test_yieldloop_restore_drill`. It refuses to overwrite an existing database.
5. Fingerprint all public rows, constraints and sequences. Use `pg_dump` custom
   format, no ownership/ACL restoration, private temporary archive; credentials
   go only in the subprocess environment, not arguments/logs.
6. Create the empty isolated destination and run `pg_restore --exit-on-error
   --single-transaction --no-owner --no-acl`. Restore never targets the source,
   development application database or production.
   On this pre-17 server, the installed PostgreSQL 17.5 client emits an unsupported
   `SET transaction_timeout = 0`. The drill's explicit compatibility branch
   materializes SQL privately, removes exactly that session-setting statement,
   and uses `psql --single-transaction --set ON_ERROR_STOP=1 --no-psqlrc`.
   Schema/data errors still abort; no constraint or data statement is omitted.
7. Assert destination identity, exact table-row fingerprints and sequence state,
   plus fail-closed semantic constraint comparison described below. Assert the
   source and restored public data remain unchanged by probes. Delete only the
   destination created by this run and remove its temporary synthetic archive.
   Review both the semantic evidence and PASS summaries.
8. Remove synthetic source fixtures/private browser credentials with the existing
   guarded test cleanup procedure after evidence is recorded.

A successful drill proves logical database recoverability on this isolated
cluster only. It does not prove offsite durability, encrypted retention, recovery
from total cluster loss, provider point-in-time recovery, or meeting factory
RPO/RTO. Those remain release blockers requiring infrastructure-owner evidence.

## Earlier drill outcome (2026-10-11): BLOCKED / partial evidence

Executed `python -B artifacts/api-server/backend/recovery_drill.py` against the
synthetic browser fixture database after stopping its server. Initial restore
failed on the unsupported transaction_timeout setting and cleaned up its target.
After the narrowly scoped compatibility adjustment, restoration completed:
**all public table-row fingerprints and sequence values matched**. The strict
constraint-definition comparison did not match. Diagnostics isolated differences
to PostgreSQL's formatting/reparsing of text-array casts in CHECK expressions
(for example, a cast on an array versus casts on its individual string elements).
No row/sequence mismatch was found.

Do not call this a completed recovery gate. Use matching client/server tools
where possible; engineering must review these expressions and add a principled
semantic verification (including allowed/invalid values) before changing the
strict check. No constraints were dropped/disabled and no mismatch was silently
accepted. Each attempt removed the destination it created and its private
archive. Production and development application databases were not restore targets.

## Focused constraint verification (2026-10-11): PASS, local scope only

This section supersedes the earlier CHECK-equivalence blocker, not the offsite,
cluster-loss, operational recovery or RPO/RTO gates.

### Cause and semantic argument

The server reports **160010 (PostgreSQL 16.10)**; installed pg_dump/pg_restore
report **17.5**. The client emits the unsupported transaction_timeout SET noted
above. That tooling incompatibility is separate from the CHECK differences:
logical dumps preserve SQL, not the original internal expression tree. Restoring
that SQL reparses/re-coerces its array expressions. Nine varchar-enumeration
checks were represented differently:

```sql
-- Source, example:
CHECK (((role)::text = ANY ((ARRAY['cutting_operator'::character varying,
 'production_supervisor'::character varying, 'manager'::character varying])::text[])))
-- Restored:
CHECK (((role)::text = ANY (ARRAY[('cutting_operator'::character varying)::text,
 ('production_supervisor'::character varying)::text, ('manager'::character varying)::text])))
```

The left operand, equality/ANY operator, ordered finite literal list and resulting
text-array element types are identical. These non-null ASCII varchar literals
convert losslessly to text, whether the cast is on the whole array or on each
element. Thus the comparison is membership in the same finite set. Database
locale/provider/version and column collation/type/nullability also match.
This is a narrowly recognized equivalence, not whitespace stripping, arbitrary
SQL normalization, or a whitelist that ignores changed constraint bodies.

`recovery_semantics.py` accepts **only** these two fully matched forms with
identical column and ordered literals. Any changed value, operator, extra
predicate, unrecognized cast, missing constraint or metadata discrepancy fails.
All other definitions must remain textually identical.

### Catalog and behavioral evidence

- **104 constraints compared**, including **33 CHECKs, all validated**.
- Exact metadata comparison includes type, convalidated, deferrable/deferred,
  no-inherit and ordered referenced-column names.
- **143 columns** compared for PostgreSQL type/typmod, NOT NULL, collation,
  generated and identity attributes. Database locale metadata matched.
- **24 CHECK definitions unchanged**; all **9 changed CHECKs** follow the
  proven enum-cast rewrite. Remaining 71 non-CHECK definitions also match.
- All nine rewritten constraints reference exactly their listed column, are
  validated, and their real columns are NOT NULL:

| Constraint | Table.column | Every allowed value tested |
|---|---|---|
| accounts_user_valid_role | accounts_user.role | cutting_operator, production_supervisor, manager |
| audit_valid_event_type | audit_auditevent.event_type | account_created, role_changed, activation_changed, password_changed, password_reset, manager_bootstrapped |
| audit_valid_outcome | audit_auditevent.outcome | success, denied |
| inventory_valid_action | inventory_inventoryevent.action | addition, void |
| job_event_status | jobs_jobevent.new_status | draft, open, cancelled |
| job_event_type | jobs_jobevent.event_type | created, updated |
| job_valid_status | jobs_productionjob.status | draft, open, cancelled |
| entry_valid_kind | materials_materialentry.kind | issue, good, scrap, offcut |
| reconciliation_action | materials_reconciliation.action | record, void |

**792 checked INSERT/UPDATE outcomes passed** across both definitions and both
nullable-isolated-CHECK / actual-NOT-NULL modes: 252 accepted, 504 CHECK violations
(SQLSTATE 23514), and 36 NOT NULL violations (23502).
Invalid cases per constraint: empty string, `invalid`, string `NULL`, uppercase
first allowed value, leading space, trailing space and tab. Every allowed enum
value is inserted and updated. UPDATE starts from a valid seeded row.

SQL NULL produces UNKNOWN and is accepted by the CHECK alone; the actual
NOT NULL attribute rejects it. The tests distinguish these two rules rather
than falsely claiming the CHECK itself rejects NULL.

Behavioral tests use temporary one-column tables instantiated with each catalog
definition and the original column type, first nullable and then with original
NOT NULL. This isolates CHECK enforcement from unrelated FK/required-column
failures. They are not full application-row/business-workflow tests. The remaining
unchanged CHECKs rely on exact definition/metadata/type/locale equality, not a
new exhaustive behavioral matrix. Each successful/failed probe and temporary
table is rolled back. No public constraint is removed, disabled or weakened.

### Exact commands and results

```sh
python -B -m unittest discover -s artifacts/api-server/backend -p test_recovery_semantics.py -v
ruff check artifacts/api-server/backend/recovery_drill.py artifacts/api-server/backend/recovery_semantics.py artifacts/api-server/backend/test_recovery_semantics.py
python -B artifacts/api-server/backend/recovery_drill.py
```

Final results: **4 offline regression tests PASS (0.007s)**; **ruff PASS**;
**isolated dump/restore + semantic verification PASS**. Offline tests cover both
recognized forms, malformed/altered SQL, changed enum sets, validation status,
referenced columns, column type/nullability, missing constraints and refusal of
a non-disposable destination before catalog reads/writes. Two additional runtime
negative controls verify operator/value changes are not normalized away.

Final restore evidence: **21 tables, 107 rows, 19 sequences, 104 constraints**;
archive **81,523 bytes**; all row hashes/sequence states match; source unchanged.
This run used the existing synthetic/test framework rows, not newly populated
production-job records. The earlier populated drill's row/sequence evidence is
historical; it was not repeated or relabeled as this run.

One initial focused run failed safely because the restored connection inherited
read-only transaction defaults and PostgreSQL refused CREATE TEMP TABLE.
After verifying exact destination name and cluster, the drill now enables writes
**only for that disposable connection's probe transaction**, using SET TRANSACTION
READ WRITE. It does not change the application write guard or any server/database
default. That transaction contains rollback-only temporary-table probes.
An intermediate lint check found a nested-with style issue, subsequently fixed;
the final combined commands above all returned success.

Every attempt removed its newly created restore database and private temporary
archive, including the failed attempt. Existing source data was read/fingerprinted
only; no fixtures were inserted/updated/deleted there. No migrations, production
connection, application-data mutation, deployment or consumption enablement ran.
Running Python with assertions disabled (`-O`) is explicitly refused.

### Remaining recovery limits

Local CHECK semantic equivalence is demonstrated for this schema and environment.
**End-to-end operational/disaster recovery remains BLOCKED** until independent
offsite retention/encryption, total-cluster loss, actual deployment-role/ACL
recovery, named ownership and approved/measured RPO/RTO are evidenced. This
no-owner/no-ACL logical drill intentionally does not prove role/grant restoration.
No claim of production readiness or release approval follows from this PASS.
