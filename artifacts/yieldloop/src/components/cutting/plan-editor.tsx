import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Columns2, Copy, Loader2, Plus, RotateCw, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { AuthError } from '@/lib/auth';
import { CUTTING_KEY, saveCutting, useCuttingPlan, type CuttingPlan } from '@/lib/cutting';
import { useI18n } from '@/lib/i18n';
import { ScenarioWorkspace } from './scenario-workspace';
import { CompareView } from './compare-view';
import { HistoryPanel } from './history-panel';
import { ConfirmDialog, type ConfirmSpec } from './confirm-dialog';
import {
  blankDraft, cuttingErrorMessage, currentResult, draftFromScenario, MAX_SCENARIOS, newScenarioKey, scenarioFromDraft, snapshot, validateForm, type Draft,
} from './model';
import { useCt } from './cutting-i18n';
import { cn } from '@/lib/utils';

export function PlanEditor({ jobId, planId, writable, canCreateMaterial, onSaved, onDirty }: {
  jobId: number; planId: number | null; writable: boolean; canCreateMaterial: boolean;
  onSaved: (p: CuttingPlan) => void; onDirty: (d: boolean) => void;
}) {
  const ct = useCt();
  const { t } = useI18n();
  const q = useCuttingPlan(jobId, planId);
  if (planId !== null && q.isPending) return <div className="space-y-3" aria-busy><Skeleton className="h-10 w-72 max-w-full" /><Skeleton className="h-96 w-full" /></div>;
  if (planId !== null && q.isError && !q.data) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center" role="alert">
        <p className="text-sm font-semibold">{ct('planLoadError')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{cuttingErrorMessage(q.error, ct, t)}</p>
        <Button className="mt-4" variant="outline" size="sm" onClick={() => q.refetch()}><RotateCw className="h-3.5 w-3.5" aria-hidden />{t('retry')}</Button>
      </div>
    );
  }
  return <Editor jobId={jobId} plan={q.data ?? null} refetch={() => q.refetch()} writable={writable} canCreateMaterial={canCreateMaterial} onSaved={onSaved} onDirty={onDirty} />;
}

