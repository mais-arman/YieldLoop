---
name: User-visible demo isolation
description: Demo fixes must appear in the actual Preview, not only a temporary harness
---

When asked to fix or populate the demo, use isolated data **in the actual user
Preview** and verify saved records there. A loopback-only testing walkthrough does
not satisfy this request.

**Why:** The user explicitly rejected repeated temporary-demo reports while the
current app still showed no saved concepts.

**How to apply:** Preserve real records in their original namespace, keep normal
authentication and production guards, make the active demo scope clear, and test
export/import/save/refresh/reopen against the same Preview the user sees.

Keep Preview on isolated demo records, even when an original-schema manager cannot
log into it.

**Why:** On 2026-10-11, after the schema mismatch and consequences of switching
were explained, the user explicitly chose “Keep isolated demo records.”

**How to apply:** Use separate demo accounts. Do not switch to original records,
copy the original manager, or add a cross-schema authentication fallback to fix
demo login. Any password reset still requires an explanation and authorization.
