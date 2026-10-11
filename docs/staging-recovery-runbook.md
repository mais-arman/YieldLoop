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

## Remaining recovery-readiness review (2026-10-11)

**Disposition: BLOCKED. Overall release: NOT READY.** This is a local evidence
review, not a new recovery exercise. The verified CHECK-equivalence section and
its historical test results remain unchanged.

### Evidence available and missing

| Item | Actual evidence from this review | Status and required human action |
|---|---|---|
| Offsite backup availability | No independent backup inventory, retrieval receipt, retention policy or encrypted archive custody evidence in the reviewed project documents/scripts. The drill uses a temporary local archive and deletes it. | **BLOCKED.** Infrastructure owner must supply a redacted provider/storage inventory, backup timestamps/coverage, independent failure-domain location, retention/encryption/key-access policy, and a retrieval/checksum receipt. Absence of local evidence does not prove that no external backups exist. |
| Cluster-loss recovery | Existing procedure restores a database on the same cluster using existing credentials; it cannot demonstrate loss of that cluster or its credentials. | **BLOCKED.** Infrastructure owner must identify the provider and recovery mechanism, approve an independent non-production recovery cluster, and perform the timed isolated exercise below. |
| Roles, ownership and grants | recovery_drill.py uses `--no-owner --no-acl`; no reviewed desired-role/ownership/ACL manifest or actual restore comparison is supplied. | **BLOCKED / NOT RUN.** DBA/security owner must provide an approved sanitized baseline and a dedicated disposable cluster with separately managed credentials. Then execute and record the role/ACL exercise below. |
| RPO approval | No numeric loss tolerance, scope, approval date or accountable approver is recorded. | **BLOCKED / NOT APPROVED IN AVAILABLE EVIDENCE.** Factory/data owner must sign a numeric target and acceptable loss window, with infrastructure owner confirming feasibility. |
| RTO approval | No numeric recovery-time target, clock boundaries or approved service acceptance criteria are recorded. | **BLOCKED / NOT APPROVED IN AVAILABLE EVIDENCE.** Factory/operations owner must sign these definitions with infrastructure owner. |
| RPO/RTO demonstration | No independently retrieved backup, recovery markers, exercise timeline or service-ready acceptance record was supplied. Earlier local test durations are not operational RPO/RTO measurements. | **BLOCKED / NOT DEMONSTRATED.** Exercise lead must capture the evidence below and compare results against signed targets. |
| Recovery ownership | Documents name responsibility categories, not an assigned accountable individual/delegate. | **BLOCKED.** Sponsor must name the backup owner, restore operator/delegate, security approver and business acceptance owner, with escalation and credential-recovery arrangements. |

No external infrastructure endpoint, recovery authorization, independently
disposable PostgreSQL cluster, or approved deployment-role baseline has been
provided for this exercise. No production/provider APIs, secrets or databases
were inspected to discover them. A disposable database on a shared cluster is
not adequate isolation for cluster-wide role creation, membership changes or a
cluster-loss simulation. No CREATE/DROP ROLE or role/ACL mutation was attempted.
Creating a made-up role set locally would not verify the intended deployment's
ownership/grants and is not substituted for the missing baseline.

### Cluster-loss exercise procedure — proposed, NOT EXECUTED

The sequence below supplies the missing operational outline. It is not yet a
provider-specific, approved executable procedure; provider commands, target
identity, safe teardown plan and access authorizations remain prerequisites.

1. Owners approve numeric RPO/RTO, clock boundaries, representative data volume,
   scope (DB, roles, keys, application configuration), acceptance criteria and
   recovery operator/delegate. Use synthetic non-production records only.
2. Prepare an independent, disposable source/recovery exercise with no production
   network access. Record cluster identities and allowlisted endpoints. Store
   time-stamped synthetic durable commit markers and expected record hashes.
3. Produce the approved backup set, including the role/ACL/ownership manifest and
   required recovery/configuration material. Store it outside the source failure
   domain. Record checksums, UTC backup start/end, coverage/recovery point,
   retention and retrieval authorization. Never include secret values in reports.
4. Record incident declaration time; make the **exercise source only** unavailable
   to the restore operator through approved isolation, not deletion of any shared
   or application system. Recovery must not depend on source-cluster reads,
   local archive caches, source-held encryption keys or existing source roles.
5. Provision the separate destination, recover independent credentials/keys and
   retrieve the stored archive. Verify its checksum/decryption and actual recovery
   point. Record elapsed provisioning, retrieval, decryption and restore times.
6. Restore reviewed roles first, then database/schema objects with their intended
   owners and ACLs, using the provider-approved mechanism. Execute the role/ACL
   verification below. Managed-provider restrictions require a reviewed mapping;
   do not silently replace all owners with an administrator.
7. Verify row/sequence/schema integrity and the established CHECK-equivalence
   criteria. Preserve the original local drill's fixed target safety checks;
   do not point that script at an arbitrary new environment or bypass its guard.
   Any separate exercise runner requires independent target-identity review.
