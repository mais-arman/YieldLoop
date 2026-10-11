---
name: Authentication regression checks
description: Browser-state-dependent login transitions can pass on repeat login but fail for a fresh anonymous visitor.
---

When changing session/cache transitions, verify invalid credentials followed by
the first successful login in a fresh anonymous browser, separately from logout
and repeat login.

**Why:** Browser verification found that a repeat login navigated successfully
while the first successful login after rejection remained on the login form,
despite the backend having created a valid session.

**How to apply:** Assert automatic URL transition and authenticated content without
manual navigation; an HTTP 200 or a working session after manual navigation is not
sufficient evidence that login works.

Also assert that protected data finishes loading after the client-side login,
without a manual reload.

**Why:** Clearing caches again when the identity changes from anonymous to signed
in can delete queries that the new page has just mounted, leaving skeletons stuck.
A document reload can conceal that defect rather than solve it.

**How to apply:** Cancel old requests and clear old user data before publishing the
server-confirmed identity; do not repeat that cleanup after mounting the new
workspace. Preserve session validation and CSRF, and test document continuity.
