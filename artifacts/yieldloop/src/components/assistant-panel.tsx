import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowUpRight, GitCompare, Loader2, Send, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FormAlert } from '@/components/brand';
import { AuthError } from '@/lib/auth';
import { askAssistant, evidenceSignature, useAssistanceStatus, useEvidence, type AssistanceAnswer } from '@/lib/assistance';
import { answerMatchesJob, assistantEntryAvailable, buildSuggestions, type Suggestion } from '@/lib/assistant-panel';
import { jobLabel } from '@/lib/core-helpers';
import { hasFKey, useFt, type FKey } from '@/lib/feature-i18n';
import { useI18n } from '@/lib/i18n';
import { useJobs } from '@/lib/jobs';
import { errorMessage } from '@/lib/session';
import { useUt } from '@/lib/ui-i18n';
import { cn } from '@/lib/utils';

type Ctx = { available: boolean; openFor: (jobId: number | null) => void };
const AssistantCtx = createContext<Ctx>({ available: false, openFor: () => {} });
export const useAssistantPanel = () => useContext(AssistantCtx);

/** Floating, per-job assistant. Rendered only when the server reports a configured provider. */
export function AssistantProvider({ children }: { children: ReactNode }) {
  const status = useAssistanceStatus();
  const available = assistantEntryAvailable(status.data);
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openFor = useCallback((id: number | null) => { if (id !== null) setJobId(id); setOpen(true); }, []);
  const value = useMemo(() => ({ available, openFor }), [available, openFor]);
  const ut = useUt();
  return (
    <AssistantCtx.Provider value={value}>
      {children}
      {available && (
        <Popover open={open} onOpenChange={setOpen}>
            <div className="fixed bottom-5 end-5 z-40 print:hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                  <button ref={triggerRef} type="button" aria-label={ut('asstOpen')} aria-expanded={open} data-testid="button-open-assistant"
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-ring motion-reduce:transition-none">
                    <Sparkles className="h-5 w-5" aria-hidden />
                  </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">{ut('asstTitle')}</TooltipContent>
              </Tooltip>
            </div>
          <PopoverContent side="top" align="end" sideOffset={12} collisionPadding={12}
            onEscapeKeyDown={(event) => {
              event.preventDefault();
              setOpen(false);
              triggerRef.current?.focus();
            }}
            onCloseAutoFocus={(event) => { event.preventDefault(); triggerRef.current?.focus(); }}
            className="flex max-h-[min(36rem,calc(100dvh-6rem))] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl p-0 shadow-lg"
            data-testid="panel-assistant">
            <AssistantBody jobId={jobId} setJobId={setJobId} close={() => setOpen(false)} />
          </PopoverContent>
        </Popover>
      )}
    </AssistantCtx.Provider>
  );
}

