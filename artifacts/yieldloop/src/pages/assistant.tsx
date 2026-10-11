import { useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Database, FileSearch, RotateCw, Ruler, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { JobNumber, StatusBadge, useFormatDate } from '@/components/job-ui';
import { AuthError } from '@/lib/auth';
import { useEvidence, type CuttingEvidence, type Evidence } from '@/lib/assistance';
import { useAssistantPanel } from '@/components/assistant-panel';
import { useUt } from '@/lib/ui-i18n';
import { Metrics } from '@/components/cutting/result-panel';
import { localizeLimitation, useFt, type FKey } from '@/lib/feature-i18n';
import { useI18n } from '@/lib/i18n';
import { useJobs, type JobStatus } from '@/lib/jobs';
import { errorMessage } from '@/lib/session';
import { cn } from '@/lib/utils';
import { jobLabel } from '@/lib/core-helpers';
import { scrapReasonText, useKt } from '@/lib/core';

const FINDINGS = ['issued', 'good', 'scrap', 'offcut', 'pending_rework', 'accounted', 'variance', 'yield_rate', 'scrap_rate'] as const;

export default function AssistantPage() {
  const ft = useFt();
  const search = useSearch();
  const [, navigate] = useLocation();
  const raw = new URLSearchParams(search).get('job_id');
  const jobId = raw && /^\d+$/.test(raw) ? Number(raw) : null;
  const setJob = (id: number) => navigate(`/assistant?job_id=${id}`);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">{ft('asTitle')}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{ft('asLead')}</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <JobPicker selected={jobId} onSelect={setJob} />
        {jobId === null ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center" data-testid="panel-choose-job">
            <FileSearch className="h-8 w-8 text-muted-foreground/60" aria-hidden />
            <p className="text-sm text-muted-foreground">{ft('asChooseJob')}</p>
          </div>
        ) : <JobAssistant key={jobId} jobId={jobId} />}
      </div>
    </div>
  );
}

