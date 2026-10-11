import { Pager } from '@/components/pager';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Info, Loader2, Lock, Package, Plus, RotateCw, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FormAlert } from '@/components/brand';
import { FieldError, useFormatDate } from '@/components/job-ui';
import { useToast } from '@/hooks/use-toast';
import { AuthError } from '@/lib/auth';
import { JOBS_KEY, type ProductionJob } from '@/lib/jobs';
import {
  MATERIAL_STATE_KEY, recordMaterialEntry, useJobMaterials, voidMaterialEntry,
  type Material, type MaterialEntry, type MaterialEntryInput, type MaterialState,
} from '@/lib/materials';
import { useI18n, type MsgKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { scrapReasonText, useKt } from '@/lib/core';
import { MaterialPicker } from './material-picker';
import { RegisterOffcutDialog } from './register-offcut-dialog';
import { isConflict, isUncertain, isZero, matErrorMessage, matFieldErrors, newRequestId, quantityError, signed } from './mat-utils';

type Kind = MaterialEntryInput['kind'];
const KINDS: Kind[] = ['issue', 'good', 'scrap', 'offcut'];
type Refetch = () => Promise<{ data?: MaterialState; isError?: boolean }>;

function Qty({ v, className }: { v: string; className?: string }) {
  return <span dir="ltr" className={cn('font-mono tabular-nums', className)}>{v}</span>;
}

function useApplyState(jobId: number) {
  const qc = useQueryClient();
  return (s: MaterialState) => {
    qc.setQueryData([...MATERIAL_STATE_KEY, jobId, s.entries.page], s);
    qc.invalidateQueries({ queryKey: [...MATERIAL_STATE_KEY, jobId] });
    qc.invalidateQueries({ queryKey: [...JOBS_KEY, 'detail', jobId] });
  };
}

export function MaterialsSection({ job, canManageInventory = true }: { job: ProductionJob; canManageInventory?: boolean }) {
  const kt = useKt();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const q = useJobMaterials(job.id, page);
  const [formOpen, setFormOpen] = useState(false);
  const [voiding, setVoiding] = useState<MaterialEntry | null>(null);
  const [registering, setRegistering] = useState<MaterialEntry | null>(null);

  // Job status/revision changed elsewhere: re-read material state (form inputs are preserved separately).
  const firstJobRev = useRef(true);
  useEffect(() => {
    if (firstJobRev.current) { firstJobRev.current = false; return; }
    qc.invalidateQueries({ queryKey: [...MATERIAL_STATE_KEY, job.id] });
  }, [job.revision, job.status, job.id, qc]);

  const refetch: Refetch = () => q.refetch();
  const s = q.data;

  return (
    <section className="mt-6 rounded-lg border bg-card" aria-labelledby="mat-title" data-testid="section-materials">
      <header className="flex flex-col gap-1 border-b p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" aria-hidden />
          <h2 id="mat-title" className="text-sm font-semibold">{t('matTitle')}</h2>
          {q.isFetching && !q.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label={t('checking')} />}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{t('matScope')}</p>
      </header>

      {q.isPending ? (
        <div className="space-y-3 p-5 sm:p-6" aria-busy><Skeleton className="h-12 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-20 w-full" /></div>
      ) : q.isError && !s ? (
        <div className="p-6 text-center" role="alert">
          <p className="text-sm font-medium">{t('matLoadError')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{matErrorMessage(q.error, t)}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => q.refetch()} data-testid="button-retry-materials-state"><RotateCw className="h-3.5 w-3.5" aria-hidden />{t('retry')}</Button>
        </div>
      ) : s ? (
        <div className="flex flex-col gap-6 p-5 sm:p-6">
          <MaterialHeader s={s} onStart={s.permissions.record && !formOpen && !s.material ? () => setFormOpen(true) : undefined} />
          <Summary s={s} />
          {s.permissions.record || formOpen ? (
            formOpen ? (
              <EntryForm key="f" state={s} job={job} refetch={refetch} onClose={() => setFormOpen(false)} onSaved={() => { setPage(1); setFormOpen(false); }} />
            ) : (
              <Button className="self-start" onClick={() => setFormOpen(true)} data-testid="button-record-entry"><Plus className="h-4 w-4" aria-hidden />{t('matRecord')}</Button>
            )
          ) : (
            <p className="flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground" data-testid="text-materials-readonly">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {job.status === 'completed' ? kt('matReadOnlyCompleted') : job.status === 'cancelled' ? t('matReadOnlyCancelled') : job.status === 'draft' ? t('matReadOnlyDraft') : t('matReadOnlyOpen')}
            </p>
          )}
          <Entries s={s} canVoid={s.permissions.record && !formOpen} onVoid={setVoiding} canRegister={canManageInventory && s.permissions.record && job.status === 'open' && !formOpen} onRegister={setRegistering} page={page} setPage={setPage} busy={q.isFetching || formOpen || !!voiding || !!registering} />
        </div>
      ) : null}

      {voiding && s && (
        <VoidDialog entry={voiding} state={s} jobId={job.id} refetch={refetch} onClose={() => setVoiding(null)} />
      )}
      {registering && (
        <RegisterOffcutDialog entry={registering} jobId={job.id} onClose={() => setRegistering(null)} />
      )}
    </section>
  );
}

function MaterialHeader({ s, onStart }: { s: MaterialState; onStart?: () => void }) {
  const { t } = useI18n();
  if (!s.material) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-dashed p-4" data-testid="panel-no-material">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden><Package className="h-4 w-4" /></span>
        <div className="flex-1"><p className="text-sm font-medium">{t('matNoMaterial')}</p><p className="mt-0.5 text-xs text-muted-foreground">{t('matNoMaterialDesc')}</p>
          {onStart && <Button size="sm" className="mt-3" onClick={onStart} data-testid="button-record-first-issue"><Plus className="h-3.5 w-3.5" aria-hidden />{t('kind_issue')}</Button>}</div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-md bg-accent/60 p-4" data-testid="panel-material">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden><Lock className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{t('matPinned')}</p>
        <p className="break-words text-sm font-semibold" data-testid="text-material-name">{s.material.name} <span className="font-mono text-xs font-normal text-muted-foreground" dir="ltr">({s.material.unit})</span></p>
        <p className="break-words text-xs text-muted-foreground">{s.material.specification}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{t('matPinnedHint')}</p>
      </div>
    </div>
  );
}

