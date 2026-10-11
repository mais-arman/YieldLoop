import { AuthError } from '@/lib/auth';
import type { JobStatus } from '@/lib/jobs';
import { useI18n, type MsgKey } from '@/lib/i18n';
import { errorMessage } from '@/lib/session';
import { cn } from '@/lib/utils';

type T = (k: MsgKey, v?: Record<string, string | number>) => string;

export const JOB_STATUSES: JobStatus[] = ['draft', 'open', 'completed', 'cancelled'];
const JOB_CODES = new Set(['invalid_transition', 'stale_revision', 'job_closed', 'not_found']);
const FIELD_CODES = new Set(['required', 'blank', 'max_length', 'invalid_choice', 'invalid', 'unknown_field', 'empty_update']);
const JOB_FIELDS = new Set(['title', 'notes', 'reference', 'machine', 'status', 'revision', 'non_field_errors']);

export function jobErrorMessage(err: unknown, t: T): string {
  if (err instanceof AuthError) {
    if (JOB_CODES.has(err.code)) return t(`err_${err.code}` as MsgKey);
    if (err.status === 404) return t('err_not_found');
  }
  return errorMessage(err, t);
}

/** Localized per-field messages from server error codes. */
export function jobFieldErrors(err: unknown, t: T): Record<string, string> {
  const out: Record<string, string> = {};
  if (!(err instanceof AuthError) || !err.fields) return out;
  for (const [name, codes] of Object.entries(err.fields)) {
    if (!codes?.length) continue;
    const label = JOB_FIELDS.has(name) ? t(`field_${name}` as MsgKey) : name;
    const code = codes.find((c) => FIELD_CODES.has(c));
    out[name] = code ? t(`fe_${code}` as MsgKey, { field: label }) : t('fieldInvalid', { field: label });
  }
  return out;
}

export function isStale(err: unknown) {
  return err instanceof AuthError && (err.code === 'stale_revision' || (err.status === 409 && err.code !== 'job_closed'));
}

const tone: Record<JobStatus, string> = {
  draft: 'bg-muted text-muted-foreground ring-border',
  open: 'bg-primary/10 text-primary ring-primary/25',
  completed: 'bg-[hsl(152_45%_38%/0.12)] text-[hsl(152_50%_26%)] ring-[hsl(152_45%_38%/0.3)]',
  cancelled: 'bg-destructive/10 text-destructive ring-destructive/20 line-through decoration-1',
};

export function StatusBadge({ status, className }: { status: JobStatus; className?: string }) {
  const { t } = useI18n();
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', tone[status], className)} data-testid={`status-${status}`}>
      <span className={cn('h-1.5 w-1.5 rounded-full', status === 'open' ? 'bg-primary' : status === 'draft' ? 'border border-current' : status === 'completed' ? 'bg-[hsl(152_45%_38%)]' : 'bg-destructive')} aria-hidden />
      {t(`status_${status}` as MsgKey)}
    </span>
  );
}

export function JobNumber({ value, className }: { value: string; className?: string }) {
  return <span dir="ltr" className={cn('font-mono text-xs tracking-wide text-muted-foreground', className)}>{value}</span>;
}

export function useFormatDate() {
  const { lang } = useI18n();
  const f = new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  return (s: string) => {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? s : f.format(d);
  };
}

export function FieldError({ msg, id }: { msg?: string; id?: string }) {
  return msg ? <p id={id} className="text-xs text-destructive">{msg}</p> : null;
}
