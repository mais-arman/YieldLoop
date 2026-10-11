import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-lg border bg-card p-4 sm:p-5">
        {locked && !readOnly && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md bg-muted/60 px-3 py-2.5">
            <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <p className="min-w-0 flex-1 text-xs text-muted-foreground">{ct('inputsLocked')}</p>
            <Button type="button" size="sm" variant="outline" data-testid="button-edit-inputs" onClick={() => setConfirm({
              title: ct('editInputsTitle'), desc: ct('editInputsDesc'), action: ct('clearAndEdit'),
              onConfirm: () => { update((d) => ({ ...d, placements: [], origin: 'manual', result: null, resultSig: null })); setSelected(null); },
            })}><PencilLine className="h-3.5 w-3.5" aria-hidden />{ct('editInputs')}</Button>
          </div>
        )}
        <InputEditor form={draft.form} errors={v.errors} copies={v.copies} disabled={locked} canCreateMaterial={canCreateMaterial} showErrors={showErrors}
          onChange={(f) => update((d) => ({ ...d, form: f, result: null, resultSig: null }))} />
      </section>

      {!input ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground" data-testid="text-complete-inputs">{ct('completeInputs')}</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-4">
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
            <BoardCanvas input={input} placements={draft.placements} board={board} onBoard={setBoard} selected={selected}
              onSelect={(id) => { setSelected(id); const p = draft.placements.find((q) => pid(q) === id); if (p) setBoard(p.board); }}
              readOnly={readOnly || generating}
              onMove={(p, x, y) => apply(draft.placements.map((q) => (pid(q) === pid(p) ? { ...q, x: fmtNum(x), y: fmtNum(y) } : q)))}
              onRotate={rotate}
              onRemove={(p) => { apply(draft.placements.filter((q) => pid(q) !== pid(p))); setSelected(null); }} />
            <p className="text-[11px] text-muted-foreground">{ct('algoNote')}</p>
          </section>
          <div className="flex min-w-0 flex-col gap-5">
            <ResultPanel result={result} input={input} status={status} errorMsg={evalErr} readOnly={readOnly} onRetry={() => setNonce((n) => n + 1)} />
            <PlacementPanel input={input} placements={draft.placements} selected={selP ? selected : null} onSelect={setSelected} readOnly={readOnly || generating} apply={apply} feedback={feedback} />
          </div>
        </div>
      )}
      <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
