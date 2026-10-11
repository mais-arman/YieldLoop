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

1. Finish automated DB tests, then start `acceptance_browser.py` and create
   synthetic jobs/material records in its fixed test database. Its credentials
   are random and private. Never use real factory records.
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
7. Assert destination identity, exact table-row fingerprints, constraints and
   sequence state, and unchanged source. Delete only the destination created by
   this run and remove its temporary synthetic archive. Review the PASS summary.
8. Remove synthetic source fixtures/private browser credentials with the existing
   guarded test cleanup procedure after evidence is recorded.

A successful drill proves logical database recoverability on this isolated
cluster only. It does not prove offsite durability, encrypted retention, recovery
from total cluster loss, provider point-in-time recovery, or meeting factory
RPO/RTO. Those remain release blockers requiring infrastructure-owner evidence.

## Actual drill outcome (2026-10-11): BLOCKED / partial evidence

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
