import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Eraser, Lock, PencilLine, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { evaluateCutting, placementError, type Placement } from '@/lib/cutting';
import { useI18n } from '@/lib/i18n';
import { BoardCanvas } from './board-canvas';
import { InputEditor } from './input-editor';
import { PlacementPanel } from './placement-panel';
import { ResultPanel } from './result-panel';
import { ConfirmDialog, type ConfirmSpec } from './confirm-dialog';
import { cuttingErrorMessage, currentResult, fmtNum, pid, pieceDims, scenarioFromDraft, sig, validateForm, type Draft } from './model';
import { useCt, type CtKey } from './cutting-i18n';
import { useUt } from '@/lib/ui-i18n';
import { boardPreview, type BoardPreview } from '@/lib/display-format';
import { cn } from '@/lib/utils';

/** Static board outline (no parts) drawn from user-entered dimensions only. */
function BoardPreviewSvg({ p }: { p: BoardPreview }) {
  const pad = Math.max(p.width, p.height) * 0.06;
  const fs = Math.max(p.width, p.height) / 40;
  const uw = p.width - p.left - p.right, uh = p.height - p.top - p.bottom;
  return (
    <svg viewBox={`${-pad} ${-pad} ${p.width + pad * 2} ${p.height + pad * 2}`} className="max-h-[60vh] w-full rounded-md bg-muted/30" role="img" aria-label={`${p.width} × ${p.height} mm`} data-testid="svg-board-preview">
      <rect x={0} y={0} width={p.width} height={p.height} fill="hsl(var(--card))" stroke="hsl(var(--foreground) / 0.5)" strokeWidth={fs / 8} />
      {p.marginsValid && p.usableW !== null && uw > 0 && uh > 0 && <rect x={p.left} y={p.top} width={uw} height={uh} fill="hsl(var(--primary) / 0.06)" stroke="hsl(var(--primary))" strokeWidth={fs / 10} strokeDasharray={`${fs / 2} ${fs / 3}`} />}
      <text x={p.width / 2} y={-pad / 3} fontSize={fs} textAnchor="middle" fill="hsl(var(--muted-foreground))" direction="ltr">{p.width} mm</text>
      <text x={-pad / 3} y={p.height / 2} fontSize={fs} textAnchor="middle" fill="hsl(var(--muted-foreground))" transform={`rotate(-90 ${-pad / 3} ${p.height / 2})`} direction="ltr">{p.height} mm</text>
    </svg>
  );
}