function AssistantBody({ jobId, setJobId, close }: { jobId: number | null; setJobId: (id: number | null) => void; close: () => void }) {
  const ut = useUt();
  const ft = useFt();
  const { t, lang } = useI18n();
  const jobs = useJobs({ page: 1 });
  const evidence = useEvidence(jobId);
  const [question, setQuestion] = useState('');
  const [notes, setNotes] = useState(false);
  const [consent, setConsent] = useState(false);
  const [answer, setAnswer] = useState<AssistanceAnswer | null>(null);
  const [outdated, setOutdated] = useState(false);
  const jobRef = useRef(jobId);
  jobRef.current = jobId;
  const sig = evidence.data ? evidenceSignature(evidence.data) : null;

  // Evidence revision changed under the answer: drop it.
  useEffect(() => {
    if (answer && sig && evidenceSignature(answer.evidence) !== sig) { setAnswer(null); setOutdated(true); }
  }, [answer, sig]);
  // Switching job clears per-job state.
  useEffect(() => { setAnswer(null); setOutdated(false); setConsent(false); }, [jobId]);

  const ask = useMutation({
    mutationFn: (v: { jobId: number; q: string }) => askAssistant(v.jobId, { language: lang, question: v.q, include_notes: notes }),
    onSuccess: (a, v) => {
      if (v.jobId !== jobRef.current || !answerMatchesJob(a, jobRef.current)) return; // late answer for another job
      setOutdated(false); setAnswer(a);
      if (sig !== evidenceSignature(a.evidence)) void evidence.refetch();
    },
    onError: (e) => { if (e instanceof AuthError && e.code === 'stale_revision') { setAnswer(null); void evidence.refetch(); } },
  });
  const err = ask.error instanceof AuthError && hasFKey(ask.error.code) ? ft(ask.error.code as FKey) : ask.error ? errorMessage(ask.error, t) : null;

  const list = jobs.data?.results ?? [];
  const current = list.find((j) => j.id === jobId);
  const suggestions = buildSuggestions(evidence.data, current, list);
  const sgText = (s: Suggestion) => s.kind === 'scrap' ? ut('sgScrap', { job: s.job }) : s.kind === 'material' ? ut('sgMaterial', { job: s.job }) : ut('sgCompare', { a: s.a, b: s.b });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (jobId !== null && consent && question.trim() && !ask.isPending) ask.mutate({ jobId, q: question.trim() });
  };

  return (
    <>
      <header className="flex items-start gap-3 border-b bg-accent/50 px-4 py-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-hidden><Sparkles className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">{ut('asstTitle')}</h2>
          <p className="text-xs leading-snug text-muted-foreground">{ut('asstGreeting')}</p>
        </div>
        <Button variant="ghost" size="icon" className="-me-1.5 h-8 w-8" onClick={close} aria-label={ut('asstClose')} data-testid="button-close-assistant"><X className="h-4 w-4" aria-hidden /></Button>
      </header>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div className="space-y-1">
          <Label htmlFor="asst-job" className="text-xs">{ut('asstJob')}</Label>
          <select id="asst-job" value={jobId ?? ''} onChange={(e) => setJobId(e.target.value ? Number(e.target.value) : null)} data-testid="select-assistant-job"
            className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">{jobs.isPending ? '…' : list.length ? ut('asstChooseJob') : ut('asstNoJobs')}</option>
            {current === undefined && jobId !== null && evidence.data && <option value={jobId}>{jobLabel(evidence.data.job)}</option>}
            {list.map((j) => <option key={j.id} value={j.id}>{jobLabel(j)} · {j.title}</option>)}
          </select>
        </div>

        {suggestions.length > 0 && !answer && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{ut('asstSuggest')}</p>
            <div className="flex flex-col gap-1.5">
              {suggestions.map((s) => s.kind === 'compare' ? (
                <Link key="cmp" href={s.href} onClick={close} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-start text-sm hover:border-primary/40 hover:bg-accent/40" data-testid="link-suggest-compare">
                  <GitCompare className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden /><span className="flex-1">{sgText(s)}</span><ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground rtl:-scale-x-100" aria-hidden />
                </Link>
              ) : (
                <button key={s.kind} type="button" onClick={() => setQuestion(sgText(s))} className="rounded-lg border px-3 py-2 text-start text-sm hover:border-primary/40 hover:bg-accent/40" data-testid={`button-suggest-${s.kind}`}>{sgText(s)}</button>
              ))}
            </div>
          </div>
        )}

        {outdated && !answer && <p className="rounded-md border border-[hsl(30_88%_50%/0.3)] bg-[hsl(30_88%_50%/0.06)] px-3 py-2 text-xs" role="status">{ft('asOutdated')}</p>}
        {answer && <CompactAnswer answer={answer} />}

        <div className="mt-auto space-y-2 border-t pt-3">
          <Label htmlFor="asst-q" className="sr-only">{ut('asstQuestion')}</Label>
          <Textarea id="asst-q" rows={2} maxLength={2000} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={ut('asstPlaceholder')} disabled={jobId === null} className="min-h-[60px] resize-none text-sm" data-testid="input-assistant-question" />
          <div className="flex items-center gap-2">
            <Switch id="asst-notes" checked={notes} onCheckedChange={(v) => { setNotes(v); setConsent(false); }} data-testid="switch-assistant-notes" />
            <Label htmlFor="asst-notes" className="text-xs font-normal">{ft('asNotes')}</Label>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox id="asst-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" data-testid="checkbox-assistant-consent" />
            <Label htmlFor="asst-consent" className="text-[11px] font-normal leading-snug text-muted-foreground">{ft('asConsent', { notes: notes ? ft('asConsentNotes') : '' })}</Label>
          </div>
          {err && <FormAlert message={err} />}
          <div className="flex items-center justify-between gap-2">
            {jobId !== null ? <Link href={`/assistant?job_id=${jobId}`} onClick={close} className="text-xs font-medium text-primary hover:underline" data-testid="link-assistant-evidence">{ut('asstEvidenceLink')}</Link> : <span />}
            <Button type="submit" size="sm" disabled={jobId === null || !consent || !question.trim() || ask.isPending} data-testid="button-assistant-send">
              {ask.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden />}{ut('asstSend')}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">{ut('asstOneJob')}</p>
        </div>
      </form>
    </>
  );
}

function CompactAnswer({ answer }: { answer: AssistanceAnswer }) {
  const ft = useFt();
  return (
    <section className="space-y-2 rounded-xl border bg-muted/40 p-3 text-sm" dir={answer.language === 'ar' ? 'rtl' : 'ltr'} data-testid="panel-assistant-answer">
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"><Sparkles className="h-3 w-3" aria-hidden />{ft('asAiBadge')}</span>
      <div className="space-y-1.5 leading-relaxed">{answer.answer.map((p, i) => <p key={i}>{p}</p>)}</div>
      {answer.possible_leads.length > 0 && (
        <ol className="space-y-1.5">
          {answer.possible_leads.map((l, i) => (
            <li key={`${l.code}-${i}`} className="rounded-lg border bg-card p-2 text-xs">
              <p className="font-medium">{l.text}</p>
              <p className="mt-1 text-muted-foreground">{ft('asEvidenceNeeded')}: {l.evidence_needed}</p>
              <p className="text-muted-foreground">{ft('asNextStep')}: {l.next_step}</p>
              {l.record_ids.length > 0 && <p className={cn('mt-1 flex flex-wrap gap-1')}>{l.record_ids.map((r) => <span key={r} className="rounded border px-1 font-mono text-[10px]" dir="ltr">{r}</span>)}</p>}
            </li>
          ))}
        </ol>
      )}
      <p className="border-t pt-2 text-[11px] text-muted-foreground">{answer.notice}</p>
    </section>
  );
}