const KIND_TONE: Record<Kind, { chip: string; bar: string }> = {
  issue: { chip: 'bg-primary/10 text-primary', bar: 'bg-primary' },
  good: { chip: 'bg-[hsl(160_84%_30%/0.12)] text-[hsl(160_84%_22%)]', bar: 'bg-[hsl(160_70%_36%)]' },
  scrap: { chip: 'bg-destructive/10 text-destructive', bar: 'bg-destructive/80' },
  offcut: { chip: 'bg-[hsl(200_70%_45%/0.12)] text-[hsl(200_70%_30%)]', bar: 'bg-[hsl(200_65%_48%)]' },
};

function Summary({ s }: { s: MaterialState }) {
  const { t } = useI18n();
  const fmt = useFormatDate();
  const sum = s.summary;
  if (!sum) return <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground" data-testid="text-no-summary">{t('matNoSummary')}</p>;
  const zero = isZero(sum.variance);
  const rate = (v: string | null, id: string) => v === null
    ? <span className="text-sm text-muted-foreground" data-testid={`text-${id}`}>{t('matNA')}</span>
    : <Qty v={`${v}%`} className="text-base font-semibold" />;
  // Display-only proportions of issued; never written back. Variance stays its own segment.
  const issued = Number(sum.issued);
  const share = (v: string) => (issued > 0 ? Math.max(0, Math.min(100, (Number(v) / issued) * 100)) : 0);
  const outputs: [Kind, MsgKey, string][] = [['good', 'matGood', sum.good], ['scrap', 'matScrap', sum.scrap], ['offcut', 'matOffcut', sum.offcut]];
  const kg = <span className="text-xs text-muted-foreground">{t('matUnitKg')}</span>;
  return (
    <div className="flex flex-col gap-3" data-testid="panel-summary">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('matSummary')}</h3>
      <div className="grid gap-3 lg:grid-cols-[14rem_1fr]">
        <div className="rounded-md border bg-primary/5 p-4">
          <p className="text-xs text-muted-foreground">{t('matIssued')}</p>
          <p className="mt-1 flex items-baseline gap-1" data-testid="text-sum-issued"><Qty v={sum.issued} className="text-2xl font-semibold" />{kg}</p>
          <p className="mt-3 text-xs text-muted-foreground">{t('matAccounted')}</p>
          <p className="flex items-baseline gap-1" data-testid="text-sum-accounted"><Qty v={sum.accounted} className="text-base font-semibold" />{kg}</p>
        </div>
        <div className="flex flex-col gap-3 rounded-md border p-4">
          {issued > 0 && (
            <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
              {outputs.map(([k, , v]) => <span key={k} className={KIND_TONE[k].bar} style={{ width: `${share(v)}%` }} />)}
            </div>
          )}
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {outputs.map(([k, label, v]) => (
              <div key={k}>
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className={cn('h-2 w-2 rounded-full', KIND_TONE[k].bar)} aria-hidden />{t(label)}</dt>
                <dd className="mt-0.5 flex items-baseline gap-1" data-testid={`text-sum-${k}`}><Qty v={v} className="text-lg font-semibold" />{kg}</dd>
              </div>
            ))}
            <div className={cn('rounded-md px-2 py-1', !zero && 'bg-[hsl(38_92%_50%/0.1)]')}>
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full border border-dashed border-[hsl(32_81%_35%)]" aria-hidden />{t('matVariance')}</dt>
              <dd className="mt-0.5 flex items-baseline gap-1" data-testid="text-sum-variance"><Qty v={signed(sum.variance)} className={cn('text-lg font-semibold', !zero && 'text-[hsl(32_81%_29%)]')} />{kg}</dd>
            </div>
          </dl>
          <dl className="flex flex-wrap gap-x-6 gap-y-1 border-t pt-2 text-xs">
            <div className="flex items-baseline gap-2"><dt className="text-muted-foreground">{t('matYield')}</dt><dd data-testid="text-sum-yield">{rate(sum.yield_rate, 'yield-na')}</dd></div>
            <div className="flex items-baseline gap-2"><dt className="text-muted-foreground">{t('matScrapRate')}</dt><dd data-testid="text-sum-scrap-rate">{rate(sum.scrap_rate, 'scrap-rate-na')}</dd></div>
          </dl>
        </div>
      </div>
      {zero ? (
        <p className="flex items-start gap-2 text-xs text-muted-foreground" data-testid="text-balanced"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{t('matBalanced')}</p>
      ) : (
        <p className="flex items-start gap-2 rounded-md border border-[hsl(38_92%_50%/0.35)] bg-[hsl(38_92%_50%/0.06)] px-3 py-2 text-xs text-foreground" data-testid="text-variance-note"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(32_81%_35%)]" aria-hidden />{t('matVarianceNote')}</p>
      )}
      <details className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground" data-testid="toggle-formulas">{t('matFormulas')}</summary>
        <ul className="mt-2 space-y-1"><li>{t('fAccounted')}</li><li>{t('fVariance')}</li><li>{t('fYield')}</li><li>{t('fScrap')}</li><li>{t('fNull')}</li></ul>
      </details>
      <p className="text-[11px] text-muted-foreground" data-testid="text-snapshot">{t('matSnapshot', { time: fmt(sum.created_at), rev: s.revision })}</p>
    </div>
  );
}

