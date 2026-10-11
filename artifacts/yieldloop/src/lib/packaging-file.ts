/** Concept file (JSON, version 1). Imported files are re-validated by the server before use. */
import { isTemplateId, paramKeysFor, type PackagingDesign } from './packaging-templates';

export const CONCEPT_FORMAT = 'yieldloop.packaging-concept';
export interface ConceptFile {
  format: typeof CONCEPT_FORMAT; version: 1; concept: true; production_validated: false;
  unit: 'mm'; dimension_basis: 'internal'; design: PackagingDesign;
}

export function toConceptFile(design: PackagingDesign): ConceptFile {
  return { format: CONCEPT_FORMAT, version: 1, concept: true, production_validated: false, unit: 'mm', dimension_basis: 'internal', design };
}

export type ParseResult = { ok: true; design: PackagingDesign } | { ok: false; code: 'json' | 'format' | 'version' | 'shape' };

export function parseConceptFile(text: string): ParseResult {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, code: 'json' }; }
  if (!raw || typeof raw !== 'object') return { ok: false, code: 'format' };
  const f = raw as Record<string, unknown>;
  if (Object.keys(f).some((k) => !['format', 'version', 'concept', 'production_validated', 'unit', 'dimension_basis', 'design'].includes(k)))
    return { ok: false, code: 'format' };
  if (f.format !== CONCEPT_FORMAT) return { ok: false, code: 'format' };
  if (f.version !== 1) return { ok: false, code: 'version' };
  if (f.unit !== 'mm' || f.dimension_basis !== 'internal' || f.concept !== true || f.production_validated !== false)
    return { ok: false, code: 'format' };
  const d = f.design as Record<string, unknown> | undefined;
  if (!d || !isTemplateId(d.template) || typeof d.name !== 'string' || typeof d.state !== 'string'
    || !d.parameters || typeof d.parameters !== 'object') return { ok: false, code: 'shape' };
  if (Object.keys(d).some((k) => !['template', 'name', 'state', 'parameters'].includes(k))) return { ok: false, code: 'shape' };
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(d.parameters as Record<string, unknown>)) {
    if (typeof v !== 'string' || !(paramKeysFor(d.template) as string[]).includes(k)) return { ok: false, code: 'shape' };
    params[k] = v;
  }
  return { ok: true, design: { template: d.template, name: d.name, state: d.state as PackagingDesign['state'], parameters: params } };
}

export function conceptFileName(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'concept';
  return `${slug}.concept.json`;
}
