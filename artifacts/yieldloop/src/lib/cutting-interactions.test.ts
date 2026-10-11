import assert from 'node:assert/strict';
import { test } from 'node:test';
import { placementError, type CuttingInput, type Placement } from './cutting';

const input: CuttingInput = {
  unit: 'mm', material_id: 1, stock_label: 'Interaction test', cutting_mode: 'rectangular_spacing_only',
  board: { width: '100', height: '80', quantity: 2, left: '5', right: '5', top: '5', bottom: '5' },
  kerf: '2', pieces: [{ key: 'a', label: 'A', width: '20', height: '10', quantity: 2, rotation_allowed: false }],
};
const p: Placement = { piece_key: 'a', copy: 0, board: 0, x: '5', y: '5', rotated: false };
test('manual movement: exact margins, fractional boundary and negative rejection', () => {
  assert.equal(placementError(input, [p]), null);
  assert.equal(placementError(input, [{ ...p, x: '75', y: '65' }]), null);
  for (const change of [{ x: '75.001' }, { y: '65.001' }, { x: '4.999' }, { x: '-1' }]) {
    assert.equal(placementError(input, [{ ...p, ...change }]), 'out_of_bounds');
  }
});
test('live preview: overlap, exact kerf, sub-kerf and separate boards', () => {
  const other = { ...p, copy: 1, x: '27' };
  assert.equal(placementError(input, [p, other]), null);
  for (const x of ['5', '25', '26.999']) {
    assert.equal(placementError(input, [p, { ...other, x }]), 'overlap_or_kerf');
  }
  assert.equal(placementError(input, [p, { ...other, x: '5', board: 1 }]), null);
});
test('rotation permission, removal/reset, and previews never mutate committed geometry', () => {
  const original = JSON.stringify({ input, p });
  assert.equal(placementError(input, [{ ...p, rotated: true }]), 'rotation_forbidden');
  assert.equal(placementError({ ...input, pieces: [{ ...input.pieces[0], rotation_allowed: true }] }, [{ ...p, rotated: true }]), null);
  assert.equal(placementError(input, []), null);
  assert.equal(JSON.stringify({ input, p }), original);
});
