import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AuthError } from './auth';
import { closeErrorCode, comparisonVerdict, jobLabel, redirectAfterClose, scrapReasonText, showsBothIds, signedDecimal } from './core-helpers';

test('jobLabel prefers reference', () => {
  assert.equal(jobLabel({ reference: 'IK-202', job_number: 'JOB-0001' }), 'IK-202');
  assert.equal(jobLabel({ reference: '  ', job_number: 'JOB-0001' }), 'JOB-0001');
  assert.equal(showsBothIds({ reference: 'IK-202', job_number: 'JOB-0001' }), true);
  assert.equal(showsBothIds({ reference: '', job_number: 'JOB-0001' }), false);
});
test('blank scrap reason is Unspecified', () => {
  assert.equal(scrapReasonText('', 'U'), 'U');
  assert.equal(scrapReasonText(null, 'U'), 'U');
  assert.equal(scrapReasonText('Setup', 'U'), 'Setup');
});
test('signedDecimal keeps exact strings', () => {
  assert.equal(signedDecimal('1.250'), '+1.250');
  assert.equal(signedDecimal('-0.100'), '-0.100');
  assert.equal(signedDecimal('0.000'), '0.000');
  assert.equal(signedDecimal(null), null);
});
const side = (machine: string, summary: boolean) => ({ job: { machine }, summary: summary ? {} : null }) as never;
test('comparisonVerdict', () => {
  assert.equal(comparisonVerdict({ same_machine: true, comparable_material: true, differences: {}, left: side('CT-2', true), right: side('CT-2', true) }), 'same');
  assert.equal(comparisonVerdict({ same_machine: false, comparable_material: true, differences: null, left: side('', true), right: side('CT-2', true) }), 'machine_missing');
  assert.equal(comparisonVerdict({ same_machine: false, comparable_material: true, differences: null, left: side('CT-1', true), right: side('CT-2', true) }), 'machine_mismatch');
  assert.equal(comparisonVerdict({ same_machine: true, comparable_material: false, differences: null, left: side('CT-2', true), right: side('CT-2', true) }), 'material_mismatch');
  assert.equal(comparisonVerdict({ same_machine: true, comparable_material: true, differences: null, left: side('CT-2', false), right: side('CT-2', true) }), 'unmeasured');
});
test('close error codes and redirect', () => {
  assert.equal(closeErrorCode(new AuthError(400, 'material_unbalanced')), 'material_unbalanced');
  assert.equal(closeErrorCode(new Error('x')), null);
  assert.equal(redirectAfterClose('cutting_operator'), true);
  assert.equal(redirectAfterClose('manager'), false);
});
