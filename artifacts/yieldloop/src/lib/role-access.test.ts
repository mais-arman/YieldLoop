import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canAccess, navFor, pageSlice, pagerState } from './role-access';
import { buildSuggestions } from './assistant-panel';

const hrefs = (r: Parameters<typeof navFor>[0]) => navFor(r).map((e) => e.href);

test('operator sees work-focused navigation only', () => {
  assert.deepEqual(hrefs('cutting_operator'), ['/jobs', '/cutting', '/inventory']);
  for (const a of ['dashboard', 'reports', 'comparison', 'employees', 'jobNew', 'health'] as const) assert.equal(canAccess('cutting_operator', a), false);
});
test('supervisor sees production areas but not employees', () => {
  const h = hrefs('production_supervisor');
  assert.ok(h.includes('/dashboard') && h.includes('/reports'));
  assert.ok(!h.includes('/employees'));
  assert.equal(canAccess('production_supervisor', 'comparison'), true);
  assert.equal(canAccess('production_supervisor', 'jobNew'), false);
});
test('employees only for manager', () => {
  assert.ok(hrefs('manager').includes('/employees'));
  assert.equal(canAccess('manager', 'employees'), true);
  assert.equal(canAccess('production_supervisor', 'employees'), false);
});
test('pager hides single page and disables ends', () => {
  assert.deepEqual(pagerState(1, 1), { visible: false, canPrev: false, canNext: false, total: 1 });
  assert.deepEqual(pagerState(1, 0).visible, false);
  assert.deepEqual(pagerState(1, 3), { visible: true, canPrev: false, canNext: true, total: 3 });
  assert.deepEqual(pagerState(3, 3), { visible: true, canPrev: true, canNext: false, total: 3 });
});
test('compare suggestion omitted when comparison not permitted', () => {
  const ev = { job: { id: 1, reference: 'IK-202', job_number: 'J1' }, largest_scrap_category: null, calculated_findings: null } as never;
  const cur = { id: 1, reference: 'IK-202', job_number: 'J1', machine: 'M1' };
  const peers = [cur, { id: 2, reference: 'IK-203', job_number: 'J2', machine: 'M1' }];
  assert.equal(buildSuggestions(ev, cur, peers).length, 1);
  assert.equal(buildSuggestions(ev, cur, peers, false).length, 0);
});
test('client page slice is bounded and clamps', () => {
  const xs = Array.from({ length: 23 }, (_, i) => i);
  assert.deepEqual(pageSlice(xs, 1, 10).rows, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(pageSlice(xs, 3, 10).rows.length, 3);
  assert.equal(pageSlice(xs, 9, 10).page, 3);
  assert.equal(pageSlice([], 1, 10).totalPages, 1);
});
