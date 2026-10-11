import assert from 'node:assert/strict';
import { validateDesign } from './packaging-validation';
import { paramKeysFor, statesFor } from './packaging-templates';
import { buildPanels } from './packaging-geometry';
import { toDims } from './packaging-validation';

assert.deepEqual(paramKeysFor('flat_box'), paramKeysFor('lid_box'));
assert.deepEqual(statesFor('flat_box'), ['assembled', 'open']);
const ok = { length: '300', width: '200', height: '40', thickness: '2', lid_height: '20', clearance: '1' };
assert.deepEqual(validateDesign('flat_box', ok, 'open'), {});
assert.equal(validateDesign('flat_box', { ...ok, height: '250' }, 'assembled').height, 'flat_too_tall');
assert.equal(validateDesign('flat_box', { ...ok, lid_height: '' }, 'assembled').lid_height, 'required');
assert.equal(buildPanels('flat_box', toDims('flat_box', ok), 'assembled').length, 10);
console.log('gap-closure tests passed');
