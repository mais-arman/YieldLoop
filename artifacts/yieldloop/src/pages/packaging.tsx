import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Box, Download, Loader2, RotateCw, Save, Sparkles, Upload } from 'lucide-react';
import { SavedConcepts } from '@/components/packaging/saved-concepts';
import { createPackagingDesign, getPackagingDesign, PK_DESIGNS_KEY, updatePackagingDesign } from '@/lib/packaging-designs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { FormAlert } from '@/components/brand';
import { useToast } from '@/hooks/use-toast';
import { AuthError } from '@/lib/auth';
import type { PackagingProposal as ProposeResponse } from '@workspace/api-client-react';
import { proposePackaging, useAssistanceStatus, usePackagingTemplates, validatePackaging } from '@/lib/assistance';
import { extraErrorText, hasFKey, useFt, type FKey } from '@/lib/feature-i18n';
import { useI18n } from '@/lib/i18n';
import { errorMessage } from '@/lib/session';
import { blankParams, hasLid, isTemplateId, paramKeysFor, statesFor, switchTemplate, TEMPLATE_IDS, type PackagingDesign, type Params, type ParamKey, type TemplateId, type ViewState } from '@/lib/packaging-templates';
import { LIMITS, toDims, validateDesign, type FieldErrors } from '@/lib/packaging-validation';
import { buildPanels, externalSize } from '@/lib/packaging-geometry';
import { conceptFileName, parseConceptFile, sameConcept, toConceptFile } from '@/lib/packaging-file';
import { cn } from '@/lib/utils';
import { SendToCutting } from '@/components/packaging/send-to-cutting';

const ConceptViewer = lazy(() => import('@/components/packaging/concept-viewer'));
const TPL_LABEL: Record<TemplateId, { en: string; ar: string }> = {
  tray: { en: 'Tray', ar: 'صينية' }, sleeve: { en: 'Sleeve', ar: 'غلاف' }, lid_box: { en: 'Lid box', ar: 'علبة بغطاء' }, flat_box: { en: 'Flat box', ar: 'علبة مسطحة' },
};

/** Server field codes -> localized text. Unknown codes fall back to a generic localized message, never raw codes. */
function serverFieldErrors(err: unknown, ft: ReturnType<typeof useFt>): Record<string, string> {
  const out: Record<string, string> = {};
  if (err instanceof AuthError && err.fields) for (const [k, v] of Object.entries(err.fields)) {
    out[k.split('.').pop()!] = v.map((code) => hasFKey(`e_${code}`) ? ft(`e_${code}` as FKey) : ft('e_invalid_fields')).join(' ');
  }
  return out;
}