function Editor({ jobId, plan, refetch, writable, canCreateMaterial, onSaved, onDirty }: {
  jobId: number; plan: CuttingPlan | null; refetch: () => Promise<{ data?: CuttingPlan }>; writable: boolean; canCreateMaterial: boolean;
  onSaved: (p: CuttingPlan) => void; onDirty: (d: boolean) => void;
}) {
  const ct = useCt();
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const init = () => (plan ? plan.scenarios.map(draftFromScenario) : [blankDraft(`${ct('scenario')} 1`)]);
  const [name, setName] = useState(plan?.name ?? '');
  const [drafts, setDrafts] = useState<Draft[]>(init);
  const [view, setView] = useState<number | 'compare'>(0);
  const base = useRef({ revision: plan?.revision ?? 0, snap: snapshot(plan?.name ?? '', drafts) });
  const [, force] = useState(0);
  const [saveOpen, setSaveOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const requestId = useRef<string | null>(null);

  const readOnly = !writable || (plan !== null && !plan.can_edit);
  const dirty = !readOnly && snapshot(name, drafts) !== base.current.snap;
  const dirtyRef = useRef(dirty); dirtyRef.current = dirty;
  const onDirtyRef = useRef(onDirty); onDirtyRef.current = onDirty;
  useEffect(() => { onDirtyRef.current(dirty); }, [dirty]);
  useEffect(() => () => onDirtyRef.current(false), []);
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const adopt = (p: CuttingPlan) => {
    const ds = p.scenarios.map(draftFromScenario);
    base.current = { revision: p.revision, snap: snapshot(p.name, ds) };
    setName(p.name); setDrafts(ds); setView(0); force((n) => n + 1);
  };
  // Background refetch never clobbers a dirty form.
  useEffect(() => {
    if (plan && plan.revision !== base.current.revision && !dirtyRef.current) adopt(plan);
  }, [plan?.revision]);

  const save = useMutation({
    mutationFn: () => {
      if (!requestId.current) requestId.current = crypto.randomUUID();
      const scenarios = drafts.map(scenarioFromDraft).filter((s): s is NonNullable<typeof s> => s !== null);
      return saveCutting(jobId, plan?.id ?? null, { name: name.trim(), revision: base.current.revision, request_id: requestId.current, reason: reason.trim(), scenarios });
    },
    onSuccess: (p) => {
      requestId.current = null;
      qc.setQueryData([...CUTTING_KEY, jobId, p.id], p);
      qc.invalidateQueries({ queryKey: CUTTING_KEY });
      adopt(p);
      setSaveOpen(false); setReason(''); setTried(false); save.reset();
      toast({ title: ct('saved', { n: p.revision }) });
      onSaved(p);
    },
    onError: (e) => {
      // Keep the request ID only when the outcome is uncertain, so a retry is idempotent.
      if (e instanceof AuthError) requestId.current = null;
    },
  });
  const err = save.error;
  const isNetwork = err instanceof TypeError;
  const isDup = err instanceof AuthError && err.code === 'duplicate_request';
  const isStale = err instanceof AuthError && !isDup && (err.code === 'stale_revision' || err.status === 409);

  const allValid = useMemo(() => drafts.every((d) => validateForm(d.form).input !== null && d.name.trim()), [drafts]);
  const update = (i: number) => {
    const key = drafts[i].key;
    return (fn: (d: Draft) => Draft) => setDrafts((ds) => ds.map((d) => (d.key === key ? fn(d) : d)));
  };

  const reload = async () => {
    const r = await refetch();
    if (r.data) {
      adopt(r.data); save.reset(); requestId.current = null;
      qc.invalidateQueries({ queryKey: [...CUTTING_KEY, jobId, 'list'] });
    }
  };
  const askReload = () => setConfirm({ title: ct('reloadConfirmTitle'), desc: ct('reloadConfirmDesc'), action: ct('discard'), onConfirm: reload });

  const addScenario = (copyFrom?: Draft) => {
    if (drafts.length >= MAX_SCENARIOS) return;
    const n = copyFrom
      ? { ...copyFrom, key: newScenarioKey(), name: `${copyFrom.name} (2)`, form: { ...copyFrom.form, pieces: copyFrom.form.pieces.map((p) => ({ ...p })) }, placements: copyFrom.placements.map((p) => ({ ...p })) }
      : blankDraft(`${ct('scenario')} ${drafts.length + 1}`);
    setDrafts((ds) => [...ds, n]); setView(drafts.length);
  };

  const active = typeof view === 'number' ? drafts[Math.min(view, drafts.length - 1)] : null;
  const activeIdx = typeof view === 'number' ? Math.min(view, drafts.length - 1) : -1;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Label htmlFor="plan-name" className="text-xs">{ct('planName')}</Label>
          {readOnly ? <p id="plan-name" className="text-lg font-semibold" data-testid="text-plan-name">{name}</p> : (
            <Input id="plan-name" value={name} maxLength={160} onChange={(e) => setName(e.target.value)} aria-invalid={tried && !name.trim()} aria-describedby={tried && !name.trim() ? 'plan-name-error' : undefined} data-testid="input-plan-name" />
          )}
          {tried && !name.trim() && <p id="plan-name-error" className="text-xs font-medium text-destructive" role="alert">{ct('nameRequired')}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {plan && <span className="rounded bg-muted px-2 py-1 font-mono text-xs" data-testid="text-plan-revision">{ct('revShort', { n: base.current.revision })}</span>}
          {dirty && <span className="rounded-full bg-[hsl(38_92%_50%/0.14)] px-2 py-0.5 text-xs font-medium text-[hsl(32_81%_29%)]" data-testid="badge-unsaved">{ct('unsaved')}</span>}
          {!readOnly && (
            <Button onClick={() => {
              setTried(true);
              if (allValid && name.trim()) { setSaveOpen(true); return; }
              const invalid = drafts.findIndex(d => !validateForm(d.form).input || !d.name.trim());
              if (invalid >= 0) setView(invalid);
              requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]:not(:disabled)')?.focus());
            }} disabled={save.isPending || (!dirty && plan !== null)} data-testid="button-save-plan">
              <Save className="h-4 w-4" aria-hidden />{ct('save')}
            </Button>
          )}
        </div>
      </div>
      {tried && !allValid && !readOnly && <p className="text-sm font-medium text-destructive" role="alert">{ct('saveBlocked')}</p>}

      {isStale && (
        <div className="rounded-md border border-[hsl(38_92%_50%/0.4)] bg-[hsl(38_92%_50%/0.08)] p-4" role="alert" data-testid="alert-stale">
          <p className="text-sm font-semibold">{ct('staleTitle')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{ct('staleDesc')}</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={askReload} data-testid="button-reload-latest"><RotateCw className="h-3.5 w-3.5" aria-hidden />{ct('reloadLatest')}</Button>
        </div>
      )}
      {isDup && (
        <div className="rounded-md border bg-muted/50 p-4" role="alert" data-testid="alert-duplicate">
          <p className="text-sm font-semibold">{ct('duplicateTitle')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{ct('duplicateDesc')}</p>
          {plan && <Button size="sm" variant="outline" className="mt-3" onClick={askReload}><RotateCw className="h-3.5 w-3.5" aria-hidden />{ct('reloadLatest')}</Button>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 border-b pb-2" role="tablist" aria-label={ct('scenarios')}>
        {drafts.map((d, i) => (
          <button key={d.key} type="button" role="tab" aria-selected={activeIdx === i} onClick={() => setView(i)}
            className={cn('flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors', activeIdx === i ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
            data-testid={`tab-scenario-${i}`}>
            <span className="max-w-[10rem] truncate">{d.name || `${ct('scenario')} ${i + 1}`}</span>
            {currentResult(d)?.utilization && <span className="font-mono text-[11px] opacity-80">{currentResult(d)!.utilization}%</span>}
          </button>
        ))}
        {drafts.length >= 2 && (
          <button type="button" role="tab" aria-selected={view === 'compare'} onClick={() => setView('compare')}
            className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors', view === 'compare' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
            data-testid="tab-compare"><Columns2 className="h-3.5 w-3.5" aria-hidden />{ct('compare')}</button>
        )}
        {!readOnly && (
          <Button size="sm" variant="ghost" className="ms-auto" disabled={drafts.length >= MAX_SCENARIOS} onClick={() => addScenario()} title={ct('maxScenarios')} data-testid="button-add-scenario">
            <Plus className="h-3.5 w-3.5" aria-hidden />{ct('addScenario')}
          </Button>
        )}
      </div>

      {view === 'compare' ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">{ct('compareTitle')}</h2>
          <CompareView columns={drafts.map((d) => ({ key: d.key, name: d.name, input: validateForm(d.form).input, result: currentResult(d), origin: d.origin, materialName: d.form.material_name }))} />
        </section>
      ) : active && (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Label htmlFor="sc-name" className="text-xs">{ct('scenarioName')}</Label>
              {readOnly ? <p id="sc-name" className="text-sm font-medium">{active.name}</p> : (
                <Input id="sc-name" value={active.name} maxLength={80} onChange={(e) => update(activeIdx)((d) => ({ ...d, name: e.target.value }))} aria-invalid={tried && !active.name.trim()} aria-describedby={tried && !active.name.trim() ? 'scenario-name-error' : undefined} data-testid="input-scenario-name" />
              )}
              {tried && !active.name.trim() && <p id="scenario-name-error" className="text-xs font-medium text-destructive" role="alert">{ct('scenarioNameRequired')}</p>}
            </div>
            {!readOnly && (
              <>
                <Button size="sm" variant="outline" disabled={drafts.length >= MAX_SCENARIOS} onClick={() => addScenario(active)} data-testid="button-duplicate-scenario"><Copy className="h-3.5 w-3.5" aria-hidden />{ct('duplicateScenario')}</Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={drafts.length <= 1} data-testid="button-remove-scenario"
                  onClick={() => setConfirm({ title: ct('removeScenarioTitle'), desc: ct('removeScenarioDesc'), action: ct('removeScenario'), onConfirm: () => { setDrafts((ds) => ds.filter((_, j) => j !== activeIdx)); setView(0); } })}>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />{ct('removeScenario')}
                </Button>
              </>
            )}
          </div>
          <ScenarioWorkspace key={active.key} jobId={jobId} draft={active} update={update(activeIdx)} readOnly={readOnly} canCreateMaterial={canCreateMaterial} showErrors={tried} />
        </>
      )}

      {plan && <HistoryPanel key={`${plan.id}-${base.current.revision}`} jobId={jobId} planId={plan.id} />}

      <Dialog open={saveOpen} onOpenChange={(o) => { if (!save.isPending) setSaveOpen(o); }}>
        <DialogContent onCloseAutoFocus={(event) => {
          event.preventDefault();
          requestAnimationFrame(() => (document.querySelector<HTMLElement>('[data-testid="button-save-plan"]:not(:disabled)') ?? document.getElementById('plan-name'))?.focus());
        }}>
          <DialogHeader>
            <DialogTitle>{ct('saveTitle')}</DialogTitle>
            <DialogDescription>{ct('saveDesc')}</DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-3" noValidate onSubmit={(e) => { e.preventDefault(); if (reason.trim() && !save.isPending) save.mutate(); }}>
            {isNetwork && (
              <div className="rounded-md border border-[hsl(38_92%_50%/0.4)] bg-[hsl(38_92%_50%/0.08)] p-3" role="alert">
                <p className="text-sm font-semibold">{ct('uncertainTitle')}</p>
                <p className="mt-1 text-xs text-muted-foreground">{ct('uncertainDesc')}</p>
              </div>
            )}
            {err && !isNetwork && !isStale && !isDup && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert" data-testid="error-save">{cuttingErrorMessage(err, ct, t)}</p>}
            {(isStale || isDup) && <p className="text-sm text-destructive" role="alert">{ct(isDup ? 'duplicateTitle' : 'staleTitle')}</p>}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="save-reason">{ct('reason')}</Label>
              <Textarea id="save-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} disabled={save.isPending} aria-invalid={!reason.trim()} data-testid="input-save-reason" />
              {!reason.trim() && <p className="text-xs text-muted-foreground">{ct('reasonRequired')}</p>}
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={() => setSaveOpen(false)} disabled={save.isPending}>{t('cancel')}</Button>
              <Button type="submit" disabled={!reason.trim() || save.isPending || isStale || isDup} data-testid="button-confirm-save">
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
                {save.isPending ? ct('saving') : isNetwork ? ct('retrySave') : ct('save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
