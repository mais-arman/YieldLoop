import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boardPreview, squareWidthPatch, toggleSquareLock, readableDecimal, trimDecimal } from './display-format';

test('trimDecimal removes only insignificant zeros', () => {
  assert.equal(trimDecimal('12.500'), '12.5');
  assert.equal(trimDecimal('40.000'), '40');
  assert.equal(trimDecimal('100'), '100');
  assert.equal(trimDecimal('0.001'), '0.001');
  assert.equal(trimDecimal('-0.000'), '0');
  assert.equal(trimDecimal('n/a'), 'n/a');
});

test('readableDecimal groups without rounding', () => {
  assert.equal(readableDecimal('2440000.000'), '2,440,000');
  assert.equal(readableDecimal('1234567.125'), '1,234,567.125');
  assert.equal(readableDecimal('87.5000'), '87.5');
});

test('boardPreview requires real width and height', () => {
  assert.equal(boardPreview({ width: '', height: '1220', left: '', right: '', top: '', bottom: '' }), null);
  assert.equal(boardPreview({ width: '0', height: '1220', left: '', right: '', top: '', bottom: '' }), null);
  assert.equal(boardPreview({ width: '12.3456', height: '10', left: '', right: '', top: '', bottom: '' }), null);
  const partial = boardPreview({ width: '2440', height: '1220', left: '10', right: '10.5', top: '5', bottom: 'x' });
  assert.ok(partial);
  assert.equal(partial.marginsValid, false);
  assert.equal(partial.usableW, null);
  assert.equal(partial.usableH, null);
  assert.equal(partial.left, 0);
  const blank = boardPreview({ width: '2440', height: '1220', left: '', right: '0', top: '0', bottom: '0' });
  assert.equal(blank?.marginsValid, false);
  assert.equal(blank?.usableW, null);
});

test('boardPreview draws usable area only with explicit valid margins (0 allowed)', () => {
  const p = boardPreview({ width: '2440', height: '1220', left: '10', right: '10.5', top: '5', bottom: '0' });
  assert.ok(p);
  assert.equal(p.marginsValid, true);
  assert.equal(p.usableW, '2419.5');
  assert.equal(p.usableH, '1215');
  const over = boardPreview({ width: '100', height: '100', left: '60', right: '60', top: '0', bottom: '0' });
  assert.equal(over?.marginsValid, true);
  assert.equal(over?.usableW, null);
});

test('square lock toggles and mirrors width into height', () => {
  const on = toggleSquareLock(new Set(), 'a', '300', '200');
  assert.ok(on.next.has('a'));
  assert.deepEqual(on.patch, { height: '300' });
  assert.equal(toggleSquareLock(new Set(), 'a', '300', '300').patch, null);
  const off = toggleSquareLock(on.next, 'a', '300', '300');
  assert.equal(off.next.has('a'), false);
  assert.equal(off.patch, null);
  assert.deepEqual(squareWidthPatch(on.next, 'a', '450'), { width: '450', height: '450' });
  assert.deepEqual(squareWidthPatch(new Set(), 'a', '450'), { width: '450' });
});
