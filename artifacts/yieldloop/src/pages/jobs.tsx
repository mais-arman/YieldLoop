import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowRight, ChevronLeft, ChevronRight, ClipboardList, Plus, RotateCw, Scissors, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JOB_STATUSES, JobNumber, StatusBadge, jobErrorMessage, useFormatDate } from '@/components/job-ui';
import type { Employee } from '@/lib/auth';
import { useJobs, type JobStatus } from '@/lib/jobs';
import { useI18n, type MsgKey } from '@/lib/i18n';
import { useUt } from '@/lib/ui-i18n';
import { cn } from '@/lib/utils';

export default function JobsPage({ user }: { user: Employee }) {
  const { t } = useI18n();
  const [, navigate] = useLocation();
  const fmt = useFormatDate();
  const ut = useUt();
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
          <table className={cn('w-full text-sm transition-opacity xl:table-fixed', q.isFetching && 'opacity-70')}>
            <thead className="hidden border-b bg-muted/50 text-xs font-medium uppercase tracking-wider text-muted-foreground xl:table-header-group">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">{t('colJob')}</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">{t('colStatus')}</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">{t('colCreatedBy')}</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">{t('colUpdated')}</th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium"><span className="sr-only">{t('colActions')}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data?.results ?? []).map((j) => (
                <tr key={j.id} className="group flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-muted/40 xl:table-row xl:p-0">
                  <td className="min-w-0 flex-1 basis-full xl:px-4 xl:py-3">
                    <Link href={`/jobs/${j.id}`} data-testid={`row-job-${j.id}`} className="block min-w-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <JobNumber value={j.job_number} />
                      <span className={cn('block truncate text-sm font-medium group-hover:text-primary', j.status === 'cancelled' && 'text-muted-foreground')}>{j.title}</span>
                    </Link>
                  </td>
                  <td className="xl:px-4 xl:py-3"><StatusBadge status={j.status} /></td>
                  <td className="truncate text-xs text-muted-foreground xl:px-4 xl:py-3 xl:text-sm" dir="ltr" style={{ textAlign: 'start' }}>{j.created_by.username}</td>
                  <td className="text-xs text-muted-foreground xl:px-4 xl:py-3">{fmt(j.updated_at)}</td>
                  <td className="ms-auto xl:px-4 xl:py-3">
                    <div className="flex justify-end gap-1">
                      <Link href={`/jobs/${j.id}/cutting`} className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-2.5 text-xs font-medium hover:border-primary/40 hover:text-primary" data-testid={`link-job-cutting-${j.id}`}>
                        <Scissors className="h-3.5 w-3.5" aria-hidden />{ut('pageCutting')}
                      </Link>
                      <Link href={`/jobs/${j.id}`} aria-label={`${j.job_number}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" data-testid={`link-job-open-${j.id}`}>
                        <ArrowRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