function JobPicker({ selected, onSelect }: { selected: number | null; onSelect: (id: number) => void }) {
  const ft = useFt();
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const jobs = useJobs({ page: 1, search: q.trim() || undefined });
  return (
    <aside className="space-y-2 rounded-lg border bg-card p-3 lg:sticky lg:top-20 lg:self-start">
      <Label htmlFor="as-search" className="px-1 text-xs text-muted-foreground">{ft('asPickJob')}</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
        <Input id="as-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={ft('asSearchJobs')} className="ps-8" data-testid="input-job-search" />
      </div>
      <div className="max-h-[50vh] space-y-0.5 overflow-y-auto">
        {jobs.isPending && Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-11 w-full" />)}
        {jobs.isError && (
          <div className="space-y-2 p-2 text-xs text-destructive">
            <p>{errorMessage(jobs.error, t)}</p>
            <Button size="sm" variant="outline" onClick={() => jobs.refetch()}><RotateCw className="h-3.5 w-3.5" aria-hidden />{t('retry')}</Button>
          </div>
        )}
        {jobs.data?.results.length === 0 && <p className="p-2 text-xs text-muted-foreground">{ft('asNoJobs')}</p>}
        {jobs.data?.results.map((j) => (
          <button key={j.id} type="button" onClick={() => onSelect(j.id)} aria-pressed={selected === j.id} data-testid={`button-pick-job-${j.id}`}
            className={cn('w-full rounded-md px-2.5 py-2 text-start transition-colors', selected === j.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted')}>
            <JobNumber value={jobLabel(j)} className="text-xs" />
            <span className="block truncate text-sm">{j.title}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function JobAssistant({ jobId }: { jobId: number }) {
  const ft = useFt();
  const { t } = useI18n();
  const evidence = useEvidence(jobId);
  const panel = useAssistantPanel();
  const ut = useUt();
  if (evidence.isPending) return <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-48 w-full" /><Skeleton className="h-32 w-full" /></div>;
  if (evidence.isError) return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-sm" role="alert">
      <p>{evidence.error instanceof AuthError && evidence.error.status === 404 ? ft('asJobUnavailable') : errorMessage(evidence.error, t)}</p>
      <Button className="mt-3" size="sm" variant="outline" onClick={() => evidence.refetch()}><RotateCw className="h-4 w-4" aria-hidden />{t('retry')}</Button>
    </div>
  );
  const ev = evidence.data;
  return (
    <div className="space-y-6">
      <EvidencePanel ev={ev} />
      {panel.available && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => panel.openFor(jobId)} data-testid="button-ask-assistant"><Sparkles className="h-4 w-4" aria-hidden />{ut('asstAskThis')}</Button>
        </div>
      )}
    </div>
  );
}

function EvidencePanel({ ev }: { ev: Evidence }) {
  const ft = useFt();
  const kt = useKt();
  const { lang } = useI18n();
  const fmt = useFormatDate();
  return (
    <section className="overflow-hidden rounded-lg border bg-card" data-testid="panel-evidence">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-muted/40 px-5 py-3">
        <Database className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold">{ft('asEvidence')}</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary" data-testid="badge-not-ai">
          <ShieldCheck className="h-3 w-3" aria-hidden />{ft('asEvidenceBadge')}
        </span>
      </div>
      <div className="space-y-6 p-5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <JobNumber value={jobLabel(ev.job)} />
          <StatusBadge status={ev.job.status as JobStatus} />
          <span className="text-xs text-muted-foreground">{ft('asRevision', { r: ev.job.revision, m: ev.material_revision })}</span>
          <span className="ms-auto text-xs text-muted-foreground">{ft('asGenerated')} {fmt(ev.generated_at)}</span>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{ft('asFindings')}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{ft('asFindingsNote')}</p>
          {ev.calculated_findings ? (
            <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-4">
              {FINDINGS.map((k) => {
                const v = ev.calculated_findings![k] ?? null;
                const unit = k.endsWith('_rate') ? '%' : 'kg';
                return (
                  <div key={k} className="bg-card px-3 py-2.5" data-testid={`finding-${k}`}>
                    <dt className="text-[11px] text-muted-foreground">{ft(`f_${k}` as FKey)}</dt>
                    <dd className="font-mono text-sm tabular-nums" dir="ltr" style={{ textAlign: 'start' }}>{v ?? '—'}{v != null && <span className="ms-1 text-xs text-muted-foreground">{unit}</span>}</dd>
                  </div>
                );
              })}
            </dl>
          ) : null}
          {ev.calculated_findings?.created_at && <p className="mt-1.5 text-xs text-muted-foreground" data-testid="finding-created-at">{ft('f_created_at')}: {fmt(ev.calculated_findings.created_at)}</p>}
          {!ev.calculated_findings && <p className="mt-2 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">{ft('asNoFindings')}</p>}
          <p className="mt-2 text-xs text-muted-foreground" data-testid="text-definitions">{kt('defs')}</p>
          <div className="mt-3 rounded-md border bg-card px-3 py-2.5" data-testid="panel-largest-scrap">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{kt('largestScrap')}</p>
            {ev.largest_scrap_category ? (
              <p className="mt-1 text-sm"><span className={cn('font-medium', !ev.largest_scrap_category.reason?.trim() && 'italic text-muted-foreground')} data-testid="text-largest-scrap-reason">{scrapReasonText(ev.largest_scrap_category.reason, kt('unspecified'))}</span> <span className="font-mono tabular-nums" dir="ltr" data-testid="text-largest-scrap-qty">{ev.largest_scrap_category.quantity} kg</span></p>
            ) : <p className="mt-1 text-sm text-muted-foreground">{kt('noLargestScrap')}</p>}
            <p className="mt-1 text-xs text-muted-foreground">{kt('largestScrapNote')}</p>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{ft('asFacts')}</h3>
          {ev.recorded_facts.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{ft('asNoFacts')}</p> : (
            <div className="mt-2 overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <tbody>
                  {ev.recorded_facts.map((f) => (
                    <tr key={f.id} className={cn('border-b last:border-0', f.voided && 'text-muted-foreground line-through decoration-muted-foreground/50')} data-testid={`fact-${f.id}`}>
                      <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground" dir="ltr">{f.id}</td>
                      <td className="px-3 py-2">{f.kind.replace(/_/g, ' ')}{f.kind === 'scrap' && <span className={cn('ms-2 text-xs', !f.scrap_reason?.trim() && 'italic text-muted-foreground')} data-testid={`fact-reason-${f.id}`}>· {scrapReasonText(f.scrap_reason, kt('unspecified'))}</span>}{f.voided && <span className="ms-2 rounded bg-muted px-1.5 py-0.5 text-[10px] no-underline">{ft('asVoided')}</span>}</td>
                      <td className="px-3 py-2 text-end font-mono tabular-nums" dir="ltr">{f.quantity ?? ''} {f.unit ?? ''}</td>
                      <td className="hidden px-3 py-2 text-xs text-muted-foreground sm:table-cell">{f.created_at ? fmt(f.created_at) : ''}</td>
                      {f.note !== undefined && <td className="max-w-[16rem] truncate px-3 py-2 text-xs text-muted-foreground" title={f.note}>{f.note}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Ruler className="h-3.5 w-3.5" aria-hidden />{ft('asCutting')}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{ft('asCuttingNote')}</p>
          {ev.cutting.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{ft('asNoCutting')}</p> : (
            <div className="mt-2 space-y-2">{ev.cutting.map((c) => <CuttingCard key={`${c.plan_id}-${c.revision}`} plan={c} />)}</div>
          )}
        </div>

        {ev.limitations.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{ft('asLimitations')}</h3>
            <ul className="mt-1 list-disc space-y-0.5 ps-5 text-xs text-muted-foreground">{ev.limitations.map((l) => <li key={l}>{localizeLimitation(l, lang)}</li>)}</ul>
          </div>
        )}
      </div>
    </section>
  );
}

function CuttingCard({ plan }: { plan: CuttingEvidence }) {
  const ft = useFt();
  return (
    <div className="rounded-md border border-dashed p-3">
      <p className="text-sm font-medium">{plan.name} <span className="font-mono text-xs text-muted-foreground">r{plan.revision}</span></p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {plan.scenarios.map((s, i) => (
          <div key={s.key} className="rounded bg-muted/50 p-3 text-xs">
            <p className="mb-2 font-medium">{s.name || ft('asScenario', { n: i + 1 })}</p>
            {s.result ? <Metrics result={s.result} input={s.input} /> : <p className="text-muted-foreground">{ft('asNoMetrics')}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
