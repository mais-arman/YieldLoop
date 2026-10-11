import { AuthError } from '@/lib/auth';
import { errorMessage } from '@/lib/session';
import type { MsgKey } from '@/lib/i18n';
import type { CuttingInput, CuttingResult, CuttingScenario, Placement } from '@/lib/cutting';
import type { Ct, CtKey } from './cutting-i18n';

export type Rot = '' | 'yes' | 'no';
export interface PieceForm { key: string; label: string; width: string; height: string; quantity: string; rotation: Rot }
export interface InputForm {
  unit: '' | 'mm'; material_id: number | null; material_name: string; stock_label: string;
  cutting_mode: '' | 'rectangular_spacing_only';
  width: string; height: string; quantity: string; left: string; right: string; top: string; bottom: string; kerf: string;
  pieces: PieceForm[];
}
export interface Draft {
  key: string; name: string; form: InputForm; placements: Placement[];
  origin: 'manual' | 'shelf_v1'; result: CuttingResult | null; resultSig: string | null;
}

export const MAX_SCENARIOS = 4;
export const MAX_PIECES = 20;
export const MAX_COPIES = 100;
const DEC = /^(0|[1-9]\d{0,5})(\.\d{1,3})?$/;
const INT = /^[1-9]\d{0,2}$/;

const rid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 10);
export const newPieceKey = () => `p${rid()}`;
export const newScenarioKey = () => `s${rid()}`;

export const blankPiece = (): PieceForm => ({ key: newPieceKey(), label: '', width: '', height: '', quantity: '', rotation: '' });
export const blankForm = (): InputForm => ({
  unit: '', material_id: null, material_name: '', stock_label: '', cutting_mode: '',
  width: '', height: '', quantity: '', left: '', right: '', top: '', bottom: '', kerf: '', pieces: [blankPiece()],
});
export const blankDraft = (name: string): Draft => ({
  key: newScenarioKey(), name, form: blankForm(), placements: [], origin: 'manual', result: null, resultSig: null,
});

export const fmtNum = (n: number) => {
  const r = Math.round(n * 1000) / 1000;
  return r.toFixed(3).replace(/\.?0+$/, '') || '0';
};
const grid = (v: string) => Math.round(Number(v) * 1000);

export type FormErrors = Record<string, CtKey>;
export interface Validated { input: CuttingInput | null; errors: FormErrors; copies: number }

export function validateForm(f: InputForm): Validated {
  const e: FormErrors = {};
  const dim = (k: string, v: string, positive: boolean) => {
    const s = v.trim();
    if (!s) e[k] = 'fieldRequired';
    else if (!DEC.test(s) || Number(s) > 100000) e[k] = 'fieldFormat';
    else if (positive && grid(s) <= 0) e[k] = 'fieldPositive';
  };
  if (!f.unit) e.unit = 'unitRequired';
  if (f.material_id === null) e.material = 'materialRequired';
  if (!f.stock_label.trim()) e.stock_label = 'fieldRequired';
  else if (f.stock_label.trim().length > 120) e.stock_label = 'labelTooLong';
  if (!f.cutting_mode) e.cutting_mode = 'modeRequired';
  dim('width', f.width, true); dim('height', f.height, true);
  if (!INT.test(f.quantity.trim()) || Number(f.quantity) > 10) e.quantity = 'fieldInt';
  for (const k of ['left', 'right', 'top', 'bottom', 'kerf'] as const) dim(k, f[k], false);
  if (!e.width && !e.left && !e.right && grid(f.left) + grid(f.right) >= grid(f.width)) e.left = 'unusableBoard';
  if (!e.height && !e.top && !e.bottom && grid(f.top) + grid(f.bottom) >= grid(f.height)) e.top = 'unusableBoard';
  if (f.pieces.length === 0) e.pieces = 'noPieces';
  if (f.pieces.length > MAX_PIECES) e.pieces = 'tooManyPieces';
  let copies = 0;
  f.pieces.forEach((p, i) => {
    if (!p.label.trim()) e[`p${i}.label`] = 'fieldRequired';
    else if (p.label.trim().length > 80) e[`p${i}.label`] = 'labelTooLong';
    dim(`p${i}.width`, p.width, true); dim(`p${i}.height`, p.height, true);
    if (!INT.test(p.quantity.trim()) || Number(p.quantity) > MAX_COPIES) e[`p${i}.quantity`] = 'fieldInt';
    else copies += Number(p.quantity);
    if (!p.rotation) e[`p${i}.rotation`] = 'rotationRequired';
  });
  if (copies > MAX_COPIES) e.pieces = 'tooManyCopies';
  if (Object.keys(e).length) return { input: null, errors: e, copies };
  return {
    errors: e, copies,
    input: {
      unit: 'mm', material_id: f.material_id!, stock_label: f.stock_label.trim(), cutting_mode: 'rectangular_spacing_only',
      board: { width: f.width.trim(), height: f.height.trim(), quantity: Number(f.quantity), left: f.left.trim(), right: f.right.trim(), top: f.top.trim(), bottom: f.bottom.trim() },
      kerf: f.kerf.trim(),
      pieces: f.pieces.map((p) => ({ key: p.key, label: p.label.trim(), width: p.width.trim(), height: p.height.trim(), quantity: Number(p.quantity), rotation_allowed: p.rotation === 'yes' })),
    },
  };
}

