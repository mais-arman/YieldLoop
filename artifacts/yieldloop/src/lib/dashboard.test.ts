import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AssistanceAnswer, AssistanceEvidence, ReportMeasures } from '@workspace/api-client-react';
import { dashboardFocus, jobStatusSlices, orderJobs, outputSlices } from './dashboard-data';
import { answerMatchesJob, assistantEntryAvailable, buildSuggestions } from './assistant-panel';

const m = (o: Partial<ReportMeasures>): ReportMeasures => ({ issued: '0', good: '0', scrap: '0', offcut: '0', accounted: '0', variance: '0', yield_rate: null, scrap_rate: null, offcut_rate: null, ...o });

test('job status slices keep real counts incl. completed and drop zeros', () => {
  const r = jobStatusSlices({ draft: 1, open: 3, completed: 2, cancelled: 0 });
  assert.deepEqual(r.slices.map((s) => s.status), ['open', 'draft', 'completed']);
  assert.equal(r.total, 6);
  assert.equal(jobStatusSlices({ draft: 0, open: 0, completed: 0, cancelled: 0 }).slices.length, 0);
});

test('output slices are null for mixed materials, empty when nothing issued', () => {
  assert.equal(outputSlices(null), null);
  assert.deepEqual(outputSlices(m({})), []);
  const r = outputSlices(m({ issued: '1000.000', good: '700.000', scrap: '180.000', offcut: '100.000', variance: '20.000' }))!;
  assert.deepEqual(r.map((x) => [x.key, x.value]), [['good', 700], ['scrap', 180], ['offcut', 100], ['variance', 20]]);
  assert.equal(r[1].raw, '180.000');
  assert.ok(!outputSlices(m({ issued: '10', good: '11', variance: '-1.000' }))!.some((x) => x.key === 'variance'));
});

test('dashboard focus differs by role without inventing data', () => {
  assert.equal(dashboardFocus('cutting_operator').exceptions, false);
  assert.equal(dashboardFocus('cutting_operator').employees, false);
  assert.equal(dashboardFocus('production_supervisor').comparison, true);
  assert.equal(dashboardFocus('manager').employees, true);
  const jobs = [{ id: 1, status: 'completed' as const }, { id: 2, status: 'open' as const }];
  assert.deepEqual(orderJobs(jobs, true).map((j) => j.id), [2, 1]);
  assert.deepEqual(orderJobs(jobs, false).map((j) => j.id), [1, 2]);
});

test('assistant entry only when provider available', () => {
  assert.equal(assistantEntryAvailable(undefined), false);
  assert.equal(assistantEntryAvailable({ available: false, provider: 'openai', model: null }), false);
  assert.equal(assistantEntryAvailable({ available: true, provider: 'openai', model: 'x' }), true);
});

const ev = (o: Partial<AssistanceEvidence> = {}): AssistanceEvidence => ({
  job: { id: 2, job_number: 'JOB-0002', reference: 'IK-202', status: 'open', revision: 3 }, material_revision: 1, generated_at: '',
  recorded_facts: [], calculated_findings: { issued: '1000.000' }, largest_scrap_category: { reason: 'Setup/layout', quantity: '180.000' }, cutting: [], limitations: [], ...o,
});

test('suggestions come from accessible records only', () => {
  assert.deepEqual(buildSuggestions(undefined, undefined, []), []);
  const cur = { id: 2, reference: 'IK-202', job_number: 'JOB-0002', machine: 'Polar 115' };
  const peers = [cur, { id: 3, reference: 'IK-203', job_number: 'JOB-0003', machine: 'Polar 115' }, { id: 4, reference: '', job_number: 'JOB-0004', machine: 'Other' }];
  const s = buildSuggestions(ev(), cur, peers);
  assert.deepEqual(s.map((x) => x.kind), ['scrap', 'material', 'compare']);
  assert.deepEqual(s[2], { kind: 'compare', a: 'IK-202', b: 'IK-203', href: '/comparison?left=2&right=3' });
  const none = buildSuggestions(ev({ largest_scrap_category: null, calculated_findings: null }), { ...cur, machine: '' }, peers);
  assert.deepEqual(none, []);
});

test('answers are scoped to the requested job', () => {
  const a = { evidence: ev() } as AssistanceAnswer;
  assert.equal(answerMatchesJob(a, 2), true);
  assert.equal(answerMatchesJob(a, 3), false);
  assert.equal(answerMatchesJob(a, null), false);
});
