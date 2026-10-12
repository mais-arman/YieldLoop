import test from 'node:test';
import assert from 'node:assert/strict';
import { draftFromScenario, scenarioFromDraft } from '../components/cutting/model';
import type { CuttingScenario } from './cutting';

test('panel provenance survives editor load and serialization', () => {
  const s: CuttingScenario = { key: 'kit', name: 'Kit', origin: 'manual', placements: [],
    source: { concept_id: 5, revision: 2, method: 'separate_panels_v1' },
    input: { unit: 'mm', material_id: 1, stock_label: 'Test', cutting_mode: 'rectangular_spacing_only', kerf: '2',
      board: { width: '1000', height: '1000', quantity: 2, left: '10', right: '10', top: '10', bottom: '10' },
      pieces: [{ key: 'base', label: 'Base', width: '356', height: '356', quantity: 1, rotation_allowed: false }] } };
  assert.deepEqual(scenarioFromDraft(draftFromScenario(s))?.source, s.source);
});