8. Validate service availability on an isolated recovery endpoint and approved
   application smoke checks. The current application write guard stays unchanged;
   any needed staging authorization is a separate approval, not part of this
   review. Record the service-ready/business-acceptance timestamp, not merely
   pg_restore completion.
9. Calculate observed RPO/RTO, list discrepancies and obtain operator/security/
   business sign-off. Remove only approved disposable exercise resources and
   revoke temporary credentials after retaining redacted evidence. No production
   cutover, failover, destructive simulation or deployment is authorized here.

### Role, ownership and grant verification — required evidence, NOT RUN

The DBA must first approve a sanitized baseline identifying:

- Database/schema/table/view/sequence/function owners; explicit privilege grants
  and grant options, PUBLIC access and default privileges for future objects.
- Login/non-login role attributes, membership/inheritance/SET ROLE paths, relevant
  role/database settings and provider-managed role restrictions. Compare names and
  effective behavior, not instance-specific OIDs.
- Approved separation of runtime, read-only, migration/owner and backup/restore
  responsibilities (actual names and policies are not yet supplied).
- Credentials obtained independently through the approved secrets system, not
  plaintext/password hashes in the evidence report. A credential-free role
  definition export alone does not demonstrate restored login access.

On the dedicated disposable cluster, compare the restored catalog against that
baseline: pg_roles, pg_auth_members, database/schema/object owners and ACLs,
pg_default_acl and applicable role settings. Capture exact sanitized commands,
tool versions, exit statuses and before/after differences. The current
`--no-owner --no-acl` drill must not be cited as evidence for this comparison.

Then connect as each actual exercise role (not merely an administrator using
superuser privileges) and prove approved positive AND negative permissions.
Examples to instantiate from the approved matrix: reader SELECT succeeds but
INSERT/UPDATE/DELETE fail; runtime has only its allowed table and sequence access;
runtime cannot create roles, escalate privileges or perform owner-only DDL;
schema USAGE/CREATE, sequence access and PUBLIC privileges match policy.
Test default privileges on a newly created synthetic object and membership
inheritance where applicable. Successful operations are rolled back where
possible; all remaining objects are confined to the disposable cluster.

A role mapping imposed by a managed provider needs explicit security approval
and effective-permission tests. Unexpected grants, denied required privileges,
changed ownership or untested login paths keep this gate BLOCKED.

### RPO/RTO acceptance evidence

No target values are inferred or proposed as already approved.

- **RPO:** signed maximum acceptable loss for the specified data/scope, backup/WAL
  coverage and failure model; synchronized UTC failure cutoff and durable commit
  markers; newest contiguous marker actually recovered; missing transactions and
  detection granularity. Report the observed loss window (failure cutoff minus
  last recovered marker, with marker resolution stated), not simply backup age.
- **RTO:** signed start/end definition and maximum duration; timestamped incident
  declaration, access/key recovery, provisioning, offsite retrieval, restore,
  permission verification, application validation and service acceptance. Include
  human delays and retries unless an explicit approved scope excludes them.
- **Approval:** named accountable signatories, approval date, chosen numeric
  targets and exercise scope; measured results no worse than those targets,
  documented limitations and retained evidence. A fast local restore cannot
  establish either objective for a total-cluster-loss scenario.

### Commands actually run in this review

Local read-only file inspection only:

```sh
cat docs/staging-recovery-runbook.md
rg -n 'recovery|backup|RPO|RTO|owner|grant|retention|cluster' docs/phase-8-acceptance.md docs/factory-decision-register.md
rg -n 'pg_dump|pg_restore|no-owner|no-acl|DROP|CREATE DATABASE|TARGET' artifacts/api-server/backend/recovery_drill.py
rg --files docs scripts artifacts/api-server | grep -Ei 'backup|recover|restore|infrastructure|terraform|ansible|runbook|deploy'
rg -n 'RPO|RTO|offsite|retention|cluster.loss|role.*restore|grant.*restore' docs
git diff --check -- docs/staging-recovery-runbook.md docs/phase-8-acceptance.md
```

Results: relevant files were the existing runbook and local recovery/checker/test
scripts. Reviewed documentation describes required recovery controls but supplies
none of the missing external receipts, signed objectives or role/ACL results.
The final documentation whitespace check passed.
An initial file-list search included `.github`, which does not exist; the search
was repeated over the existing directories shown above. Search scope is local
and bounded, not proof about an external provider's actual backup configuration.

No SQL, backup download, restore, new regression test, migration, provider API
call or credential operation ran in this review. Runtime code did not change,
so completed CHECK/accessibility/dependency tests were not repeated. Earlier
PASS counts remain historical evidence, not results newly generated here.

**Next required human action:** the project sponsor must assign an infrastructure/
DBA recovery owner and obtain the independent backup evidence, approved role/ACL
baseline, isolated recovery-cluster authorization, and business-approved numeric
RPO/RTO. Then authorize the non-production exercise described above.
