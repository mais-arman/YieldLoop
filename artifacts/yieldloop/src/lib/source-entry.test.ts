import test from 'node:test';
import assert from 'node:assert/strict';
import { missingSourceEntry } from './source-entry';

test('a missing entry is distinct from a missing job or unavailable service', () => {
  assert.equal(missingSourceEntry(999999, { status: 404 }), true);
  assert.equal(missingSourceEntry(null, { status: 404 }), false);
  for (const status of [401, 403, 409, 500, 503]) {
    assert.equal(missingSourceEntry(34, { status }), false);
  }
  assert.equal(missingSourceEntry(34, undefined), false);
  assert.equal(missingSourceEntry(34, new Error('network')), false);
});
