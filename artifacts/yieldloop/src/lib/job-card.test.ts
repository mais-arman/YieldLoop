import assert from 'node:assert/strict';
import test from 'node:test';
import { cardValues, cardPayload, validCard } from './job-card';

test('missing metadata stays unset; zero planned yield is preserved', () => {
  assert.equal(validCard(cardValues()), true);
  assert.equal(cardPayload(cardValues()).planned_yield, null);
  assert.equal(cardPayload(cardValues({ planned_yield: '0' })).planned_yield, '0');
});
test('sheet dimensions require an explicit unit and both positive sides', () => {
  const base = cardValues();
  assert.equal(validCard({ ...base, sheet_width: '100' }), false);
  assert.equal(validCard({ ...base, sheet_width: '100', sheet_height: '200', sheet_unit: 'mm' }), true);
  assert.equal(validCard({ ...base, sheet_width: '-1', sheet_height: '200', sheet_unit: 'cm' }), false);
});
test('planned yield and dimensions reject out-of-range or imprecise values', () => {
  for (const planned_yield of ['-1', '100.001', 'NaN', 'Infinity', '1.2345']) {
    assert.equal(validCard({ ...cardValues(), planned_yield }), false);
  }
  for (const planned_yield of ['', '0', '100', '82.125']) {
    assert.equal(validCard({ ...cardValues(), planned_yield }), true);
  }
});
