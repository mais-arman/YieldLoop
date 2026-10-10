import { useEffect, useRef, useState } from 'react';
import { Link, useSearch } from 'wouter';
import { Boxes, ChevronLeft, ChevronRight, Loader2, RotateCw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useFormatDate } from '@/components/job-ui';
import { Kg, LotStateBadge, ReuseBlockedNotice } from '@/components/inventory-ui';
import { invErrorMessage } from '@/components/materials/mat-utils';
import { useInventory } from '@/lib/inventory';
import { useI18n, type MsgKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type StateF = 'available' | 'voided' | undefined;

export default function InventoryPage() {
  const { t } = useI18n();
  const fmt = useFormatDate();
  const qs = new URLSearchParams(useSearch());
  const jobParam = Number(qs.get('job_id')) || undefined;
  const [jobId, setJobId] = useState<number | undefined>(jobParam);
  const [page, setPage] = useState(1);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [state, setState] = useState<StateF>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setJobId(jobParam); setPage(1); }, [jobParam]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onSearch = (v: string) => {
    setInput(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setSearch(v.trim()); setPage(1); }, 300);
  };

  const q = useInventory({ page, search: search || undefined, state, job_id: jobId });
  const d = q.data;
  const filtered = !!(search || state || jobId);
  const clear = () => { setInput(''); setSearch(''); setState(undefined); setJobId(undefined); setPage(1); };

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-semibold" data-testid="text-page-title"><Boxes className="h-5 w-5 text-primary" aria-hidden />{t('invTitle')}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t('invSubtitle')}</p>
      </header>
      <ReuseBlockedNotice />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" value={input} onChange={(e) => onSearch(e.target.value)} placeholder={t('invSearch')} aria-label={t('invSearch')} className="ps-9" data-testid="input-inventory-search" />
        </div>
        <div className="flex rounded-md border bg-card p-0.5" role="radiogroup" aria-label={t('invState')}>
          {([undefined, 'available', 'voided'] as StateF[]).map((s) => (
            <button key={s ?? 'all'} type="button" role="radio" aria-checked={state === s} onClick={() => { setState(s); setPage(1); }}
              className={cn('rounded px-3 py-1.5 text-sm font-medium transition-colors', state === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
              data-testid={`filter-state-${s ?? 'all'}`}>
              {s ? t(`state_${s}` as MsgKey) : t('invAllStates')}
            </button>
          ))}
        </div>
      </div>

      {jobId && (
        <div className="flex items-center gap-2 self-start rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground" data-testid="chip-job-filter">
          {t('invFilteredJob', { id: jobId })}
          <button type="button" onClick={() => { setJobId(undefined); setPage(1); }} aria-label={t('invClear')} data-testid="button-clear-job"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      <section className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-2.5 text-xs text-muted-foreground">
          <span data-testid="text-inventory-count">{d ? t('invCount', { n: d.count }) : '\u00a0'}</span>
          {q.isFetching && !q.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label={t('checking')} />}
        </div>
        {q.isPending ? (
          <div className="space-y-2 p-4" aria-busy>{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : q.isError && !d ? (
          <div className="p-8 text-center" role="alert">
            <p className="text-sm font-medium">{t('invLoadError')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{invErrorMessage(q.error, t)}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => q.refetch()} data-testid="button-retry-inventory"><RotateCw className="h-3.5 w-3.5" aria-hidden />{t('retry')}</Button>
          </div>
        ) : d && d.results.length === 0 ? (
          <div className="flex flex-col items-center p-10 text-center" data-testid="panel-inventory-empty">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground" aria-hidden><Boxes className="h-5 w-5" /></span>
            <p className="mt-3 text-sm font-medium">{filtered ? t('invNoMatch') : t('invEmpty')}</p>
            {!filtered && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{t('invEmptyDesc')}</p>}
            {filtered && <Button variant="outline" size="sm" className="mt-4" onClick={clear} data-testid="button-clear-filters">{t('invClear')}</Button>}
          </div>
        ) : d ? (
          <ul className="divide-y">
            {d.results.map((l) => (
              <li key={l.id}>
                <Link href={`/inventory/${l.id}`} className={cn('flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:gap-4', l.state === 'voided' && 'opacity-70')} data-testid={`link-lot-${l.id}`}>
                  <div className="flex items-center gap-3 sm:w-40 sm:shrink-0">
                    <span className="font-mono text-xs text-muted-foreground" dir="ltr">#{l.id}</span>
                    <LotStateBadge state={l.state} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.material_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{l.specification}</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground sm:justify-end">
                    <span dir="ltr" className="font-mono">{l.source_job_number}</span>
                    <span>{fmt(l.created_at)}</span>
                    <Kg v={l.remaining} className={cn('text-sm font-semibold text-foreground', l.state === 'voided' && 'line-through')} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {d && d.total_pages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
            <span>{t('pageOf', { page: d.page, total: d.total_pages })}</span>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page <= 1 || q.isFetching} onClick={() => setPage(page - 1)} aria-label={t('prevPage')} data-testid="button-inventory-prev"><ChevronLeft className="h-4 w-4 rtl:-scale-x-100" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page >= d.total_pages || q.isFetching} onClick={() => setPage(page + 1)} aria-label={t('nextPage')} data-testid="button-inventory-next"><ChevronRight className="h-4 w-4 rtl:-scale-x-100" /></Button>
            </div>
          </div>
        )}
      </section>
      <p className="text-xs text-muted-foreground">{t('invAvailableHint')}</p>
    </div>
  );
}
