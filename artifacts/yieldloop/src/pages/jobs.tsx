import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ChevronLeft, ChevronRight, ClipboardList, Plus, RotateCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JOB_STATUSES, JobNumber, StatusBadge, jobErrorMessage, useFormatDate } from '@/components/job-ui';
import type { Employee } from '@/lib/auth';
import { useJobs, type JobStatus } from '@/lib/jobs';
import { useI18n, type MsgKey } from '@/lib/i18n';

export default function JobsPage({ user }: { user: Employee }) {
  const { t } = useI18n();
  const [, navigate] = useLocation();
  const fmt = useFormatDate();
  const isManager = user.role === 'manager';
  const isOperator = user.role === 'cutting_operator';
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<JobStatus | 'all'>('all');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const onSearch = (v: string) => {
    setSearchInput(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setSearch(v.trim()); setPage(1); }, 300);
  };

  const q = useJobs({ page, search: search || undefined, status: status === 'all' ? undefined : status });
  const data = q.data;
  const filtered = !!search || status !== 'all';
  const clear = () => { if (timer.current) clearTimeout(timer.current); setSearchInput(''); setSearch(''); setStatus('all'); setPage(1); };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">{t('jobsTitle')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{isOperator ? t('jobsSubtitleOperator') : t('jobsSubtitle')}</p>
        </div>
        {isManager && (
          <Button onClick={() => navigate('/jobs/new')} data-testid="button-new-job">
            <Plus className="h-4 w-4" aria-hidden />{t('newJob')}
          </Button>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" className="ps-9" placeholder={t('searchJobs')} aria-label={t('searchJobs')} value={searchInput} onChange={(e) => onSearch(e.target.value)} data-testid="input-search-jobs" />
        </div>
        {!isOperator && (
          <Select value={status} onValueChange={(v) => { setStatus(v as JobStatus | 'all'); setPage(1); }}>
            <SelectTrigger className="sm:w-44" aria-label={t('statusFilter')} data-testid="select-status-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allStatuses')}</SelectItem>
              {JOB_STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`status_${s}` as MsgKey)}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border bg-card">
        <div className="hidden grid-cols-[1fr_auto_10rem_10rem] gap-4 border-b bg-muted/50 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground md:grid">
          <span>{t('colJob')}</span><span className="w-24">{t('colStatus')}</span><span>{t('colCreatedBy')}</span><span className="text-end">{t('colUpdated')}</span>
        </div>
        {q.isPending ? (
          <ul className="divide-y" aria-busy>
            {[0, 1, 2, 3, 4].map((i) => (
              <li key={i} className="flex items-center gap-4 px-4 py-4">
                <div className="flex-1 space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-4 w-56 max-w-full" /></div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </li>
            ))}
          </ul>
        ) : q.isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center" role="alert">
            <p className="text-sm font-medium">{t('jobsLoadError')}</p>
            <p className="text-sm text-muted-foreground">{jobErrorMessage(q.error, t)}</p>
            <Button variant="outline" size="sm" onClick={() => q.refetch()} data-testid="button-retry-jobs">
              <RotateCw className="h-3.5 w-3.5" aria-hidden />{t('retry')}
            </Button>
          </div>
        ) : !data || data.results.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center" data-testid="empty-jobs">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground" aria-hidden><ClipboardList className="h-5 w-5" /></span>
            {filtered ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">{t('noJobMatches')}</p>
                <Button variant="ghost" size="sm" onClick={clear} data-testid="button-clear-filters">{t('clearFilters')}</Button>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm font-medium">{isOperator ? t('emptyJobsOperator') : t('emptyJobs')}</p>
                {!isOperator && <p className="text-sm text-muted-foreground">{isManager ? t('emptyJobsManager') : t('emptyJobsOther')}</p>}
                {isManager && (
                  <Button size="sm" className="mt-3" onClick={() => navigate('/jobs/new')}><Plus className="h-4 w-4" aria-hidden />{t('newJob')}</Button>
                )}
              </>
            )}
          </div>
        ) : (
          <ul className={q.isFetching ? 'divide-y opacity-70 transition-opacity' : 'divide-y transition-opacity'}>
            {(data?.results ?? []).map((j) => (
              <li key={j.id}>
                <Link href={`/jobs/${j.id}`} data-testid={`row-job-${j.id}`}
                  className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none md:grid-cols-[1fr_auto_10rem_10rem]">
                  <div className="min-w-0">
                    <JobNumber value={j.job_number} />
                    <div className={j.status === 'cancelled' ? 'truncate text-sm font-medium text-muted-foreground' : 'truncate text-sm font-medium'}>{j.title}</div>
                  </div>
                  <div className="md:w-24"><StatusBadge status={j.status} /></div>
                  <div className="col-span-2 truncate text-xs text-muted-foreground md:col-span-1 md:text-sm" dir="ltr" style={{ textAlign: 'start' }}>{j.created_by.username}</div>
                  <div className="hidden text-end text-xs text-muted-foreground md:block">{fmt(j.updated_at)}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {data && data.count > 0 && (
        <nav className="mt-4 flex items-center justify-between gap-3 text-sm" aria-label={t('pageOf', { page: data.page, total: data.total_pages })}>
          <span className="text-muted-foreground">{t('jobsCount', { n: data.count })} · {t('pageOf', { page: data.page, total: Math.max(1, data.total_pages) })}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label={t('prevPage')} disabled={page <= 1 || q.isFetching} onClick={() => setPage((p) => p - 1)} data-testid="button-prev-page">
              <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label={t('nextPage')} disabled={page >= data.total_pages || q.isFetching} onClick={() => setPage((p) => p + 1)} data-testid="button-next-page">
              <ChevronRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
