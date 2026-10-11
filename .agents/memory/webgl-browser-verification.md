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
