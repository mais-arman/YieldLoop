import type { JobComparison, ProductionJob } from '@workspace/api-client-react';
import { AuthError } from './auth';

/* ---------- pure helpers ---------- */
/** Human reference shown to users; internal job_number is the fallback. */
export function jobLabel(job: Pick<ProductionJob, 'reference' | 'job_number'>): string {
  return (job.reference ?? '').trim() || job.job_number;
}
/** True when both identifiers are worth showing for traceability. */
export function showsBothIds(job: Pick<ProductionJob, 'reference' | 'job_number'>): boolean {
  const r = (job.reference ?? '').trim();
  return !!r && r !== job.job_number;
}
export const UNSPECIFIED = 'Unspecified (not supplied)';
export function scrapReasonText(reason: string | null | undefined, unspecified: string): string {
  const r = (reason ?? '').trim();
  return r || unspecified;
}
/** Explicit sign on a server decimal string; no Number arithmetic. */
export function signedDecimal(v: string | null | undefined): string | null {
  if (v === null || v === undefined || v === '') return null;
  const s = v.trim();
  if (s.startsWith('-') || s.startsWith('+')) return s;
  if (/^0*(\.0*)?$/.test(s)) return s;
  return `+${s}`;
}
export type ComparisonVerdict = 'same' | 'machine_missing' | 'machine_mismatch' | 'material_mismatch' | 'unmeasured';
export function comparisonVerdict(c: Pick<JobComparison, 'same_machine' | 'comparable_material' | 'differences' | 'left' | 'right'>): ComparisonVerdict {
  const lm = (c.left.job.machine ?? '').trim(), rm = (c.right.job.machine ?? '').trim();
  if (!lm || !rm) return 'machine_missing';
  if (!c.same_machine) return 'machine_mismatch';
  if (!c.comparable_material) return 'material_mismatch';
  if (!c.differences || !c.left.summary || !c.right.summary) return 'unmeasured';
  return 'same';
}
export const CLOSE_CODES = ['machine_required', 'material_incomplete', 'material_unbalanced', 'job_closed', 'stale_revision'] as const;
export type CloseCode = (typeof CLOSE_CODES)[number];
export function closeErrorCode(err: unknown): CloseCode | null {
  if (!(err instanceof AuthError)) return null;
  if ((CLOSE_CODES as readonly string[]).includes(err.code)) return err.code as CloseCode;
  for (const codes of Object.values(err.fields ?? {})) {
    const hit = codes?.find((c) => (CLOSE_CODES as readonly string[]).includes(c));
    if (hit) return hit as CloseCode;
  }
  return null;
}
/** Operators only see Open jobs; after closing they must leave the page. */
export function redirectAfterClose(role: string): boolean { return role === 'cutting_operator'; }

