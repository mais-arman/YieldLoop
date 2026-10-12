---
name: WebGL browser verification
description: Avoid false renderer failures from disabled WebGL and offscreen captures
---

The standard test browser may have WebGL disabled. A separate local Chromium
using ANGLE SwiftShader can verify actual geometry without a hardware GPU.
Center the canvas in the viewport and verify its bounds before screenshot or
CDP touch checks: offscreen canvas crops can be uniformly white even when the
renderer works.

**Why:** Verification initially reported unavailable 3D and a tablet rendering
failure; software rendering and on-screen capture demonstrated real geometry.
Those observations alone do not prove interaction responsiveness.

**How to apply:** Distinguish renderer availability, visible rendering and actual
camera changes. Compare input-driven images only for an on-screen canvas, and
report unresolved interaction results rather than inferring a successful test.

Use an actual separately launched Chromium process for software-rendering flags,
not context options on an already-running managed browser. Capture the composited
surface through that same page's CDP session; do not rely on another registered tab.

**Why:** Context-level flags left WebGL unavailable, while a separate process
rendered successfully. Same-page captures finally proved live dimension redraw
and an identical saved/reopened model without changing application rendering.

Remote-browser downloads need separate content verification. The tooling may not
expose a browser-managed download path or permit synchronous file reads; use an
explicit saved destination and asynchronous reading before comparing parameters.

**Why:** A successful download event and byte count did not prove the edited
packaging parameters were exported; parsing the saved JSON closed that gap.

**How to apply:** Treat export transport and exported-content correctness as
separate checks. A filesystem-tool limitation is not evidence of an app defect.

Measure settled DOM geometry before screenshot redaction. Wait for fonts, sample
stable frames, and compare document scrollWidth to clientWidth (not innerWidth).
Redact screenshots afterward with visibility:hidden, not replacement text or
display:none.

**Why:** Redaction can alter intrinsic widths; scrollbar space and unsettled HMR
renders can also confuse overflow diagnosis. A reported overflow did not reproduce
in stable, unmodified English/Arabic DOM measurements.

**How to apply:** Separate reproducible layout defects from transient observations;
do not claim a CSS fix without a supported cause and before/after evidence.