function EntryForm({ state, job, refetch, onClose, onSaved }: { state: MaterialState; job: ProductionJob; refetch: Refetch; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const apply = useApplyState(job.id);
  const base = useRef({ revision: state.revision, job_revision: state.job_revision, material: state.material });
  const [material, setMaterial] = useState<Material | null>(state.material);
  const [kind, setKind] = useState<Kind>(state.material ? 'good' : 'issue');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [scrapReason, setScrapReason] = useState('');
  const kt = useKt();
  const [touched, setTouched] = useState(false);
  const [reloading, setReloading] = useState(false);
  const reqId = useRef(newRequestId());
  const [, force] = useState(0);

  const pinned = base.current.material;
  const firstEntry = !pinned;
  const drift = state.revision !== base.current.revision || state.job_revision !== base.current.job_revision;
  const jobChanged = state.job_revision !== base.current.job_revision || job.status !== 'open';

  const mutation = useMutation({
    mutationFn: (data: MaterialEntryInput) => recordMaterialEntry(job.id, data),
    onSuccess: (s) => { apply(s); toast({ title: t('matRecorded') }); onSaved(); },
    onError: async (err) => {
      if (err instanceof AuthError && err.code === 'duplicate_record') {
        const r = await refetch();
        if (r.isError || !r.data) return;
        apply(r.data);
        toast({ title: t('matAlreadyRecorded') });
        onSaved();
        return;
      }
      // Definitive server rejection: next attempt is a new request. Network uncertainty keeps the same id.
      if (err instanceof AuthError) reqId.current = newRequestId();
    },
  });

  const qErr = touched ? quantityError(quantity, t) : undefined;
  const fe = matFieldErrors(mutation.error, t);
  const conflict = isConflict(mutation.error);
  const uncertain = isUncertain(mutation.error);
  const materialMissing = firstEntry && !material;
  const busy = mutation.isPending || reloading;

  const rebase = (s: MaterialState) => {
    base.current = { revision: s.revision, job_revision: s.job_revision, material: s.material };
    if (s.material) { setMaterial(s.material); if (kind === 'issue' && !pinned) setKind('issue'); }
    mutation.reset();
    force((n) => n + 1);
  };

  const loadLatest = async () => {
    setReloading(true);
    try {
      const r = await refetch();
      if (r.data && !r.isError) rebase(r.data); else toast({ title: t('matLoadError'), variant: 'destructive' });
    } finally { setReloading(false); }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (busy || uncertain || !state.permissions.record || job.status !== 'open' || drift || conflict || quantityError(quantity, t) || materialMissing || note.length > 1000 || scrapReason.length > 160) return;
    const effKind = firstEntry ? 'issue' : kind;
    const mat = pinned ?? material!;
    mutation.mutate({
      revision: base.current.revision, job_revision: base.current.job_revision, material_id: mat.id,
      kind: firstEntry ? 'issue' : kind, quantity: quantity.trim(), unit: 'kg',
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(effKind === 'scrap' && scrapReason.trim() ? { scrap_reason: scrapReason.trim() } : {}), request_id: reqId.current,
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-md border p-4 sm:p-5" data-testid="form-material-entry">
      <h3 className="text-sm font-semibold">{t('matRecordTitle')}</h3>

      {drift && !conflict && (
        <div className="rounded-md border border-[hsl(38_92%_50%/0.4)] bg-[hsl(38_92%_50%/0.08)] p-3" role="alert" data-testid="alert-material-drift">
          <p className="text-sm font-semibold">{t('matDrift')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{jobChanged ? t('matJobChanged') : t('matDriftDesc')}</p>
          <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => rebase(state)} disabled={busy} data-testid="button-material-use-latest"><RotateCw className="h-3.5 w-3.5" aria-hidden />{t('matUseLatest')}</Button>
        </div>
      )}
      {conflict && (
        <div className="rounded-md border border-[hsl(38_92%_50%/0.4)] bg-[hsl(38_92%_50%/0.08)] p-3" role="alert" data-testid="alert-material-stale">
          <p className="text-sm font-semibold">{t('matStale')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{matErrorMessage(mutation.error, t)} {t('matStaleDesc')}</p>
          <Button type="button" size="sm" variant="outline" className="mt-2" onClick={loadLatest} disabled={reloading} data-testid="button-material-load-latest">
            {reloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RotateCw className="h-3.5 w-3.5" aria-hidden />}{t('loadLatest')}
          </Button>
        </div>
      )}
      {uncertain && (
        <div className="rounded-md border border-[hsl(38_92%_50%/0.4)] bg-[hsl(38_92%_50%/0.08)] p-3" role="alert" data-testid="alert-material-uncertain">
          <p className="flex items-center gap-1.5 text-sm font-semibold"><AlertTriangle className="h-4 w-4" aria-hidden />{t('matUncertain')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('matUncertainDesc')}</p>
          <Button type="button" size="sm" variant="outline" className="mt-2" onClick={async () => { setReloading(true); try { const r = await refetch(); if (!r.isError && r.data) mutation.reset(); } finally { setReloading(false); } }} disabled={reloading} data-testid="button-material-check">
            {reloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RotateCw className="h-3.5 w-3.5" aria-hidden />}{t('matCheckRetry')}
          </Button>
        </div>
      )}
      {mutation.error && !conflict && !uncertain && !Object.keys(fe).length && <FormAlert message={matErrorMessage(mutation.error, t)} testId="error-material-entry" />}

      {firstEntry && (
        <div className="flex flex-col gap-1.5">
          <Label>{t('matChooseMaterial')}</Label>
          <MaterialPicker value={material} onChange={setMaterial} canCreate={state.permissions.manage_materials} disabled={busy} />
          <FieldError msg={(touched && materialMissing ? t('matChooseRequired') : undefined) ?? fe.material_id} />
        </div>
      )}

      <fieldset className="flex flex-col gap-1.5" disabled={busy}>
        <legend className="mb-1.5 text-sm font-medium">{t('matKind')}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup">
          {KINDS.map((k) => {
            const locked = firstEntry && k !== 'issue';
            const sel = (firstEntry ? 'issue' : kind) === k;
            return (
              <button key={k} type="button" role="radio" aria-checked={sel} disabled={locked || busy} onClick={() => setKind(k)}
                className={cn('rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45', sel ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted/60')}
                data-testid={`radio-kind-${k}`}>
                {t(`kind_${k}` as MsgKey)}
              </button>
            );
          })}
        </div>
        {firstEntry && <p className="text-xs text-muted-foreground">{t('matFirstIssue')}</p>}
        <FieldError msg={fe.kind} />
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="m-qty">{t('matQuantity')}</Label>
        <div className="relative max-w-xs">
          <Input id="m-qty" inputMode="decimal" dir="ltr" autoComplete="off" value={quantity} disabled={busy}
            onChange={(e) => setQuantity(e.target.value)} onBlur={() => setTouched(true)} aria-invalid={!!(qErr || fe.quantity)}
            className="pe-10 font-mono" placeholder="0.000" data-testid="input-material-quantity" />
          <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t('matUnitKg')}</span>
        </div>
        <p className="text-xs text-muted-foreground">{t('matQuantityHint')}</p>
        <FieldError msg={qErr ?? fe.quantity ?? fe.unit} />
      </div>

      {!firstEntry && kind === 'scrap' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="m-scrap-reason">{kt('scrapReason')} <span className="font-normal text-muted-foreground">({t('optional')})</span></Label>
          <Input id="m-scrap-reason" maxLength={200} value={scrapReason} disabled={busy} onChange={(e) => setScrapReason(e.target.value)} aria-invalid={!!fe.scrap_reason || scrapReason.length > 160} placeholder={kt('unspecified')} data-testid="input-scrap-reason" />
          <p className="text-xs text-muted-foreground">{kt('scrapReasonHint')}</p>
          <FieldError msg={scrapReason.length > 160 ? kt('scrapReasonTooLong') : fe.scrap_reason} />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="m-note">{t('matNote')} <span className="font-normal text-muted-foreground">({t('optional')})</span></Label>
        <Textarea id="m-note" rows={2} value={note} disabled={busy} onChange={(e) => setNote(e.target.value)} aria-invalid={!!fe.note || note.length > 1000} data-testid="input-material-note" />
        <FieldError msg={note.length > 1000 ? t('noteTooLong') : fe.note ?? fe.non_field_errors ?? fe.revision ?? fe.job_revision} />
      </div>

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending} data-testid="button-cancel-entry">{t('cancel')}</Button>
        <Button type="submit" disabled={busy || uncertain || !state.permissions.record || job.status !== 'open' || drift || conflict || materialMissing && touched} data-testid="button-submit-entry">
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {mutation.isPending ? t('matRecording') : uncertain ? t('retry') : t('matSubmit')}
        </Button>
      </div>
    </form>
  );
}

function Entries({ s, canVoid, onVoid, canRegister, onRegister, page, setPage, busy }: { s: MaterialState; canVoid: boolean; onVoid: (e: MaterialEntry) => void; canRegister: boolean; onRegister: (e: MaterialEntry) => void; page: number; setPage: (p: number) => void; busy: boolean }) {
  const kt = useKt();
  const { t } = useI18n();
  const fmt = useFormatDate();
  const e = s.entries;
  return (
    <div className="flex flex-col gap-3" data-testid="panel-entries">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('matEntries')}</h3>
        <span className="text-xs text-muted-foreground" dir="ltr">{e.count} · {t('matUnitKg')}</span>
      </div>
      {e.results.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground" data-testid="text-no-entries">{t('matNoEntries')}</p>
      ) : (
        <div className="flex flex-col gap-4">
        {([['issue', e.results.filter((x) => x.kind === 'issue')], ['output', e.results.filter((x) => x.kind !== 'issue')]] as const).filter(([, list]) => list.length > 0).map(([grp, list]) => (
        <div key={grp} className="flex flex-col gap-1.5" data-testid={`group-entries-${grp}`}>
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{grp === 'issue' ? t('kind_issue') : `${t('kind_good')} · ${t('kind_scrap')} · ${t('kind_offcut')}`}</h4>
        <ul className="divide-y rounded-md border">
          {list.map((en) => {
            const v = en.void;
            return (
              <li key={en.id} className={cn('flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:gap-4', v && 'bg-muted/30')} data-testid={`row-entry-${en.id}`}>
                <div className="flex items-center gap-3 sm:w-48 sm:shrink-0">
                  <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium', KIND_TONE[en.kind].chip, v && 'opacity-60')}>{t(`kind_${en.kind}` as MsgKey)}</span>
                  <span className={cn('text-sm font-semibold', v && 'text-muted-foreground line-through')} data-testid={`text-entry-qty-${en.id}`}><Qty v={en.quantity} /> <span className="text-xs font-normal">{t('matUnitKg')}</span></span>
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  <p className="text-muted-foreground">{t('matBy', { user: en.created_by.username, time: fmt(en.created_at) })}</p>
                  {en.kind === 'scrap' && (
                    <p className={cn('mt-1 text-xs', !en.scrap_reason?.trim() && 'italic text-muted-foreground')} data-testid={`text-entry-scrap-reason-${en.id}`}>
                      <span className="font-medium not-italic text-foreground">{kt('scrapReason')}:</span> {scrapReasonText(en.scrap_reason, kt('unspecified'))}
                    </p>
                  )}
                  {en.note && <p className={cn('mt-1 whitespace-pre-wrap break-words text-sm', v && 'text-muted-foreground line-through')}>{en.note}</p>}
                  {v && (
                    <div className="mt-2 rounded border-s-2 border-destructive/50 bg-destructive/5 px-2 py-1.5" data-testid={`text-entry-void-${en.id}`}>
                      <p className="font-medium text-destructive">{t('matVoided')}</p>
                      <p className="whitespace-pre-wrap break-words text-foreground">{v.reason}</p>
                      <p className="mt-0.5 text-muted-foreground">{t('matVoidedBy', { user: v.created_by.username, time: fmt(v.created_at) })}</p>
                    </div>
                  )}
                </div>
                {(canVoid || canRegister) && !v && (
                <div className="flex flex-wrap gap-1 self-start">
                {canRegister && en.kind === 'offcut' && (
                  <Button variant="outline" size="sm" onClick={() => onRegister(en)} disabled={busy} data-testid={`button-register-${en.id}`}>{t('invRegister')}</Button>
                )}
                {canVoid && (
                  <Button variant="ghost" size="sm" className="self-start text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => onVoid(en)} data-testid={`button-void-${en.id}`}>{t('matVoid')}</Button>
                )}
                </div>
                )}
              </li>
            );
          })}
        </ul>
        </div>
        ))}
        </div>
      )}
      <Pager page={page} totalPages={e.total_pages} onPage={setPage} busy={busy} testId="entries" />
    </div>
  );
}

function VoidDialog({ entry, state, jobId, refetch, onClose }: { entry: MaterialEntry; state: MaterialState; jobId: number; refetch: Refetch; onClose: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const apply = useApplyState(jobId);
  const base = useRef({ revision: state.revision, job_revision: state.job_revision });
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [, force] = useState(0);
  const m = useMutation({
    mutationFn: () => voidMaterialEntry(jobId, entry.id, { ...base.current, reason: reason.trim() }),
    onSuccess: (s) => { apply(s); toast({ title: t('matVoidDone') }); onClose(); },
    onError: async (err) => {
      if (err instanceof AuthError && err.code === 'already_voided') await refetch();
    },
  });
  const drift = state.revision !== base.current.revision || state.job_revision !== base.current.job_revision;
  const conflict = isConflict(m.error);
  const fe = matFieldErrors(m.error, t);
  const reasonErr = touched && !reason.trim() ? t('matReasonRequired') : reason.length > 1000 ? t('noteTooLong') : fe.reason;
  const loadLatest = async () => {
    setReloading(true);
    try {
      const r = await refetch();
      if (r.data && !r.isError) { base.current = { revision: r.data.revision, job_revision: r.data.job_revision }; m.reset(); force((n) => n + 1); }
    } finally { setReloading(false); }
  };
  const busy = m.isPending || reloading;

  return (
    <AlertDialog open onOpenChange={(o) => { if (!o && !m.isPending) onClose(); }}>
      <AlertDialogContent data-testid="dialog-void-entry">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('matVoidTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('matVoidDesc')}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2 text-sm">
          <span className="font-medium">{t(`kind_${entry.kind}` as MsgKey)}</span>
          <Qty v={entry.quantity} className="font-semibold" /><span className="text-xs text-muted-foreground">{t('matUnitKg')}</span>
        </div>
        {(drift || conflict) && (
          <div className="rounded-md border border-[hsl(38_92%_50%/0.4)] bg-[hsl(38_92%_50%/0.08)] p-3" role="alert" data-testid="alert-void-stale">
            <p className="text-sm font-semibold">{conflict ? t('matStale') : t('matDrift')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{conflict ? `${matErrorMessage(m.error, t)} ` : ''}{t('matStaleDesc')}</p>
            {!(m.error instanceof AuthError && m.error.code === 'already_voided') && (
              <Button type="button" size="sm" variant="outline" className="mt-2" onClick={loadLatest} disabled={reloading} data-testid="button-void-load-latest">
                {reloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RotateCw className="h-3.5 w-3.5" aria-hidden />}{t('loadLatest')}
              </Button>
            )}
          </div>
        )}
        {m.error && !conflict && !fe.reason && <FormAlert message={matErrorMessage(m.error, t)} testId="error-void" />}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="v-reason">{t('matReason')}</Label>
          <Textarea id="v-reason" rows={3} value={reason} disabled={busy} onChange={(e) => setReason(e.target.value)} onBlur={() => setTouched(true)} aria-invalid={!!reasonErr} data-testid="input-void-reason" />
          <FieldError msg={reasonErr} />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={m.isPending}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={busy || drift || conflict || !reason.trim() || reason.length > 1000}
            onClick={(ev) => { ev.preventDefault(); setTouched(true); if (!reason.trim() || busy || drift || conflict) return; m.mutate(); }}
            data-testid="button-confirm-void">
            {m.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{m.isPending ? t('matVoiding') : t('matConfirmVoid')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