function Segmented<T extends string>({ value, options, onChange, label, testId }: { value: T; options: { id: T; label: string; disabled?: boolean }[]; onChange: (v: T) => void; label: string; testId: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-md border bg-muted/50 p-0.5">
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} disabled={o.disabled} onClick={() => onChange(o.id)}
          data-testid={`${testId}-${o.id}`}
          className={cn('rounded px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40',
            value === o.id ? 'bg-card font-medium text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function PackagingPage() {
  const ft = useFt();
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const templates = usePackagingTemplates();
  const status = useAssistanceStatus();
  const [template, setTemplate] = useState<TemplateId>('tray');
  const [name, setName] = useState('');
  const [params, setParams] = useState<Params>(blankParams('tray'));
  const [state, setState] = useState<ViewState>('assembled');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [design, setDesign] = useState<PackagingDesign | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const [saved, setSaved] = useState<{ id: number; revision: number } | null>(null);
  const [savedDesign, setSavedDesign] = useState<PackagingDesign | null>(null);
  const [saveReason, setSaveReason] = useState('');
  const [opening, setOpening] = useState<number | null>(null);
  const saveReq = useRef(crypto.randomUUID());
  const save = useMutation({
    mutationFn: ({ asNew }: { asNew: boolean }) => {
      const body = { design: design!, reason: saveReason.trim() || ft(saved && !asNew ? 'pkRevisionNote' : 'pkCreationNote'), request_id: saveReq.current };
      return saved && !asNew ? updatePackagingDesign(saved.id, { ...body, revision: saved.revision }) : createPackagingDesign(body);
    },
    onSuccess: (r) => {
      setSavedDesign(r.design);
      saveReq.current = crypto.randomUUID();
      setSaved({ id: r.id, revision: r.revision }); setSaveReason('');
      qc.invalidateQueries({ queryKey: PK_DESIGNS_KEY });
      toast({ description: ft('pkSaved', { r: r.revision }) });
    },
    onError: (err) => { if (err instanceof AuthError) saveReq.current = crypto.randomUUID(); },
  });
  const loadDesign = (d: PackagingDesign) => {
    setTemplate(isTemplateId(d.template) ? d.template : 'tray'); setName(d.name); setParams(d.parameters); setState(d.state); setErrors({}); setFormError(null);
  };
  const openSaved = async (id: number, revision?: number) => {
    setOpening(id);
    try {
      const r = await getPackagingDesign(id, revision);
      setSavedDesign(r.design);
      loadDesign(r.design); setDesign(r.design); setSaved({ id: r.id, revision: r.revision }); save.reset();
      toast({ description: ft('pkOpened', { n: r.design.name }) });
    } catch (err) { setFormError(errorMessage(err, t)); }
    finally { setOpening(null); }
  };
  const saveConflict = save.error instanceof AuthError && save.error.status === 409;
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (Number(p.get('concept')) > 0) void openSaved(Number(p.get('concept')), Number(p.get('revision')) || undefined);
  }, []);

  const current: PackagingDesign = { template, name, parameters: params, state };
  const stale = design !== null && !sameConcept(design, current);

  const errText = (code: FieldErrors[keyof FieldErrors], key: string) => {
    if (!code) return '';
    const lim = LIMITS[key as ParamKey];
    const v = code === 'min' ? lim?.[0] : code === 'max' ? lim?.[1] : '';
    return ft(`e_${code}` as FKey, { v: v ?? '' });
  };

  const seq = useRef(0);
  const validate = useMutation({
    mutationFn: async (d: PackagingDesign) => { const n = ++seq.current; return { n, res: await validatePackaging(d) }; },
    onSuccess: ({ n, res }) => {
      if (n !== seq.current) return; // superseded by a newer request
      setErrors({}); setFormError(null);
      const d = res.design; setTemplate(d.template); setName(d.name); setParams(d.parameters); setState(d.state); setDesign(d);
    },
    onError: (err) => { const fe = serverFieldErrors(err, ft); setErrors(fe); setFormError(Object.keys(fe).length ? ft('e_invalid_fields') : errorMessage(err, t)); },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const local = Object.fromEntries(Object.entries(validateDesign(template, params, state)).map(([k, c]) => [k, errText(c, k)]));
    if (!name.trim() || name.trim().length > 160) local.name = ft('e_required_max_160');
    if (Object.keys(local).length) { setErrors(local); return; }
    validate.mutate(current);
  };

  const changeTemplate = (id: TemplateId) => {
    setTemplate(id); setParams((p) => switchTemplate(p, id)); setErrors({});
    if (!statesFor(id).includes(state)) setState('assembled');
  };

  const panels = useMemo(() => design ? buildPanels(design.template, toDims(design.template, design.parameters), design.state) : null, [design]);
  // Live concept preview from locally valid inputs; the server result stays authoritative for save/export.
  const liveKey = JSON.stringify([template, params, state]);
  const liveErrors = useMemo(() => validateDesign(template, params, state), [liveKey]);
  const liveOk = Object.keys(liveErrors).length === 0;
  const livePanels = useMemo(() => {
    if (!liveOk) return null;
    try { return buildPanels(template, toDims(template, params), state); } catch { return null; }
  }, [liveOk, liveKey]);
  const showLive = stale || !design;
  const viewPanels = showLive ? livePanels : panels;
  const liveErrorList = Object.entries(liveErrors).filter(([k, c]) => c && !(c === 'required' && !(params as Record<string, string | undefined>)[k])).map(([k, c]) => `${hasFKey(`p_${k}`) ? ft(`p_${k}` as FKey) : ''} ${errText(c, k)}`.trim());
  const ext = design ? externalSize(design.template, toDims(design.template, design.parameters)) : null;

  const exportFile = () => {
    if (!design) return;
    const blob = new Blob([JSON.stringify(toConceptFile(design), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = conceptFileName(design.name); a.click(); URL.revokeObjectURL(url);
  };
  const importFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    const r = parseConceptFile(await file.text());
    if (!r.ok) { setFormError(ft(`pkFileErr_${r.code}` as FKey)); return; }
    validate.mutate(r.design, { onSuccess: () => {
      setSaved(null); save.reset(); saveReq.current = crypto.randomUUID();
      setSaveReason(''); toast({ description: ft('pkImported') });
    } });
  };

  const tplLabel = (id: TemplateId) => templates.data?.templates.find((x) => x.id === id)?.label[lang] ?? TPL_LABEL[id][lang];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-800" data-testid="badge-concept">
            <AlertTriangle className="h-3 w-3" aria-hidden />{ft('pkConceptBadge')}
          </span>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight" data-testid="text-page-title">{ft('pkTitle')}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{ft('pkLead')}</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={importFile} data-testid="input-import" />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={validate.isPending} data-testid="button-import"><Upload className="h-4 w-4" aria-hidden />{ft('pkImport')}</Button>
          <Button variant="outline" size="sm" onClick={exportFile} disabled={!design || stale} data-testid="button-export"><Download className="h-4 w-4" aria-hidden />{ft('pkExport')}</Button>
        </div>
      </header>

      {templates.isError && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm" role="alert">
          <span>{ft('pkTemplatesError')} {errorMessage(templates.error, t)}</span>
          <Button size="sm" variant="outline" onClick={() => templates.refetch()}><RotateCw className="h-4 w-4" aria-hidden />{ft('pkRetry')}</Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="space-y-6">
          <form onSubmit={submit} className="rounded-lg border bg-card p-5" noValidate data-testid="form-packaging">
            <fieldset disabled={validate.isPending} className="space-y-5" aria-busy={validate.isPending}>
            <div className="space-y-2">
              <Label>{ft('pkTemplate')}</Label>
              {templates.isPending ? <Skeleton className="h-9 w-64" /> : (
                <Segmented value={template} label={ft('pkTemplate')} testId="seg-template" onChange={changeTemplate}
                  options={TEMPLATE_IDS.map((id) => ({ id, label: tplLabel(id) }))} />
              )}
              {errors.template && <p className="text-xs text-destructive">{errors.template}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pk-name">{ft('pkName')}</Label>
              <Input id="pk-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} data-testid="input-name" />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">{ft('pkDims')}</legend>
              <div className="grid grid-cols-2 gap-3">
                {paramKeysFor(template).map((k) => (
                  <div key={k} className="space-y-1">
                    <Label htmlFor={`pk-${k}`} className="text-xs text-muted-foreground">{ft(`p_${k}` as FKey)}</Label>
                    <div className="relative" dir="ltr">
                      <Input id={`pk-${k}`} inputMode="decimal" dir="ltr" value={params[k] ?? ''} aria-invalid={!!errors[k]}
                        onChange={(e) => { setParams((p) => ({ ...p, [k]: e.target.value })); setErrors((prev) => { const next = { ...prev }; delete next[k]; return next; }); }}
                        className="pe-10 font-mono tabular-nums" placeholder={`${LIMITS[k][0]}–${LIMITS[k][1]}`} data-testid={`input-${k}`} />
                      <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs text-muted-foreground">mm</span>
                    </div>
                    {errors[k] && <p className="text-xs text-destructive" data-testid={`error-${k}`}>{errors[k]}</p>}
                  </div>
                ))}
              </div>
              {errors.parameters && <p className="text-xs text-destructive">{errors.parameters}</p>}
            </fieldset>
            <div className="space-y-2">
              <Label>{ft('pkState')}</Label>
              <div><Segmented value={state} label={ft('pkState')} testId="seg-state" onChange={(v) => setState(v as ViewState)}
                options={(['assembled', 'open'] as ViewState[]).map((s) => ({ id: s, label: ft(`st_${s}`), disabled: !statesFor(template).includes(s) }))} /></div>
              <p className="text-xs text-muted-foreground">{template === 'sleeve' ? ft('pkSleeveNoOpen') : template === 'tray' ? ft('pkOpenTray') : ft('pkOpenLid')}</p>
              {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
            </div>
            {formError && <FormAlert message={formError} />}
            <Button type="submit" className="w-full" disabled={validate.isPending || templates.isPending} data-testid="button-validate">
              {validate.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Box className="h-4 w-4" aria-hidden />}
              {validate.isPending ? ft('pkValidating') : stale ? ft('pkUpdate') : ft('pkValidate')}
            </Button>
            </fieldset>
          </form>
          <ProposePanel available={status.data?.available ?? false} statusLoading={status.isPending}
            onApply={(tpl, p, n) => { setTemplate(tpl); setParams({ ...blankParams(tpl), ...p }); setName(n); setState('assembled'); setErrors({}); toast({ description: ft('pkApplied') }); }} />
        </div>

        <section className="space-y-4" aria-label={ft('v_title')}>
          <div className="flex flex-wrap items-center gap-2" role="status" aria-live="polite" data-testid="text-preview-mode">
            {showLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-primary/50 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary" data-testid="badge-live">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" aria-hidden />{ft('pkLiveBadge')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/40 bg-emerald-600/10 px-2.5 py-0.5 text-xs font-medium text-emerald-800" data-testid="badge-validated">{ft('pkValidatedBadge')}</span>
            )}
            <span className="text-xs text-muted-foreground">{showLive ? ft('pkLiveHint') : ft('pkValidatedHint')}</span>
          </div>
          {stale && design && <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900" data-testid="text-stale">{ft('pkStale', { state: ft(`st_${design.state}`) })}</div>}
          {showLive && !liveOk && liveErrorList.length > 0 && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm" role="alert" data-testid="text-live-errors">
              <p className="font-medium text-destructive">{ft('pkLiveInvalid')}</p>
              <ul className="mt-1 list-disc ps-5 text-xs">{liveErrorList.map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
          )}
          {viewPanels ? (
            <Suspense fallback={<Skeleton className="aspect-[4/3] w-full rounded-lg" />}>
              <div className={cn('rounded-lg', showLive && 'outline-dashed outline-2 outline-offset-2 outline-primary/30')} data-testid={showLive ? 'viewer-live' : 'viewer-validated'}><ConceptViewer panels={viewPanels} /></div>
            </Suspense>
          ) : (
            <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-[repeating-linear-gradient(45deg,transparent,transparent_12px,hsl(var(--muted))_12px,hsl(var(--muted))_13px)] p-6 text-center" data-testid="viewer-empty">
              <Box className="h-8 w-8 text-muted-foreground/60" aria-hidden />
              <p className="max-w-xs text-sm text-muted-foreground">{ft('pkEmptyView')}</p>
            </div>
          )}
          {design && ext && (
            <div className={cn('rounded-lg border bg-card p-4', stale && 'opacity-60')} data-testid="panel-summary">
              <h2 className="text-sm font-semibold">{stale && <span className="me-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] text-amber-900">{ft('pkStaleTag')}</span>}{ft('pkSummary')} — <span className="font-normal">{design.name || tplLabel(design.template)}</span></h2>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <div><dt className="text-xs text-muted-foreground">{ft('pkInternal')}</dt><dd className="font-mono tabular-nums" dir="ltr">{design.parameters.length} × {design.parameters.width} × {design.parameters.height} mm</dd></div>
                <div><dt className="text-xs text-muted-foreground">{ft('pkExternal')}</dt><dd className="font-mono tabular-nums" dir="ltr">{ext[0]} × {ext[2]} × {ext[1]} mm</dd></div>
                <div><dt className="text-xs text-muted-foreground">{tplLabel(design.template)} · {ft(`st_${design.state}`)}</dt><dd>{ft('pkPanels', { n: panels?.length ?? 0, t: design.parameters.thickness ?? '' })}</dd></div>
                {hasLid(design.template) && (
                  <div className="sm:col-span-3 text-xs text-muted-foreground" dir="auto">{ft('p_lid_height')}: <span className="font-mono">{design.parameters.lid_height} mm</span> · {ft('p_clearance')}: <span className="font-mono">{design.parameters.clearance} mm</span></div>
                )}
              </dl>
            </div>
          )}
          <div className="rounded-lg border bg-card p-4" data-testid="panel-save">
            {saved && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-accent/50 px-3 py-2 text-xs" data-testid="text-editing">
                <span>{ft('pkEditing', { id: saved.id, r: saved.revision })}</span>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setSaved(null); save.reset(); }} data-testid="button-detach">{ft('pkDetach')}</Button>
              </div>
            )}
            <Label htmlFor="pk-save-reason" className="text-xs text-muted-foreground">{ft('pkSaveReason')}</Label>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row">
              <Input id="pk-save-reason" value={saveReason} maxLength={1000} onChange={(e) => setSaveReason(e.target.value)} placeholder={ft('pkSaveReasonPh')} disabled={save.isPending} data-testid="input-save-reason" />
              <div className="flex shrink-0 gap-2">
                {saved && <Button variant="outline" onClick={() => save.mutate({ asNew: true })} disabled={!design || stale || save.isPending} data-testid="button-save-new">{ft('pkSaveNew')}</Button>}
                <Button onClick={() => save.mutate({ asNew: false })} disabled={!design || stale || save.isPending || saveConflict} data-testid="button-save">
                  {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}{save.isPending ? ft('pkSaving') : ft('pkSave')}
                </Button>
              </div>
            </div>
            {(!design || stale) && <p className="mt-2 text-xs text-muted-foreground">{ft('pkSaveNeedsValid')}</p>}
            {save.error && <div className="mt-2"><FormAlert message={saveConflict ? ft('pkSaveConflict') : (save.error instanceof AuthError && extraErrorText(save.error.code, lang)) || errorMessage(save.error, t)} /></div>}
          </div>
          <SavedConcepts activeId={saved?.id ?? null} opening={opening} onOpen={openSaved} tplLabel={tplLabel}
            onLoadRevision={({ design: d }) => { loadDesign(d); validate.mutate(d); }} />
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
            <p className="font-medium text-amber-900">{ft('pkConceptNote')}</p>
            <SendToCutting saved={saved} ready={!!design && !stale && !!savedDesign && sameConcept(savedDesign, current) && !save.isPending && !validate.isPending}
              supported={template === 'flat_box'} />
          </div>
        </section>
      </div>
    </div>
  );
}

function ProposePanel({ available, statusLoading, onApply }: { available: boolean; statusLoading: boolean; onApply: (t: TemplateId, p: Params, n: string) => void }) {
  const ft = useFt();
  const { t, lang } = useI18n();
  const [desc, setDesc] = useState('');
  const [draft, setDraft] = useState<ProposeResponse | null>(null);
  const propose = useMutation({ mutationFn: proposePackaging, onSuccess: setDraft });
  const aiErr = propose.error instanceof AuthError && hasFKey(propose.error.code) ? ft(propose.error.code as FKey) : propose.error ? errorMessage(propose.error, t) : null;

  // No provider: omit the proposal entry rather than showing a dead control.
  if (!statusLoading && !available) return null;
  return (
    <section className="space-y-3 rounded-lg border bg-card p-5" data-testid="panel-propose">
      <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" aria-hidden /><h2 className="text-sm font-semibold">{ft('pkPropose')}</h2></div>
      <p className="text-xs text-muted-foreground">{ft('pkProposeHint')}</p>
      {statusLoading ? <Skeleton className="h-20 w-full" /> : !available ? (
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground" data-testid="text-propose-unavailable">{ft('asUnavailable')}</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (desc.trim()) propose.mutate({ language: lang, description: desc.trim() }); }} className="space-y-2">
          <Label htmlFor="pk-desc" className="sr-only">{ft('pkDescription')}</Label>
          <Textarea id="pk-desc" value={desc} maxLength={2000} rows={3} onChange={(e) => setDesc(e.target.value)} placeholder={ft('pkDescriptionPh')} data-testid="input-description" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="tabular-nums">{desc.length}/2000</span>
            <Button type="submit" size="sm" disabled={!desc.trim() || propose.isPending} data-testid="button-suggest">
              {propose.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
              {propose.isPending ? ft('pkSuggesting') : ft('pkSuggest')}
            </Button>
          </div>
          {aiErr && <FormAlert message={aiErr} />}
        </form>
      )}
      {draft && <ReviewDraft draft={draft} onDiscard={() => setDraft(null)} onApply={(tpl, p, n) => { onApply(tpl, p, n); setDraft(null); }} />}
    </section>
  );
}

function ReviewDraft({ draft, onApply, onDiscard }: { draft: ProposeResponse; onApply: (t: TemplateId, p: Params, n: string) => void; onDiscard: () => void }) {
  const ft = useFt();
  const [tpl] = useState<TemplateId | null>(draft.template);
  const [p, setP] = useState<Params>(() => tpl ? { ...blankParams(tpl), ...draft.parameters } : {});
  const [n, setN] = useState(draft.name);
  return (
    <div className="space-y-3 rounded-md border border-primary/25 bg-primary/5 p-3" data-testid="panel-review">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-primary">{ft('pkReview')}</h3>
      {!tpl ? <p className="text-sm">{ft('pkNoTemplate')}</p> : (
        <>
          <Input value={n} onChange={(e) => setN(e.target.value)} aria-label={ft('pkName')} className="h-8 bg-card" />
          <div className="grid grid-cols-2 gap-2">
            {paramKeysFor(tpl).map((k) => (
              <label key={k} className="space-y-0.5 text-xs text-muted-foreground">
                {ft(`p_${k}` as FKey)}
                <Input value={p[k] ?? ''} dir="ltr" inputMode="decimal" onChange={(e) => setP((x) => ({ ...x, [k]: e.target.value }))} className="h-8 bg-card font-mono" data-testid={`review-${k}`} />
              </label>
            ))}
          </div>
        </>
      )}
      {!!draft.missing.length && <p className="text-xs"><span className="font-medium">{ft('pkMissing')}:</span> {draft.missing.map((m) => hasFKey(`p_${m}`) ? ft(`p_${m}` as FKey) : m).join(', ')}</p>}
      {!!draft.assumptions.length && (
        <div className="text-xs"><span className="font-medium">{ft('pkAssumptions')}:</span>
          <ul className="list-disc ps-5 text-muted-foreground">{draft.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul></div>
      )}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onDiscard}>{ft('pkDiscard')}</Button>
        {tpl && <Button size="sm" onClick={() => onApply(tpl, p, n)} data-testid="button-apply">{ft('pkApply')}</Button>}
      </div>
    </div>
  );
}
