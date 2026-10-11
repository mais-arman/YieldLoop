import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blankParams, paramKeysFor, statesFor, switchTemplate } from './packaging-templates';
import { isValid, parseMm, toDims, validateDesign } from './packaging-validation';
import { bounds, buildPanels, externalSize, lidPanels, sleevePanels, trayPanels } from './packaging-geometry';
import { parseConceptFile, toConceptFile } from './packaging-file';

const core = { length: '200', width: '100', height: '50', thickness: '2' };

test('blank params never invent defaults', () => {
  assert.deepEqual(blankParams('tray'), { length: '', width: '', height: '', thickness: '' });
  assert.deepEqual(paramKeysFor('lid_box'), ['length', 'width', 'height', 'thickness', 'lid_height', 'clearance']);
  assert.deepEqual(switchTemplate({ ...core, lid_height: '10' }, 'tray'), core);
});

test('sleeve has no open state', () => {
  assert.deepEqual(statesFor('sleeve'), ['assembled']);
  assert.equal(validateDesign('sleeve', core, 'open').state, 'state_unsupported');
  assert.throws(() => buildPanels('sleeve', toDims('sleeve', core), 'open'));
});

test('strict decimal parsing', () => {
  assert.equal(parseMm('12.125'), 12.125);
  assert.equal(parseMm('1e3'), null);
  assert.equal(parseMm('1.2345'), null);
  assert.equal(parseMm('-1'), null);
});

test('boundaries', () => {
  assert.ok(isValid(validateDesign('tray', { length: '1', width: '1', height: '1', thickness: '0.25' }, 'assembled')));
  assert.equal(validateDesign('tray', { ...core, length: '0.999' }, 'assembled').length, 'min');
  assert.equal(validateDesign('tray', { ...core, length: '5000.001' }, 'assembled').length, 'max');
  assert.equal(validateDesign('tray', { ...core, thickness: '20.001' }, 'assembled').thickness, 'max');
  assert.equal(validateDesign('tray', { ...core, thickness: '12.6' }, 'assembled').thickness, 'thickness_ratio');
  assert.ok(isValid(validateDesign('tray', { ...core, thickness: '12.5' }, 'assembled')));
  assert.equal(validateDesign('tray', { ...core, extra: '1' }, 'assembled').parameters, 'unknown');
  assert.equal(validateDesign('tray', { ...core, lid_height: '1' }, 'assembled').parameters, 'unknown');
  assert.equal(validateDesign('lid_box', { ...core, lid_height: '51', clearance: '1' }, 'open').lid_height, 'lid_exceeds_height');
  assert.equal(validateDesign('lid_box', { ...core, lid_height: '20', clearance: '0.05' }, 'open').clearance, 'min');
  assert.equal(validateDesign('lid_box', core, 'open').lid_height, 'required');
  assert.equal(validateDesign('box', core, 'open').template, 'template');
});

test('tray panels match contract and update with size', () => {
  const d = toDims('tray', core);
  const [base, sx] = trayPanels(d);
  assert.deepEqual(base.size, [204, 2, 104]);
  assert.equal(base.center[1], 1);
  assert.deepEqual(sx.size, [2, 50, 100]);
  assert.deepEqual(sx.center, [-101, 27, 0]);
  const end = trayPanels(d)[3];
  assert.deepEqual(end.size, [204, 50, 2]);
  assert.equal(end.center[2], -51);
  assert.deepEqual(externalSize('tray', d), [204, 52, 104]);
  const bigger = trayPanels(toDims('tray', { ...core, length: '300' }));
  assert.deepEqual(bigger[0].size, [304, 2, 104]);
});

test('tray open separates panels without resizing', () => {
  const d = toDims('tray', core);
  const a = buildPanels('tray', d, 'assembled'); const o = buildPanels('tray', d, 'open');
  o.forEach((p, i) => assert.deepEqual(p.size, a[i].size));
  assert.ok(o[1].center[0] < a[1].center[0]);
  assert.ok(o[4].center[2] > a[4].center[2]);
});

test('sleeve panels: open ends, top at H+t', () => {
  const s = sleevePanels(toDims('sleeve', core));
  assert.deepEqual(s[0].size, [200, 2, 104]);
  assert.equal(s[1].center[1] - 1, 52);
  assert.deepEqual(s[2].size, [200, 50, 2]);
  assert.equal(s[3].center[2], 51);
  const b = bounds(s);
  assert.equal(b.max[0] - b.min[0], 200);
});

test('lid box lid dims and lift', () => {
  const p = { ...core, lid_height: '20', clearance: '1' };
  const d = toDims('lid_box', p);
  const [top, xneg] = lidPanels(d);
  assert.deepEqual(top.size, [210, 2, 110]);
  assert.equal(top.center[1] - 1, 53);
  assert.equal(xneg.size[1], 20);
  assert.equal(xneg.center[1] + 10, 53);
  const a = buildPanels('lid_box', d, 'assembled'); const o = buildPanels('lid_box', d, 'open');
  assert.equal(a.length, 10);
  assert.deepEqual(o[0], a[0]);
  assert.ok(o[5].center[1] > a[5].center[1]);
  assert.deepEqual(o[5].size, a[5].size);
});

test('concept file roundtrip v1', () => {
  const design = { template: 'tray' as const, name: 'A', parameters: core, state: 'assembled' as const };
  const r = parseConceptFile(JSON.stringify(toConceptFile(design)));
  assert.ok(r.ok && r.design.name === 'A');
  assert.deepEqual(parseConceptFile('{'), { ok: false, code: 'json' });
  assert.deepEqual(parseConceptFile(JSON.stringify({ ...toConceptFile(design), version: 2 })), { ok: false, code: 'version' });
  assert.deepEqual(parseConceptFile(JSON.stringify({ ...toConceptFile(design), unexpected: 'no' })), { ok: false, code: 'format' });
  assert.deepEqual(parseConceptFile(JSON.stringify({ ...toConceptFile(design), design: { ...design, unexpected: true } })), { ok: false, code: 'shape' });
  assert.deepEqual(parseConceptFile(JSON.stringify({ ...toConceptFile(design), design: { ...design, parameters: { ...core, extra: '4' } } })), { ok: false, code: 'shape' });
  for (const incompatible of [{ unit: 'cm' }, { dimension_basis: 'external' }, { concept: false }, { production_validated: true }]) {
    assert.deepEqual(parseConceptFile(JSON.stringify({ ...toConceptFile(design), ...incompatible })), { ok: false, code: 'format' });
  }
});

test('assembled panels meet without positive-volume intersections', () => {
  for (const template of ['tray', 'sleeve', 'lid_box'] as const) {
    for (const size of ['20', '300', '5000']) {
      const panels = buildPanels(template, toDims(template, { length: size, width: size, height: '20', thickness: '0.1', lid_height: '20', clearance: '0.1' }), 'assembled');
      for (let i = 0; i < panels.length; i++) for (let j = i + 1; j < panels.length; j++) {
        const a = panels[i], b = panels[j];
        const intersects = [0, 1, 2].every((axis) =>
          Math.min(a.center[axis] + a.size[axis] / 2, b.center[axis] + b.size[axis] / 2)
          - Math.max(a.center[axis] - a.size[axis] / 2, b.center[axis] - b.size[axis] / 2) > 1e-8);
        assert.equal(intersects, false, `${template}: ${a.id}/${b.id}`);
      }
    }
  }
});
