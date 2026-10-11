import { Pager } from '@/components/pager';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { ChevronRight, ClipboardList, RotateCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { JobNumber, StatusBadge, jobErrorMessage } from '@/components/job-ui';
import { useJobs } from '@/lib/jobs';
import { useI18n } from '@/lib/i18n';
import { useCt } from '@/components/cutting/cutting-i18n';
import { jobLabel } from '@/lib/core-helpers';

export default function CuttingEntryPage() {
  const { t } = useI18n();
  const ct = useCt();
  const [raw, setRaw] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const q = useJobs({ page, search: search || undefined });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">{ct('studioTitle')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{ct('entrySubtitle')}</p>
      <p className="mt-1 text-xs text-muted-foreground">{ct('studioScope')}</p>
      <div className="relative mt-6">
        <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input type="search" value={raw} placeholder={ct('entrySearch')} aria-label={ct('entrySearch')} className="ps-8" maxLength={120} data-testid="input-cutting-job-search"
          onChange={(e) => { const v = e.target.value; setRaw(v); clearTimeout(timer.current); timer.current = setTimeout(() => { setSearch(v.trim()); setPage(1); }, 300); }} />
      </div>
      <div className="mt-4">
        {q.isPending ? (
          <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : q.isError ? (
          <div className="rounded-lg border bg-card p-6 text-center" role="alert">
            <p className="text-sm font-semibold">{ct('entryLoadError')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{jobErrorMessage(q.error, t)}</p>
            <Button className="mt-4" size="sm" variant="outline" onClick={() => q.refetch()} data-testid="button-retry-jobs"><RotateCw className="h-3.5 w-3.5" aria-hidden />{t('retry')}</Button>
          </div>
        ) : q.data.results.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-14 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden><ClipboardList className="h-5 w-5" /></span>
            <p className="text-sm font-semibold">{search ? t('noJobMatches') : ct('entryEmpty')}</p>
            <p className="text-xs text-muted-foreground">{ct('entryEmptyDesc')}</p>
          </div>
        ) : (
          <ul className="divide-y overflow-hidden rounded-lg border bg-card">
            {q.data.results.map((j) => (
              <li key={j.id}>
                <Link href={`/jobs/${j.id}/cutting`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50" data-testid={`link-cutting-job-${j.id}`}>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2"><JobNumber value={jobLabel(j)} className="text-xs" /><StatusBadge status={j.status} /></span>
                    <span className="mt-1 block break-words text-sm font-medium">{j.title}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:-scale-x-100" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      {q.data && <Pager page={q.data.page} totalPages={q.data.total_pages} onPage={setPage} busy={q.isFetching} testId="cutting-entry" />}
    </div>
  );
}
