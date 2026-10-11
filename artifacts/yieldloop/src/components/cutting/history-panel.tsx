import { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, History, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFormatDate } from '@/components/job-ui';
import { useCuttingHistory } from '@/lib/cutting';
import { useI18n } from '@/lib/i18n';
import { CompareView } from './compare-view';
import { useCt } from './cutting-i18n';
import { cn } from '@/lib/utils';

/** Read-only, paginated audit history. Never mutates. */
export function HistoryPanel({ jobId, planId }: { jobId: number; planId: number }) {
  const ct = useCt();
  const { t } = useI18n();
  const fmt = useFormatDate();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<number | null>(null);
  const q = useCuttingHistory(jobId, planId, page);
  return (
    <section className="rounded-lg border bg-card p-4" data-testid="panel-history">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4 text-muted-foreground" aria-hidden />{ct('history')}</h3>
      {q.isPending ? (
        <div className="mt-3 space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : q.isError ? (
        <div className="mt-3 flex items-center justify-between gap-2 text-sm" role="alert">
          <span className="text-destructive">{ct('historyError')}</span>
          <Button size="sm" variant="outline" onClick={() => q.refetch()}><RotateCw className="h-3.5 w-3.5" aria-hidden />{t('retry')}</Button>
        </div>
      ) : q.data.results.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{ct('historyEmpty')}</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-2">
          {q.data.results.map((h) => {
            const expanded = open === h.revision;
            return (
              <li key={h.revision} className="rounded-md border">
                <button type="button" className="flex w-full items-start gap-3 px-3 py-2.5 text-start hover:bg-muted/50" aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : h.revision)} data-testid={`button-history-${h.revision}`}>
                  <span className="mt-0.5 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{ct('revShort', { n: h.revision })}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-medium">{h.reason}</span>
                    <span className="block text-xs text-muted-foreground">{h.name} · {ct('historyBy', { actor: h.actor, time: fmt(h.created_at) })}</span>
                  </span>
                  <ChevronDown className={cn('mt-1 h-4 w-4 shrink-0 transition-transform', expanded && 'rotate-180')} aria-hidden />
                </button>
                {expanded && (
                  <div className="border-t p-3">
                    <CompareView columns={h.scenarios.map((s) => ({ key: s.key, name: s.name, input: s.input, result: s.result ?? null, origin: s.origin }))} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {q.data && q.data.total_pages > 1 && (
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{t('pageOf', { page: q.data.page, total: q.data.total_pages })}</span>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={page <= 1 || q.isFetching} onClick={() => setPage((p) => p - 1)} aria-label={t('prevPage')}><ChevronLeft className="h-4 w-4 rtl:-scale-x-100" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={page >= q.data.total_pages || q.isFetching} onClick={() => setPage((p) => p + 1)} aria-label={t('nextPage')}><ChevronRight className="h-4 w-4 rtl:-scale-x-100" /></Button>
          </div>
        </div>
      )}
    </section>
  );
}
