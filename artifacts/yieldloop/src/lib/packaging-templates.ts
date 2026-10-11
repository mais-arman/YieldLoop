/** Packaging concept templates — pure, typed, framework-free. Server remains authoritative. */
export type TemplateId = 'tray' | 'sleeve' | 'lid_box' | 'flat_box';
/** flat_box shares lid_box fields and geometry (a shallow telescoping box). */
export const hasLid = (t: TemplateId) => t === 'lid_box' || t === 'flat_box';
export type ViewState = 'assembled' | 'open';
export type ParamKey = 'length' | 'width' | 'height' | 'thickness' | 'lid_height' | 'clearance';
export type Params = Partial<Record<ParamKey, string>>;

export interface PackagingDesign { template: TemplateId; name: string; parameters: Params; state: ViewState }

export const TEMPLATE_IDS: TemplateId[] = ['tray', 'sleeve', 'lid_box', 'flat_box'];
export const CORE_KEYS: ParamKey[] = ['length', 'width', 'height', 'thickness'];

export function isTemplateId(v: unknown): v is TemplateId {
  return typeof v === 'string' && (TEMPLATE_IDS as string[]).includes(v);
}
export function paramKeysFor(template: TemplateId): ParamKey[] {
  return hasLid(template) ? [...CORE_KEYS, 'lid_height', 'clearance'] : [...CORE_KEYS];
}
export function statesFor(template: TemplateId): ViewState[] {
  return template === 'sleeve' ? ['assembled'] : ['assembled', 'open'];
}
/** Blank parameters — never invent default dimensions. */
export function blankParams(template: TemplateId): Params {
  return Object.fromEntries(paramKeysFor(template).map((k) => [k, ''])) as Params;
}
/** Re-key params when template changes, keeping shared values the user typed. */
export function switchTemplate(prev: Params, template: TemplateId): Params {
  const next = blankParams(template);
  for (const k of paramKeysFor(template)) if (prev[k] !== undefined) next[k] = prev[k];
  return next;
}
