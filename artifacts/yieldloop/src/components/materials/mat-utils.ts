import { AuthError } from '@/lib/auth';
import type { MsgKey } from '@/lib/i18n';
import { jobErrorMessage } from '@/components/job-ui';
import { extraErrorText } from '@/lib/feature-i18n';
const lang = () => (document.documentElement.lang === 'ar' ? 'ar' : 'en');

type T = (k: MsgKey, v?: Record<string, string | number>) => string;

const MAT_CODES = new Set([
  'issue_required', 'material_mismatch', 'unit_mismatch', 'stale_revision', 'job_not_open',
  'material_conflict', 'duplicate_record', 'already_voided', 'material_record_conflict', 'inventory_active',
]);
const FIELDS = new Set(['quantity', 'note', 'kind', 'material_id', 'reason', 'name', 'specification', 'unit', 'revision', 'job_revision', 'non_field_errors']);
const FE = new Set(['required', 'blank', 'max_length', 'invalid_choice', 'invalid', 'unknown_field']);

/** Quantity: positive, max 12 integer digits, max 3 decimals. String-only checks, no float math. */
export function quantityError(q: string, t: T): string | undefined {
  const v = q.trim();
  if (!v) return t('qtyRequired');
  if (!/^\d{1,12}(\.\d{1,3})?$/.test(v)) return t('qtyFormat');
  if (/^0+(\.0+)?$/.test(v)) return t('qtyPositive');
  return undefined;
}

export const isZero = (s: string) => /^[-+]?0*(\.0*)?$/.test(s.trim());
export const signed = (s: string) => (s.startsWith('-') || s.startsWith('+') || isZero(s) ? s.replace(/^-/, '−') : `+${s}`);

export function matErrorMessage(err: unknown, t: T): string {
  if (err instanceof AuthError && MAT_CODES.has(err.code)) return t(`mat_err_${err.code}` as MsgKey);
  if (!(err instanceof AuthError)) return t('err_network');
  return extraErrorText(err.code, lang()) ?? jobErrorMessage(err, t);
}

export function matFieldErrors(err: unknown, t: T): Record<string, string> {
  const out: Record<string, string> = {};
  if (!(err instanceof AuthError) || !err.fields) return out;
  for (const [name, codes] of Object.entries(err.fields)) {
    if (!codes?.length) continue;
    const label = FIELDS.has(name) ? t(`field_${name}` as MsgKey) : name;
    const mc = codes.find((c) => MAT_CODES.has(c));
    if (mc) { out[name] = t(`mat_err_${mc}` as MsgKey); continue; }
    const x2 = codes.map((x) => extraErrorText(x, lang())).find(Boolean);
    if (x2) { out[name] = x2; continue; }
    const c = codes.find((x) => FE.has(x));
    out[name] = c ? t(`fe_${c}` as MsgKey, { field: label }) : t('fieldInvalid', { field: label });
  }
  return out;
}

export const isConflict = (e: unknown) => e instanceof AuthError && e.status === 409;
export const isUncertain = (e: unknown) => !!e && !(e instanceof AuthError);
export const newRequestId = () => crypto.randomUUID();

const INV_CODES = new Set(['inventory_conflict', 'already_registered', 'invalid_offcut_source', 'job_not_open', 'stale_revision', 'reuse_policy_required', 'inventory_active']);
export function invErrorMessage(err: unknown, t: T): string {
  if (err instanceof AuthError && INV_CODES.has(err.code)) return t(`inv_err_${err.code}` as MsgKey);
  if (!(err instanceof AuthError)) return t('err_network');
  return extraErrorText(err.code, lang()) ?? jobErrorMessage(err, t);
}

/** Exact decimal compare on kg strings (<=3 decimals) via BigInt thousandths; no float math. */
export function milli(s: string): bigint {
  const v = s.trim().replace(/^\+/, '');
  const neg = v.startsWith('-');
  const [i, f = ''] = v.replace(/^-/, '').split('.');
  const n = BigInt(i || '0') * 1000n + BigInt((f + '000').slice(0, 3));
  return neg ? -n : n;
}
export const cmpDec = (a: string, b: string) => { const x = milli(a), y = milli(b); return x === y ? 0 : x < y ? -1 : 1; };