export const sig = (input: CuttingInput | null, placements: Placement[]) => (input ? JSON.stringify({ input, placements }) : null);

export function formFromInput(i: CuttingInput): InputForm {
  return {
    unit: i.unit, material_id: i.material_id, material_name: '', stock_label: i.stock_label, cutting_mode: i.cutting_mode,
    width: i.board.width, height: i.board.height, quantity: String(i.board.quantity),
    left: i.board.left, right: i.board.right, top: i.board.top, bottom: i.board.bottom, kerf: i.kerf,
    pieces: i.pieces.map((p) => ({ key: p.key, label: p.label, width: p.width, height: p.height, quantity: String(p.quantity), rotation: p.rotation_allowed ? 'yes' : 'no' })),
  };
}

export function draftFromScenario(s: CuttingScenario): Draft {
  const form = formFromInput(s.input);
  const input = validateForm(form).input;
  return {
    key: s.key, name: s.name, form, placements: s.placements, origin: s.origin,
    result: s.result ?? null, resultSig: s.result ? sig(input, s.placements) : null,
  };
}

export function scenarioFromDraft(d: Draft): CuttingScenario | null {
  const input = validateForm(d.form).input;
  if (!input) return null;
  return { key: d.key, name: d.name.trim(), input, placements: d.placements, origin: d.origin };
}

/** Comparable snapshot for dirty detection (ignores results). */
export const snapshot = (name: string, drafts: Draft[]) =>
  JSON.stringify({ name, s: drafts.map((d) => ({ k: d.key, n: d.name, f: { ...d.form, material_name: '' }, p: d.placements, o: d.origin })) });

/** Current result only if computed for this exact input + layout. */
export function currentResult(d: Draft): CuttingResult | null {
  const s = sig(validateForm(d.form).input, d.placements);
  return s && d.result && d.resultSig === s ? d.result : null;
}

export function pieceDims(input: CuttingInput, p: Placement) {
  const part = input.pieces.find((t) => t.key === p.piece_key)!;
  return { part, w: Number(p.rotated ? part.height : part.width), h: Number(p.rotated ? part.width : part.height) };
}

export const pid = (p: { piece_key: string; copy: number }) => `${p.piece_key}:${p.copy}`;

export function unplacedCopies(input: CuttingInput, placements: Placement[]) {
  const set = new Set(placements.map(pid));
  const out: { piece_key: string; copy: number; label: string }[] = [];
  for (const p of input.pieces) for (let c = 0; c < p.quantity; c++) if (!set.has(`${p.key}:${c}`)) out.push({ piece_key: p.key, copy: c, label: p.label });
  return out;
}

export const PALETTE = ['199 64% 42%', '28 78% 48%', '152 45% 36%', '262 38% 52%', '346 56% 48%', '45 80% 42%', '182 50% 34%', '12 60% 44%'];
export const colorFor = (input: CuttingInput, key: string) => PALETTE[Math.max(0, input.pieces.findIndex((p) => p.key === key)) % PALETTE.length];

export function cuttingErrorMessage(err: unknown, ct: Ct, t: (k: MsgKey) => string): string {
  if (err instanceof AuthError) {
    const geometric = [
      'dimension_format', 'dimension_range', 'unusable_board', 'unknown_piece',
      'duplicate_placement', 'unknown_board', 'rotation_forbidden', 'out_of_bounds', 'overlap_or_kerf',
    ];
    if (geometric.includes(err.code)) return ct(`pe_${err.code}` as CtKey);
    const k = `ce_${err.code}` as CtKey;
    if (['stale_revision', 'duplicate_request', 'job_closed', 'validation_error', 'invalid_placement'].includes(err.code)) {
      const base = ct(k);
      const fields = err.fields ? Object.keys(err.fields).slice(0, 4).join(', ') : '';
      return fields ? `${base} (${fields})` : base;
    }
    if (err.status === 400 && err.fields) return `${t('err_validation_error')} (${Object.keys(err.fields).slice(0, 4).join(', ')})`;
  }
  return errorMessage(err, t);
}
