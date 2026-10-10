import { useRef, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowLeft, Ban, Loader2, Lock, RotateCw } from 'lucide-react';
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
import { INVENTORY_KEY, useInventoryLot, voidInventoryLot, type InventoryLot } from '@/lib/inventory';
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
            {l.permissions.void && l.state === 'available' && (
              <Button variant="outline" className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setVoiding(true)} data-testid="button-void-lot">
                <Ban className="h-4 w-4" aria-hidden />{t('invVoid')}
              </Button>
            )}
          </header>

          <ReuseBlockedNotice />

          <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
            <div className="bg-card p-4"><p className="text-xs text-muted-foreground">{t('invRemaining')}</p><Kg v={l.remaining} className={cn('mt-1 block text-2xl font-semibold', l.state === 'voided' && 'line-through text-muted-foreground')} /></div>
            <div className="bg-card p-4"><p className="text-xs text-muted-foreground">{t('invOriginal')}</p><Kg v={l.quantity} className="mt-1 block text-2xl font-semibold" /></div>
          </div>

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
            <Row label={t('invPolicy').split(':')[0]} testId="text-lot-policy">{t('invPolicy').split(':').slice(1).join(':').trim()}</Row>
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
