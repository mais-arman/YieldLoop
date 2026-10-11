/** Client pre-check mirroring the server contract. The server's /packaging/validate result is authoritative. */
import { hasLid, isTemplateId, paramKeysFor, statesFor, type Params, type ParamKey, type TemplateId, type ViewState } from './packaging-templates';

export type FieldCode = 'required' | 'format' | 'min' | 'max' | 'thickness_ratio' | 'lid_exceeds_height' | 'unknown' | 'state_unsupported' | 'template' | 'flat_too_tall';
export type FieldErrors = Partial<Record<ParamKey | 'state' | 'template' | 'name' | 'parameters', FieldCode>>;

export const LIMITS: Record<ParamKey, [number, number]> = {
  length: [1, 5000], width: [1, 5000], height: [1, 5000],
  thickness: [0.1, 20], lid_height: [1, 5000], clearance: [0.1, 20],
};
const DECIMAL = /^\d{1,4}(\.\d{1,3})?$/;

/** Parse a strict mm decimal (≤3 places, no exponent/sign). Returns null when malformed. */
export function parseMm(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const s = raw.trim();
  if (!DECIMAL.test(s)) return null;
  return Number(s);
}

export function validateDesign(template: string, params: Record<string, string | undefined>, state: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!isTemplateId(template)) return { template: 'template' };
  const keys = paramKeysFor(template);
  for (const k of Object.keys(params)) if (!(keys as string[]).includes(k)) errors.parameters = 'unknown';
  const n: Partial<Record<ParamKey, number>> = {};
  for (const k of keys) {
    const raw = params[k];
    if (raw === undefined || raw.trim() === '') { errors[k] = 'required'; continue; }
    const v = parseMm(raw);
    if (v === null) { errors[k] = 'format'; continue; }
    const [min, max] = LIMITS[k];
    if (v < min) errors[k] = 'min';
    else if (v > max) errors[k] = 'max';
    else n[k] = v;
  }
  const { length: L, width: W, height: H, thickness: t } = n;
  if (L !== undefined && W !== undefined && H !== undefined && t !== undefined && 4 * t > Math.min(L, W, H)) errors.thickness = 'thickness_ratio';
  if (hasLid(template) && n.lid_height !== undefined && H !== undefined && n.lid_height > H) errors.lid_height = 'lid_exceeds_height';
  if (template === 'flat_box' && L !== undefined && W !== undefined && H !== undefined && !errors.height && H > Math.min(L, W)) errors.height = 'flat_too_tall';
  if (!(statesFor(template) as string[]).includes(state)) errors.state = 'state_unsupported';
  return errors;
}

export const isValid = (e: FieldErrors) => Object.keys(e).length === 0;

/** Numeric dims for geometry; only call after validation succeeded. */
export interface Dims { L: number; W: number; H: number; t: number; lid?: number; c?: number }
export function toDims(template: TemplateId, p: Params): Dims {
  const d: Dims = { L: Number(p.length), W: Number(p.width), H: Number(p.height), t: Number(p.thickness) };
  if (hasLid(template)) { d.lid = Number(p.lid_height); d.c = Number(p.clearance); }
  return d;
}
export type { ViewState };
