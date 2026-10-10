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
