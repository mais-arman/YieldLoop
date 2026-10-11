import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { AlertTriangle, ArrowLeft, CheckCircle2, ExternalLink, GitCompare, RotateCw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { JobNumber, StatusBadge, jobErrorMessage } from '@/components/job-ui';
import type { Employee } from '@/lib/auth';
import { useJobs, type ProductionJob } from '@/lib/jobs';
import { comparisonVerdict, jobLabel, scrapReasonText, showsBothIds, signedDecimal, useComparison, useKt, type CKey, type JobComparison, type Kt } from '@/lib/core';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Side = JobComparison['left'];
const QTY = ['issued', 'good', 'scrap', 'offcut', 'variance'] as const;
const RATE = ['yield_rate', 'scrap_rate'] as const;

function parseId(v: string | null): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export default function ComparisonPage({ user }: { user: Employee }) {
  const kt = useKt();
  const { t } = useI18n();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(search);
  const left = parseId(params.get('left'));
  const right = parseId(params.get('right'));
  const set = (k: 'left' | 'right', id: number | null) => {
    const p = new URLSearchParams(search);
    if (id) p.set(k, String(id)); else p.delete(k);
    setLocation(`/comparison${p.toString() ? `?${p}` : ''}`, { replace: true });
  };
  const operatorOnlyOpen = user.role === 'cutting_operator';
  const q = useComparison(left, right);

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-reports">
        <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden />{t('navReports')}
      </Link>
      <header className="mt-4">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight" data-testid="text-page-title"><GitCompare className="h-6 w-6 text-primary" aria-hidden />{kt('cmpTitle')}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{kt('cmpSub')}</p>
      </header>

      <div className="mt-5 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
        <JobPicker label={kt('left')} value={left} other={right} onChange={(id) => set('left', id)} onlyOpen={operatorOnlyOpen} testId="left" />
        <JobPicker label={kt('right')} value={right} other={left} onChange={(id) => set('right', id)} onlyOpen={operatorOnlyOpen} testId="right" />
      </div>

      <div className="mt-5">
        {!left || !right ? (
          <Empty>{kt('pickPrompt')}</Empty>
        ) : left === right ? (
          <Empty>{kt('sameJob')}</Empty>
        ) : q.isPending ? (
          <div className="space-y-3" aria-busy><Skeleton className="h-12 w-full" /><Skeleton className="h-72 w-full" /></div>
        ) : q.isError || !q.data ? (
          <div className="rounded-lg border bg-card p-6 text-center" role="alert">
            <p className="font-semibold">{kt('loadError')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{jobErrorMessage(q.error, t)}</p>
            <Button variant="outline" className="mt-4" onClick={() => q.refetch()} data-testid="button-retry-comparison"><RotateCw className="h-4 w-4" aria-hidden />{t('retry')}</Button>
          </div>
        ) : <Result c={q.data} kt={kt} />}
      </div>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground" data-testid="text-comparison-empty">{children}</p>;
}

function JobPicker({ label, value, other, onChange, onlyOpen, testId }: { label: string; value: number | null; other: number | null; onChange: (id: number | null) => void; onlyOpen: boolean; testId: string }) {
  const kt = useKt();
  const [raw, setRaw] = useState('');
  const [term, setTerm] = useState('');
  const [selected, setSelected] = useState<ProductionJob | null>(null);
  useEffect(() => { const h = setTimeout(() => setTerm(raw.trim()), 250); return () => clearTimeout(h); }, [raw]);
  const q = useJobs({ page: 1, search: term || undefined, status: onlyOpen ? 'open' : undefined });
  const fromList = q.data?.results.find((j) => j.id === value) ?? null;
  const current = selected?.id === value ? selected : fromList;

  return (
    <section className="min-w-0 rounded-lg border bg-card p-4" aria-label={label} data-testid={`picker-${testId}`}>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h2>
      {value ? (
        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold" dir="ltr" style={{ textAlign: 'start' }} data-testid={`text-picked-${testId}`}>{current ? jobLabel(current) : `#${value}`}</p>
            {current && <p className="truncate text-sm text-muted-foreground">{current.title}</p>}
          </div>
          <Button size="sm" variant="ghost" onClick={() => { setSelected(null); onChange(null); }} aria-label="Clear" data-testid={`button-clear-${testId}`}><X className="h-4 w-4" aria-hidden /></Button>
        </div>
      ) : (
        <>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input type="search" value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={kt('pick')} className="ps-8" maxLength={120} data-testid={`input-search-${testId}`} />
          </div>
          <ul className="mt-2 max-h-56 divide-y overflow-y-auto rounded-md border">
            {q.isPending ? [0, 1, 2].map((i) => <li key={i} className="p-2"><Skeleton className="h-5 w-full" /></li>)
              : (q.data?.results ?? []).filter((j) => j.id !== other).length === 0 ? <li className="p-3 text-xs text-muted-foreground">{kt('noJobs')}</li>
              : q.data!.results.filter((j) => j.id !== other).map((j) => (
                <li key={j.id}>
                  <button type="button" onClick={() => { setSelected(j); onChange(j.id); }} className="flex w-full items-center gap-2 px-3 py-2 text-start hover:bg-muted/50" data-testid={`option-${testId}-${j.id}`}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm"><JobNumber value={jobLabel(j)} className="me-2 text-foreground" />{j.title}</span>
                      <span className="block text-xs text-muted-foreground">{j.machine || kt('machineUnset')}</span>
                    </span>
                    <StatusBadge status={j.status} />
                  </button>
                </li>
              ))}
          </ul>
        </>
      )}
    </section>
  );
}

const VERDICT: Record<ReturnType<typeof comparisonVerdict>, CKey> = {
  same: 'vSame', machine_missing: 'vMachineMissing', machine_mismatch: 'vMachineMismatch', material_mismatch: 'vMaterialMismatch', unmeasured: 'vUnmeasured',
};

function Result({ c, kt }: { c: JobComparison; kt: Kt }) {
  const verdict = comparisonVerdict(c);
  const ok = verdict === 'same';
  const d = c.differences;
  return (
    <div className="space-y-4" data-testid="panel-comparison">
      <p className={cn('flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm', ok ? 'border-[hsl(152_45%_38%/0.35)] bg-[hsl(152_45%_38%/0.07)]' : 'border-[hsl(38_92%_50%/0.4)] bg-[hsl(38_92%_50%/0.08)]')} role="status" data-testid={`text-verdict-${verdict}`}>
        {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(152_50%_30%)]" aria-hidden /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(32_81%_35%)]" aria-hidden />}
        {kt(VERDICT[verdict])}
      </p>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 text-start font-medium" />
              <SideHead s={c.left} label={kt('left')} kt={kt} />
              <SideHead s={c.right} label={kt('right')} kt={kt} />
              <th scope="col" className="px-3 py-2 text-end font-medium">{kt('diff')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <th scope="row" className="px-3 py-2 text-start font-medium">{kt('machine')}</th>
              <td className="px-3 py-2 text-end">{c.left.job.machine || <span className="text-muted-foreground">{kt('machineUnset')}</span>}</td>
              <td className="px-3 py-2 text-end">{c.right.job.machine || <span className="text-muted-foreground">{kt('machineUnset')}</span>}</td>
              <td />
            </tr>
            <tr>
              <th scope="row" className="px-3 py-2 text-start font-medium">{kt('material')}</th>
              <td className="px-3 py-2 text-end">{c.left.material?.name ?? '—'}</td>
              <td className="px-3 py-2 text-end">{c.right.material?.name ?? '—'}</td>
              <td />
            </tr>
            {QTY.map((k) => (
              <tr key={k} data-testid={`row-cmp-${k}`}>
                <th scope="row" className="px-3 py-2 text-start font-medium">{kt(k)}</th>
                <Val v={c.left.summary?.[k]} unit={kt('kg')} />
                <Val v={c.right.summary?.[k]} unit={kt('kg')} />
                <Diff v={d ? d[k] : null} unit={kt('kg')} testId={k} />
              </tr>
            ))}
            {RATE.map((k) => (
              <tr key={k} data-testid={`row-cmp-${k}`}>
                <th scope="row" className="px-3 py-2 text-start font-medium">{kt(k)}</th>
                <Val v={c.left.summary?.[k]} unit="%" />
                <Val v={c.right.summary?.[k]} unit="%" />
                <Diff v={d ? d[k] : null} unit={kt('pp')} testId={k} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{kt('ppNote')} {kt('defs')}</p>

      <div className="grid gap-4 md:grid-cols-2">
        <SideRecords s={c.left} label={kt('left')} kt={kt} />
        <SideRecords s={c.right} label={kt('right')} kt={kt} />
      </div>
    </div>
  );
}

function SideHead({ s, label, kt }: { s: Side; label: string; kt: Kt }) {
  return (
    <th scope="col" className="px-3 py-2 text-end font-medium">
      <span className="block text-[11px] uppercase tracking-wide">{label}</span>
      <Link href={`/jobs/${s.job.id}`} className="font-mono text-sm text-foreground hover:text-primary hover:underline" data-testid={`link-cmp-job-${s.job.id}`}>{jobLabel(s.job)}</Link>
      {showsBothIds(s.job) && <span className="block font-mono text-[11px]">{s.job.job_number}</span>}
      {s.job.is_demo && <span className="mt-0.5 block text-[11px] text-[hsl(262_40%_40%)]">{kt('demo')}</span>}
    </th>
  );
}

function Val({ v, unit }: { v: string | null | undefined; unit: string }) {
  return <td className="px-3 py-2 text-end font-mono tabular-nums" dir="ltr">{v == null ? <span className="text-muted-foreground">—</span> : <>{v} <span className="text-xs text-muted-foreground">{unit}</span></>}</td>;
}

function Diff({ v, unit, testId }: { v: string | null | undefined; unit: string; testId: string }) {
  const s = signedDecimal(v);
  return <td className="px-3 py-2 text-end font-mono font-semibold tabular-nums" dir="ltr" data-testid={`text-diff-${testId}`}>{s == null ? <span className="font-normal text-muted-foreground">—</span> : <>{s} <span className="text-xs font-normal text-muted-foreground">{unit}</span></>}</td>;
}

function SideRecords({ s, label, kt }: { s: Side; label: string; kt: Kt }) {
  return (
    <section className="rounded-lg border bg-card p-4" data-testid={`panel-records-${s.job.id}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{label} · <span className="font-mono">{jobLabel(s.job)}</span></h3>
        <StatusBadge status={s.job.status} />
      </div>
      <h4 className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{kt('scrapByReason')}</h4>
      {s.scrap_by_reason.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">{s.summary ? kt('noScrap') : kt('noSummary')}</p> : (
        <ul className="mt-1 divide-y rounded-md border">
          {s.scrap_by_reason.map((r, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className={cn(!r.reason?.trim() && 'italic text-muted-foreground')}>{scrapReasonText(r.reason, kt('unspecified'))}</span>
              <span className="font-mono tabular-nums" dir="ltr">{r.quantity} {kt('kg')} <span className="text-xs text-muted-foreground">· {kt('entries', { n: r.entry_ids.length })}</span></span>
            </li>
          ))}
        </ul>
      )}
      <h4 className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{kt('records')}</h4>
      <p className="mt-1 text-xs text-muted-foreground" dir="ltr" style={{ textAlign: 'start' }}>{s.entry_ids.length ? s.entry_ids.map((id) => `#${id}`).join(', ') : '—'}</p>
      <Link href={`/jobs/${s.job.id}#materials`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline" data-testid={`link-cmp-records-${s.job.id}`}>
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />{kt('openJob')}
      </Link>
    </section>
  );
}
