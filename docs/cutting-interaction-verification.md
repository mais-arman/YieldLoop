# Cutting Studio interaction verification

Verified 2026-10-11. Existing Phase 7 implementation retained; no algorithm,
API schema, database migration, permission or revision-policy changes.

## Already implemented

- SVG Pointer Events with pointer capture and `touch-action:none` for individual
  piece dragging; coordinates transformed through the SVG inverse screen matrix.
- Focusable pieces, selected dashed outline, arrow keys (1 mm, Shift 10 mm),
  R rotation, Delete/Backspace removal; numeric placement alternatives.
- Reset button with a keyboard-accessible confirmation dialog.
- Client rejection on drop, authoritative server validation, manual origin,
  saved positions/rotations and revision-protected history.
- Geometry remains left-to-right independently of Arabic interface direction.

## Changed

- Validate the candidate placement during pointer movement, not only on release.
  Invalid previews have an error outline and localized live status text; release
  rejects them and preserves the last committed placement.
- Removed silent zero-clamping from dragging and arrows. Negative coordinates
  now produce the usable-area/boundary explanation instead of being altered.
- Pointer-down focuses the piece. Ignore non-primary pointers and secondary mouse
  buttons; track the captured pointer's identity.
- Cancel previews on pointer cancellation/lost capture or Escape. Resolve final
  release coordinates from the event instead of a potentially older render.
- Keep the zoomed viewBox fixed during a drag to prevent coordinate-frame changes.
- Preserve keyboard focus on the board after deleting a focused piece.
- Updated English/Arabic instructions for touch, keys, cancellation and rejection.

No changes to rectangle dimensions, deterministic shelf nesting, kerf model,
material accounting, inventory, authentication, roles or server concurrency rules.

## Automated checks

- `pnpm --filter @workspace/scripts exec tsx --test ../artifacts/yieldloop/src/lib/cutting-interactions.test.ts`
  — **3 passing tests**: exact/fractional margins, negative coordinates, overlap,
  exact/sub-kerf spacing, independent boards, allowed/forbidden rotation, empty
  placements and no mutation of committed geometry.
- `python -B artifacts/api-server/backend/manage.py test cutting --settings=config.test_settings --keepdb --noinput`
  — **14 passing tests**, including server geometry, save/reopen, history,
  permission, stale revision, duplicate request, rollback and concurrency checks.
- Workspace typecheck, frontend lint and frontend production build passed.
  Existing non-fatal bundle-size/sourcemap warnings remain.
- Frontend workflow restarted successfully.

## Observed browser results

Ran against the built application and isolated PostgreSQL test database using
the loopback acceptance harness, not development business records.

| Interaction | Evidence |
|---|---|
| Desktop mouse | Held invalid boundary and overlap/kerf drags showed localized feedback **before release**. Rejection retained coordinates. Valid drag moved x=40→50. |
| Zoom | ViewBox stayed fixed during drag; release committed position and then recentered. |
| Keyboard selection/movement | Tab reached both pieces; selection outline visible. ArrowLeft −1 mm; Shift+ArrowRight +10 mm. |
| Rotation/deletion | R toggled permitted rotation; Delete removed a copy. Forbidden-copy rotation checkbox was disabled. Numeric Apply preserved rotation. |
| Reset | Cancel retained placements; Tab/Enter confirmed reset in Arabic. Reset affected the unsaved draft; reopening restored saved placements. |
| Mobile touch | Genuine Chromium CDP touch start/move/end at 390×844 committed movement (x=40→49.699), not synthetic mouse/pointer dispatch. |
| Tablet cancellation | CDP touchCancel at 768×1024 preserved stored position and cleared preview status. |
| Arabic RTL | Physical ArrowLeft decreased x, not mirrored; board kept its physical coordinate orientation. |
| Save/reopen | Manual positions (5.000,5.000,false) and (40.000,5.000,true) persisted exactly through reload/reopen; verified in UI and server GET. Inputs and unplaced copies remained intact. |
| Server rejection | Direct invalid save returned 400 out_of_bounds; saved positions and revision unchanged. |
| Operator | Read-only UI; can_edit=false; direct save returned 403 and did not change revision. |

The tester created a temporary credential-free browser script and syntax-checked
it. It was **not** executed standalone because Playwright was unavailable as a
local package. Browser interactions above were run through the testing browser;
the committed frontend and backend tests are independently repeatable.

## Limits and unsupported interactions

- Touch evidence is Chromium device emulation, not physical iOS/Safari/Android
  hardware certification. Tablet evidence specifically covers cancellation.
- Mouse/touch move one piece at a time on its current board. Cross-board
  assignment uses numeric controls; group dragging is not provided.
- Rotation is only the existing permitted 90° toggle; no free-angle rotation,
  resize gesture, pinch zoom or two-finger pan. Zoom buttons remain available.
- Escape cancellation is implemented; browser cancellation evidence used touchCancel.
- The tester noted internally scrolling mobile navigation and possible low
  contrast in screenshots. This focused interaction pass does not certify
  whole-app contrast or assistive-technology accessibility.

These limits do not change the earlier production-readiness verdict.
