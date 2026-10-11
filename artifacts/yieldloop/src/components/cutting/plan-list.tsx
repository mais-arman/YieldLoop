import { useState } from 'react';
import { ChevronLeft, ChevronRight, FileStack, Plus, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFormatDate } from '@/components/job-ui';
import { useCuttingPlans } from '@/lib/cutting';
import { useI18n } from '@/lib/i18n';
import { useCt } from './cutting-i18n';
import { cn } from '@/lib/utils';

export function PlanList({ jobId, active, isNew, onOpen, onNew, writable }: {
  jobId: number; active: number | null; isNew: boolean; onOpen: (id: number) => void; onNew: () => void; writable: boolean;
}) {
  const ct = useCt();
  const { t } = useI18n();
  const fmt = useFormatDate();
  const [page, setPage] = useState(1);
  const q = useCuttingPlans(jobId, page);
  return (
    <nav aria-label={ct('plans')} className="flex flex-col gap-3 rounded-lg border bg-card p-3" data-testid="panel-plan-list">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-sm font-semibold">{ct('plans')}</h2>
        {writable && <Button size="sm" variant={isNew ? 'secondary' : 'outline'} onClick={onNew} data-testid="button-new-plan"><Plus className="h-3.5 w-3.5" aria-hidden />{ct('newPlan')}</Button>}
      </div>
      {q.isPending ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : q.isError ? (
        <div className="flex flex-col gap-2 p-1 text-sm" role="alert">
          <span className="text-destructive">{ct('plansLoadError')}</span>
          <Button size="sm" variant="outline" className="self-start" onClick={() => q.refetch()} data-testid="button-retry-plans"><RotateCw className="h-3.5 w-3.5" aria-hidden />{t('retry')}</Button>
        </div>
      ) : q.data.results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-2 py-6 text-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden><FileStack className="h-4 w-4" /></span>
          <p className="text-sm font-medium">{ct('noPlans')}</p>
          <p className="text-xs text-muted-foreground">{writable ? ct('noPlansWriter') : ct('noPlansReader')}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {q.data.results.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onOpen(p.id)} aria-current={active === p.id}
                className={cn('flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-start transition-colors hover:bg-muted/60', active === p.id && 'bg-primary/10 ring-1 ring-primary/30')}
                data-testid={`button-plan-${p.id}`}>
                <span className="break-words text-sm font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground"><span className="font-mono">{ct('revShort', { n: p.revision })}</span> · {fmt(p.updated_at)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.data && q.data.total_pages > 1 && (
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span>{t('pageOf', { page: q.data.page, total: q.data.total_pages })}</span>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={page <= 1 || q.isFetching} onClick={() => setPage((x) => x - 1)} aria-label={t('prevPage')}><ChevronLeft className="h-4 w-4 rtl:-scale-x-100" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={page >= q.data.total_pages || q.isFetching} onClick={() => setPage((x) => x + 1)} aria-label={t('nextPage')}><ChevronRight className="h-4 w-4 rtl:-scale-x-100" /></Button>
          </div>
        </div>
      )}
    </nav>
  );
}
