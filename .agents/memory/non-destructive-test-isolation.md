---
name: Non-destructive PostgreSQL test isolation
description: Pilot verification must not reset or truncate databases to obtain passing tests
---

Honor the user's prohibition on database resets/truncation. Use positively
identified test targets and independent disposable schemas for database-backed
tests; retain them rather than silently erasing evidence.

**Why:** The integrated pilot brief explicitly forbids dropping, resetting or
truncating databases to make tests pass. Database tests need real commits for
concurrency and repeatable-read report semantics; an outer rollback transaction
does not reproduce those behaviors.

**How to apply:** Preserve the application write guard. Check settings and live
database/cluster identity before writes. Django 5.2 fixture setup is class-level,
so an instance-method override fails before tests run; isolate every connection,
including worker threads, through the same per-test schema search path.
