import { useRef, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowLeft, ArrowDownToLine, Ban, BookmarkMinus, BookmarkPlus, Loader2, Lock, RotateCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Pager } from '@/components/pager';
import { useFt } from '@/lib/feature-i18n';
import { cmpDec, quantityError } from '@/components/materials/mat-utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FormAlert } from '@/components/brand';
import { FieldError, StatusBadge, useFormatDate } from '@/components/job-ui';
import { Kg, LotStateBadge, ReuseBlockedNotice } from '@/components/inventory-ui';
import { invErrorMessage, isConflict, newRequestId } from '@/components/materials/mat-utils';
import { useToast } from '@/hooks/use-toast';
import { AuthError } from '@/lib/auth';
import { INVENTORY_KEY, moveInventoryLot, useInventoryLot, useInventoryMovements, voidInventoryLot, type InventoryLot, type MovementAction } from '@/lib/inventory';
import { JOBS_KEY } from '@/lib/jobs';
import { REPORTS_KEY } from '@/lib/reports';
import { MATERIAL_STATE_KEY } from '@/lib/materials';
import { useI18n, type MsgKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

function Row({ label, children, testId }: { label: string; children: ReactNode; testId?: string }) {
  return (
    <div className="flex flex-col gap-0.5 bg-card p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium" data-testid={testId}>{children}</dd>
    </div>
  );
}

export default function InventoryDetailPage({ id }: { id: number }) {
  const { t } = useI18n();
  const fmt = useFormatDate();
  const q = useInventoryLot(id);
  const [voiding, setVoiding] = useState(false);
  const [moving, setMoving] = useState<MovementAction | null>(null);
  const ft = useFt();
  const l = q.data;

  return (
    <div className="flex flex-col gap-5">
      <Link href="/inventory" className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-primary hover:underline" data-testid="link-back-inventory">
        <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden />{t('invBack')}
      </Link>
      {q.isPending ? (
        <div className="space-y-3" aria-busy><Skeleton className="h-8 w-64" /><Skeleton className="h-16 w-full" /><Skeleton className="h-48 w-full" /></div>
      ) : q.isError && !l ? (
        <div className="rounded-lg border bg-card p-8 text-center" role="alert">
          <p className="text-sm font-medium">{t('invDetailError')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{invErrorMessage(q.error, t)}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => q.refetch()} data-testid="button-retry-lot"><RotateCw className="h-3.5 w-3.5" aria-hidden />{t('retry')}</Button>
        </div>
      ) : l ? (
        <>
          <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground" dir="ltr">{t('invLot')} #{l.id}</span>
                <LotStateBadge state={l.state} />
                {q.isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label={t('checking')} />}
              </div>
              <h1 className="mt-1 break-words text-xl font-semibold" data-testid="text-page-title">{l.material_name}</h1>
              <p className="break-words text-sm text-muted-foreground" data-testid="text-lot-spec">{l.specification}</p>
            </div>
            <div className="flex flex-wrap gap-2">
            {l.state === 'available' && l.permissions.reserve && (
              <Button variant="outline" onClick={() => setMoving('reserve')} data-testid="button-reserve-lot"><BookmarkPlus className="h-4 w-4" aria-hidden />{ft('mvReserve')}</Button>
            )}
            {l.state === 'available' && l.permissions.release && !!l.reservations?.length && (
              <Button variant="outline" onClick={() => setMoving('release')} data-testid="button-release-lot"><BookmarkMinus className="h-4 w-4" aria-hidden />{ft('mvRelease')}</Button>
            )}
            {l.state === 'available' && l.permissions.consume && (
              <Button onClick={() => setMoving('consume')} data-testid="button-consume-lot"><ArrowDownToLine className="h-4 w-4" aria-hidden />{ft('mvConsume')}</Button>
            )}
            {l.permissions.void && l.state === 'available' && (
              <Button variant="outline" className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setVoiding(true)} data-testid="button-void-lot">
                <Ban className="h-4 w-4" aria-hidden />{t('invVoid')}
              </Button>
            )}
            </div>
          </header>

          <ReuseBlockedNotice />

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4">
            <div className="bg-card p-4"><p className="text-xs text-muted-foreground">{t('invRemaining')}</p><Kg v={l.remaining} className={cn('mt-1 block text-2xl font-semibold', l.state === 'voided' && 'line-through text-muted-foreground')} /></div>
            <div className="bg-card p-4"><p className="text-xs text-muted-foreground">{t('invOriginal')}</p><Kg v={l.quantity} className="mt-1 block text-2xl font-semibold" /></div>
            <div className="bg-card p-4"><p className="text-xs text-muted-foreground">{ft('mvReserved')}</p><Kg v={l.reserved ?? '0'} className="mt-1 block text-2xl font-semibold" /></div>
            <div className="bg-card p-4"><p className="text-xs text-muted-foreground">{ft('mvAvailable')}</p><Kg v={l.available_to_reserve ?? l.remaining} className="mt-1 block text-2xl font-semibold text-primary" /></div>
          </div>
          <section className="rounded-lg border bg-card p-4" data-testid="panel-reservations">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{ft('mvReservations')}</h2>
            {!l.reservations?.length ? <p className="mt-2 text-sm text-muted-foreground">{ft('mvNoReservations')}</p> : (
              <ul className="mt-2 flex flex-wrap gap-2">
                {l.reservations.map((r) => (
                  <li key={r.job_id} className="flex items-center gap-2 rounded-md border bg-accent/40 px-2.5 py-1.5 text-sm" data-testid={`row-reservation-${r.job_id}`}>
                    <Link href={`/jobs/${r.job_id}`} className="font-mono text-primary hover:underline" dir="ltr">{ft('mvJobLink', { id: r.job_id })}</Link>
                    <Kg v={r.quantity} className="font-semibold" />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {l.state === 'voided' ? (
            <p className="flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground" data-testid="text-lot-terminal"><Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{t('invTerminal')}</p>
          ) : !l.permissions.void ? (
            <p className="flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground" data-testid="text-lot-readonly"><Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{t('invReadOnly')}</p>
          ) : null}

          <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-3">
            <Row label={t('invSourceJob')} testId="text-source-job">
              <Link href={`/jobs/${l.source_job_id}`} className="font-mono text-primary hover:underline" dir="ltr" data-testid="link-source-job">{l.source_job_number}</Link>
            </Row>
            <Row label={t('invSourceStatus')} testId="text-source-status"><StatusBadge status={l.source_status} /></Row>
            <Row label={t('invSourceEntry')} testId="text-source-entry"><span className="font-mono" dir="ltr">#{l.source_entry_id}</span></Row>
            <Row label={t('invReconciliation')} testId="text-reconciliation"><span className="font-mono" dir="ltr">#{l.reconciliation_id}</span></Row>
            <Row label={t('invSourceVoided')} testId="text-source-voided">
              <span className={cn(l.source_voided && 'text-destructive')}>{l.source_voided ? t('invSourceVoidedYes') : t('invSourceVoidedNo')}</span>
            </Row>
            <Row label={t('invCreated')} testId="text-lot-created">{fmt(l.created_at)}</Row>
            <Row label={t('invMaterial')} testId="text-lot-material"><span className="font-mono text-xs text-muted-foreground" dir="ltr">#{l.material_id}</span> {l.material_name}</Row>
            <Row label={t('invCompat').split(':')[0]} testId="text-lot-compat">{t('invCompat').split(':').slice(1).join(':').trim()}</Row>
          </dl>
          <p className="text-xs text-muted-foreground">{t('invBlocked')}</p>

          <section className="rounded-lg border bg-card" data-testid="panel-lot-history">
            <h2 className="border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('invHistory')}</h2>
            {!l.history?.length ? (
              <p className="p-6 text-center text-sm text-muted-foreground">{t('invNoHistory')}</p>
            ) : (
              <ol className="divide-y">
                {l.history.map((h) => (
                  <li key={h.id} className="flex gap-3 px-4 py-3" data-testid={`row-history-${h.id}`}>
                    <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', h.action === 'void' ? 'bg-destructive' : 'bg-primary')} aria-hidden />
                    <div className="min-w-0 flex-1 text-xs">
                      <p><span className="font-semibold">{t(`act_${h.action}` as MsgKey)}</span> <span className="text-muted-foreground">· {h.actor} · {fmt(h.created_at)}</span></p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm">{h.reason}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <Movements id={l.id} revision={l.revision} />
          {moving && <MoveDialog action={moving} lot={l} refetch={() => q.refetch()} onClose={() => setMoving(null)} />}
          {voiding && <VoidLotDialog lot={l} refetch={() => q.refetch()} onClose={() => setVoiding(false)} />}
        </>
      ) : null}
    </div>
  );
}

function VoidLotDialog({ lot, refetch, onClose }: { lot: InventoryLot; refetch: () => Promise<{ data?: InventoryLot; isError: boolean }>; onClose: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const revision = useRef(lot.revision);
  const reqId = useRef(newRequestId());
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [touched, setTouched] = useState(false);
  const [reloading, setReloading] = useState(false);
  const m = useMutation({
    mutationFn: () => voidInventoryLot(lot.id, { revision: revision.current, request_id: reqId.current, reason: reason.trim() }),
    onSuccess: (l) => {
      qc.setQueryData([...INVENTORY_KEY, 'detail', l.id], l);
      qc.invalidateQueries({ queryKey: INVENTORY_KEY });
      qc.invalidateQueries({ queryKey: [...MATERIAL_STATE_KEY, l.source_job_id] });
      toast({ title: t('invVoidDone') });
      onClose();
    },
    onError: (err) => { if (err instanceof AuthError) reqId.current = newRequestId(); },
  });
  const conflict = isConflict(m.error);
  const stale = lot.revision !== revision.current;
  const terminal = lot.state !== 'available';
  const reasonErr = touched && !reason.trim() ? t('invReasonRequired') : reason.length > 1000 ? t('noteTooLong') : undefined;
  const busy = m.isPending || reloading;
  const blocked = busy || conflict || stale || terminal || !confirm || !reason.trim() || reason.length > 1000;

  // Explicit refetch: user reviews latest lot, reason preserved, then must re-confirm. No silent rebase.
  const loadLatest = async () => {
    setReloading(true);
    try {
      const r = await refetch();
      if (r.data && !r.isError) { revision.current = r.data.revision; setConfirm(false); m.reset(); }
    } finally { setReloading(false); }
  };

  return (
    <AlertDialog open onOpenChange={(o) => { if (!o && !m.isPending) onClose(); }}>
      <AlertDialogContent data-testid="dialog-void-lot">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('invVoidTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('invVoidDesc')}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-center justify-between gap-2 rounded-md bg-muted/60 px-3 py-2 text-sm">
          <span className="truncate font-medium">#{lot.id} · {lot.material_name}</span>
          <Kg v={lot.remaining} className="font-semibold" />
        </div>
        {(conflict || stale) && !terminal && (
          <div className="rounded-md border border-[hsl(38_92%_50%/0.4)] bg-[hsl(38_92%_50%/0.08)] p-3" role="alert" data-testid="alert-lot-stale">
            {conflict && <p className="text-sm font-semibold">{invErrorMessage(m.error, t)}</p>}
            <p className="mt-1 text-xs text-muted-foreground">{t('invVoidStale')}</p>
            <Button type="button" size="sm" variant="outline" className="mt-2" onClick={loadLatest} disabled={reloading} data-testid="button-lot-load-latest">
              {reloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RotateCw className="h-3.5 w-3.5" aria-hidden />}{t('loadLatest')}
            </Button>
          </div>
        )}
        {terminal && <FormAlert message={t('invTerminal')} testId="error-lot-terminal" />}
        {m.error && !conflict && <FormAlert message={invErrorMessage(m.error, t)} testId="error-void-lot" />}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lot-reason">{t('invReason')}</Label>
          <Textarea id="lot-reason" rows={3} value={reason} disabled={busy} onChange={(e) => setReason(e.target.value)} onBlur={() => setTouched(true)} aria-invalid={!!reasonErr} data-testid="input-lot-void-reason" />
          <FieldError msg={reasonErr} />
        </div>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={confirm} onCheckedChange={(v) => setConfirm(v === true)} disabled={busy} data-testid="checkbox-lot-void-confirm" className="mt-0.5" />
          {t('invVoidConfirm')}
        </label>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={m.isPending} data-testid="button-cancel-void-lot">{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={blocked}
            onClick={(e) => { e.preventDefault(); setTouched(true); if (!blocked) m.mutate(); }} data-testid="button-confirm-void-lot">
            {m.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{m.isPending ? t('invVoiding') : t('invVoid')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Movements({ id, revision }: { id: number; revision: number }) {
  const { t } = useI18n();
  const ft = useFt();
  const fmt = useFormatDate();
  const [page, setPage] = useState(1);
  const q = useInventoryMovements(id, page);
  return (
    <section className="rounded-lg border bg-card" data-testid="panel-lot-movements" data-revision={revision}>
      <header className="flex items-center justify-between border-b px-4 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{ft('mvMovements')}</h2>
        <span className="rounded border border-dashed px-1.5 py-0.5 text-[11px] text-muted-foreground">{ft('mvUnverified')}</span>
      </header>
      {q.isPending ? <div className="space-y-2 p-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
      : q.isError ? (
        <div className="p-6 text-center text-sm" role="alert">
          <p>{ft('mvLoadError')}</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => q.refetch()}><RotateCw className="h-3.5 w-3.5" aria-hidden />{t('retry')}</Button>
        </div>
      ) : !q.data.results.length ? <p className="p-6 text-center text-sm text-muted-foreground">{ft('mvNoMovements')}</p> : (
        <ol className="divide-y">
          {q.data.results.map((m) => (
            <li key={m.id} className="flex gap-3 px-4 py-3" data-testid={`row-movement-${m.id}`}>
              <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', m.action === 'consume' ? 'bg-primary' : m.action === 'reserve' ? 'bg-[hsl(38_92%_50%)]' : 'bg-muted-foreground/60')} aria-hidden />
              <div className="min-w-0 flex-1 text-xs">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold">{t(`act_${m.action}` as MsgKey)}</span>
                  <Kg v={m.quantity} className="font-semibold" />
                  <Link href={`/jobs/${m.job_id}`} className="font-mono text-primary hover:underline" dir="ltr">{ft('mvJobLink', { id: m.job_id })}</Link>
                  {m.issue_entry_id != null && <span className="font-mono text-muted-foreground" dir="ltr">{ft('mvIssue', { id: m.issue_entry_id })}</span>}
                </p>
                <p className="text-muted-foreground">{m.actor} · {fmt(m.created_at)}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{m.reason}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
      {q.data && <Pager page={page} totalPages={q.data.total_pages} onPage={setPage} busy={q.isFetching} testId="movements" className="border-t p-2" />}
    </section>
  );
}

function MoveDialog({ action, lot, refetch, onClose }: { action: MovementAction; lot: InventoryLot; refetch: () => Promise<{ data?: InventoryLot; isError: boolean }>; onClose: () => void }) {
  const { t } = useI18n();
  const ft = useFt();
  const { toast } = useToast();
  const qc = useQueryClient();
  const revision = useRef(lot.revision);
  const reqId = useRef(newRequestId());
  const first = action === 'release' ? lot.reservations?.[0] : undefined;
  const [jobId, setJobId] = useState(first ? String(first.job_id) : '');
  const [quantity, setQuantity] = useState(first?.quantity ?? '');
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [reloading, setReloading] = useState(false);
  const jid = Number(jobId);
  const reserved = lot.reservations?.find((r) => r.job_id === jid)?.quantity ?? '0';
  const cap = action === 'reserve' ? (lot.available_to_reserve ?? lot.remaining) : action === 'release' ? reserved : lot.remaining;
  const m = useMutation({
    mutationFn: () => moveInventoryLot(lot.id, action, { job_id: jid, quantity: quantity.trim(), reason: reason.trim(), request_id: reqId.current, revision: revision.current }),
    onSuccess: (l) => {
      qc.setQueryData([...INVENTORY_KEY, 'detail', l.id], l);
      qc.invalidateQueries({ queryKey: INVENTORY_KEY });
      qc.invalidateQueries({ queryKey: MATERIAL_STATE_KEY });
      qc.invalidateQueries({ queryKey: JOBS_KEY });
      qc.invalidateQueries({ queryKey: REPORTS_KEY });
      toast({ title: ft('mvDone') });
      onClose();
    },
    onError: (err) => { if (err instanceof AuthError) reqId.current = newRequestId(); },
  });
  const jobErr = !/^[1-9]\d*$/.test(jobId.trim()) ? ft('mvJobReq') : jid === lot.source_job_id ? ft('mvSameJob') : undefined;
  const fmtErr = quantityError(quantity, t);
  const capErr = !fmtErr && cmpDec(quantity, cap) > 0 ? ft('mvExceeds', { v: cap }) : undefined;
  const reasonErr = !reason.trim() ? ft('mvReasonReq') : reason.length > 1000 ? t('noteTooLong') : undefined;
  const conflict = isConflict(m.error);
  const busy = m.isPending || reloading;
  const invalid = !!(jobErr || fmtErr || capErr || reasonErr);
  const fe = m.error instanceof AuthError ? m.error.fields ?? {} : {};
  const loadLatest = async () => {
    setReloading(true);
    try { const r = await refetch(); if (r.data && !r.isError) { revision.current = r.data.revision; m.reset(); } } finally { setReloading(false); }
  };
  const title = action === 'reserve' ? ft('mvReserveTitle') : action === 'release' ? ft('mvReleaseTitle') : ft('mvConsumeTitle');
  const desc = action === 'reserve' ? ft('mvReserveDesc') : action === 'release' ? ft('mvReleaseDesc') : ft('mvConsumeDesc');
  return (
    <AlertDialog open onOpenChange={(o) => { if (!o && !m.isPending) onClose(); }}>
      <AlertDialogContent data-testid={`dialog-${action}-lot`}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{desc}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-center justify-between gap-2 rounded-md bg-muted/60 px-3 py-2 text-sm">
          <span className="truncate font-medium">#{lot.id} · {lot.material_name}</span>
          <Kg v={cap} className="font-semibold" />
        </div>
        {conflict && (
          <div className="rounded-md border border-[hsl(38_92%_50%/0.4)] bg-[hsl(38_92%_50%/0.08)] p-3" role="alert" data-testid="alert-move-stale">
            <p className="text-sm font-semibold">{invErrorMessage(m.error, t)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{ft('mvConflict')}</p>
            <Button type="button" size="sm" variant="outline" className="mt-2" onClick={loadLatest} disabled={reloading}>
              {reloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RotateCw className="h-3.5 w-3.5" aria-hidden />}{t('loadLatest')}
            </Button>
          </div>
        )}
        {m.error && !conflict && <FormAlert message={invErrorMessage(m.error, t)} testId="error-move-lot" />}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mv-job">{ft('mvJob')}</Label>
            {action === 'release' && lot.reservations?.length ? (
              <select id="mv-job" value={jobId} disabled={busy} onChange={(e) => { setJobId(e.target.value); setQuantity(lot.reservations?.find((r) => String(r.job_id) === e.target.value)?.quantity ?? ''); }}
                className="h-9 rounded-md border bg-background px-2 font-mono text-sm" dir="ltr" data-testid="select-move-job">
                {lot.reservations.map((r) => <option key={r.job_id} value={r.job_id}>#{r.job_id} · {r.quantity} kg</option>)}
              </select>
            ) : (
              <Input id="mv-job" inputMode="numeric" dir="ltr" value={jobId} disabled={busy} placeholder={ft('mvJobPh')} onChange={(e) => setJobId(e.target.value)} aria-invalid={touched && !!jobErr} className="font-mono" data-testid="input-move-job" />
            )}
            <FieldError msg={touched ? jobErr ?? fe.job_id?.join(' ') : undefined} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mv-qty">{ft('mvQty')}</Label>
            <div className="relative">
              <Input id="mv-qty" inputMode="decimal" dir="ltr" value={quantity} disabled={busy} placeholder="0.000" onChange={(e) => setQuantity(e.target.value)} aria-invalid={touched && !!(fmtErr || capErr)} className="pe-10 font-mono" data-testid="input-move-quantity" />
              <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t('matUnitKg')}</span>
            </div>
            <FieldError msg={touched ? fmtErr ?? capErr : undefined} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mv-reason">{ft('mvReason')}</Label>
          <Textarea id="mv-reason" rows={2} value={reason} disabled={busy} onChange={(e) => setReason(e.target.value)} aria-invalid={touched && !!reasonErr} data-testid="input-move-reason" />
          <FieldError msg={touched ? reasonErr : undefined} />
        </div>
        <p className="text-xs text-muted-foreground">{ft('mvUnverified')}.</p>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={m.isPending}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction disabled={busy || conflict} data-testid={`button-confirm-${action}`}
            onClick={(e) => { e.preventDefault(); setTouched(true); if (!invalid && !busy && !conflict) m.mutate(); }}>
            {m.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{m.isPending ? ft('mvRecording') : title}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