export function ScenarioWorkspace({ jobId, draft, update, readOnly, canCreateMaterial, showErrors }: {
  jobId: number; draft: Draft; update: (fn: (d: Draft) => Draft) => void; readOnly: boolean; canCreateMaterial: boolean; showErrors: boolean;
}) {
  const ct = useCt();
  const { t } = useI18n();
  const v = useMemo(() => validateForm(draft.form), [draft.form]);
  const input = v.input;
  const currentSig = sig(input, draft.placements);
  const result = currentResult(draft);
  const [selected, setSelected] = useState<string | null>(null);
  const [board, setBoard] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [status, setStatus] = useState<'idle' | 'evaluating' | 'error'>('idle');
  const [evalErr, setEvalErr] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [tab, setTab] = useState<'setup' | 'layout' | 'results'>('setup');
  const ut = useUt();
  // Invalid save: reveal the Setup column on mobile so the focused invalid control is visible.
  useEffect(() => {
    const reveal = () => flushSync(() => setTab('setup'));
    window.addEventListener('yl-reveal-invalid', reveal);
    return () => window.removeEventListener('yl-reveal-invalid', reveal);
  }, []);
  const updateRef = useRef(update); updateRef.current = update;
  const draftRef = useRef(draft); draftRef.current = draft;
  const sigRef = useRef(currentSig); sigRef.current = currentSig;
  const readOnlyRef = useRef(readOnly); readOnlyRef.current = readOnly;

  const locked = readOnly || draft.placements.length > 0;
  const boardCount = input?.board.quantity ?? 1;
  useEffect(() => { if (board >= boardCount) setBoard(0); }, [board, boardCount]);

  // Server-authoritative validation of accepted edits; readOnly never calls preview.
  useEffect(() => {
    if (readOnly || !currentSig) { setStatus('idle'); return; }
    if (draftRef.current.resultSig === currentSig && draftRef.current.result) { setStatus('idle'); return; }
    setStatus('evaluating');
    const forSig = currentSig;
    const timer = setTimeout(() => {
      const sc = scenarioFromDraft(draftRef.current);
      if (!sc) return;
      evaluateCutting(jobId, sc, false).then((r) => {
        if (sigRef.current !== forSig) return;
        updateRef.current((d) => ({ ...d, result: r.result ?? null, resultSig: r.result ? forSig : null }));
        setStatus('idle'); setEvalErr(null);
      }).catch((e) => {
        if (sigRef.current !== forSig) return;
        setStatus('error'); setEvalErr(cuttingErrorMessage(e, ct, t));
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [currentSig, readOnly, jobId, nonce]);

  const apply = useCallback((next: Placement[]) => {
    if (!input) return false;
    const err = placementError(input, next);
    if (err) { setFeedback(ct('rejected', { msg: ct(`pe_${err}` as CtKey) })); return false; }
    setFeedback(null);
    update((d) => ({ ...d, placements: next, origin: 'manual' }));
    return true;
  }, [input, ct, update]);

  const runGenerate = async () => {
    const sc = scenarioFromDraft(draftRef.current);
    if (!sc) return;
    const forSig = sigRef.current;
    setGenerating(true); setFeedback(null);
    try {
      const r = await evaluateCutting(jobId, { ...sc, placements: [] }, true);
      if (sigRef.current !== forSig || readOnlyRef.current) return;
      const s = sig(sc.input, r.placements);
      update((d) => ({ ...d, placements: r.placements, origin: 'shelf_v1', result: r.result ?? null, resultSig: r.result ? s : null }));
      setSelected(null); setBoard(0);
    } catch (e) {
      setFeedback(cuttingErrorMessage(e, ct, t));
    } finally { setGenerating(false); }
  };

  const selP = draft.placements.find((p) => pid(p) === selected);
  const rotate = (p: Placement) => {
    if (!input) return;
    if (!pieceDims(input, p).part.rotation_allowed) { setFeedback(ct('rejected', { msg: ct('pe_rotation_forbidden') })); return; }
    apply(draft.placements.map((q) => (pid(q) === pid(p) ? { ...q, rotated: !q.rotated } : q)));
  };

  const preview = useMemo(() => boardPreview(draft.form), [draft.form]);
  const tabs: { k: 'setup' | 'layout' | 'results'; label: string }[] = [
    { k: 'setup', label: ut('tabSetup') }, { k: 'layout', label: ut('tabLayout') }, { k: 'results', label: ut('tabResults') },
  ];
  const col = (k: 'setup' | 'layout' | 'results') => cn('min-w-0 flex-col gap-4', tab === k ? 'flex' : 'hidden', 'xl:flex');

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1 xl:hidden" role="tablist" aria-label={ut('tabLayout')}>
        {tabs.map(({ k, label }) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} aria-controls={`studio-panel-${k}`} id={`studio-tab-${k}`} onClick={() => setTab(k)} data-testid={`tab-mobile-${k}`}
            className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', tab === k ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[21rem_minmax(0,1fr)_19rem] xl:items-start">
        <section id="studio-panel-setup" className={cn(col('setup'), 'xl:sticky xl:top-20 xl:max-h-[calc(100dvh-6rem)] xl:overflow-y-auto xl:pe-1')} aria-label={ut('tabSetup')}>
          {locked && !readOnly && (
            <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted/60 px-3 py-2.5">
              <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <p className="min-w-0 flex-1 text-xs text-muted-foreground">{ct('inputsLocked')}</p>
              <Button type="button" size="sm" variant="outline" data-testid="button-edit-inputs" onClick={() => setConfirm({
                title: ct('editInputsTitle'), desc: ct('editInputsDesc'), action: ct('clearAndEdit'),
                onConfirm: () => { update((d) => ({ ...d, placements: [], origin: 'manual', result: null, resultSig: null })); setSelected(null); },
              })}><PencilLine className="h-3.5 w-3.5" aria-hidden />{ct('editInputs')}</Button>
            </div>
          )}
          <InputEditor panelLinked={!!draft.source} form={draft.form} errors={v.errors} copies={v.copies} disabled={locked} canCreateMaterial={canCreateMaterial} showErrors={showErrors}
            onChange={(f) => update((d) => ({ ...d, form: f, result: null, resultSig: null }))} />
        </section>

        <section id="studio-panel-layout" className={cn(col('layout'), 'rounded-lg border bg-card p-4')} aria-label={ct('canvas')}>
          {!input ? (
            <>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">{ut('boardPreview')}</h3>
                {preview?.usableW && preview.usableH && <span className="ms-auto font-mono text-[11px] text-muted-foreground" dir="ltr">{ut('usable', { w: preview.usableW, h: preview.usableH })}</span>}
              </div>
              {preview ? <BoardPreviewSvg p={preview} /> : (
                <div className="flex aspect-[2/1] items-center justify-center rounded-md border border-dashed bg-muted/30 px-6 text-center text-sm text-muted-foreground">{ut('boardPreviewWaiting')}</div>
              )}
              <p className="text-xs text-muted-foreground" data-testid="text-complete-inputs">{preview ? (preview.marginsValid ? ut('boardPreviewHint') : ut('marginsPending')) : ct('completeInputs')}</p>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{ct('canvas')}</h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{ct(draft.origin === 'shelf_v1' ? 'origin_shelf_v1' : 'origin_manual')}</span>
                {!readOnly && (
                  <div className="ms-auto flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" disabled={draft.placements.length === 0} data-testid="button-reset-placements"
                      onClick={() => setConfirm({ title: ct('resetTitle'), desc: ct('resetDesc'), action: ct('reset'), onConfirm: () => { update((d) => ({ ...d, placements: [], origin: 'manual' })); setSelected(null); } })}>
                      <Eraser className="h-3.5 w-3.5" aria-hidden />{ct('resetPlacements')}
                    </Button>
                    <Button type="button" size="sm" disabled={generating} data-testid="button-generate"
                      onClick={() => (draft.placements.length ? setConfirm({ title: ct('generateTitle'), desc: ct('generateDesc'), action: ct('replace'), onConfirm: runGenerate }) : runGenerate())}>
                      {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Sparkles className="h-3.5 w-3.5" aria-hidden />}
                      {generating ? ct('generating') : ct('generate')}
                    </Button>
                  </div>
                )}
              </div>
              {feedback && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive" role="status" data-testid="text-canvas-feedback">{feedback}</p>}
              <BoardCanvas input={input} placements={draft.placements} board={board} onBoard={setBoard} selected={selected}
                onSelect={(id) => { setSelected(id); const p = draft.placements.find((q) => pid(q) === id); if (p) setBoard(p.board); }}
                readOnly={readOnly || generating}
                onMove={(p, x, y) => apply(draft.placements.map((q) => (pid(q) === pid(p) ? { ...q, x: fmtNum(x), y: fmtNum(y) } : q)))}
                onRotate={rotate}
                onRemove={(p) => { apply(draft.placements.filter((q) => pid(q) !== pid(p))); setSelected(null); }} />
              <p className="text-[11px] text-muted-foreground">{ct('algoNote')}</p>
              <div className="xl:hidden">
                <PlacementPanel input={input} placements={draft.placements} selected={selP ? selected : null} onSelect={setSelected} readOnly={readOnly || generating} apply={apply} feedback={feedback} />
              </div>
            </>
          )}
        </section>

        <div id="studio-panel-results" className={cn(col('results'), 'xl:sticky xl:top-20 xl:max-h-[calc(100dvh-6rem)] xl:overflow-y-auto')}>
          <ResultPanel result={result} input={input} status={status} errorMsg={evalErr} readOnly={readOnly} onRetry={() => setNonce((n) => n + 1)} />
          {input && (
            <div className="hidden xl:block">
              <PlacementPanel input={input} placements={draft.placements} selected={selP ? selected : null} onSelect={setSelected} readOnly={readOnly || generating} apply={apply} feedback={feedback} />
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
