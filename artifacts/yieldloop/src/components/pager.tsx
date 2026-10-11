import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { pagerState } from '@/lib/role-access';
import { useUt } from '@/lib/ui-i18n';
import { cn } from '@/lib/utils';

/** Shared Previous/Next pager. Server paging is preserved; hidden on a single page. */
export function Pager({ page, totalPages, onPage, busy = false, testId = 'page', className }: {
  page: number; totalPages: number; onPage: (p: number) => void; busy?: boolean; testId?: string; className?: string;
}) {
  const { t } = useI18n();
  const ut = useUt();
  const st = pagerState(page, totalPages);
  if (!st.visible) return null;
  return (
    <nav aria-label={ut('pagination')} className={cn('flex items-center justify-end gap-1.5', className)} data-testid={`pager-${testId}`}>
      <Button type="button" size="icon" variant="outline" className="h-8 w-8" disabled={busy || !st.canPrev} onClick={() => onPage(page - 1)} aria-label={t('prevPage')} data-testid={`button-${testId}-prev`}>
        <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
      </Button>
      <span className="min-w-[3.5rem] text-center font-mono text-xs tabular-nums text-muted-foreground" dir="ltr" aria-live="polite" data-testid={`text-${testId}-indicator`}>
        {ut('pageIndicator', { p: page, n: st.total })}
      </span>
      <Button type="button" size="icon" variant="outline" className="h-8 w-8" disabled={busy || !st.canNext} onClick={() => onPage(page + 1)} aria-label={t('nextPage')} data-testid={`button-${testId}-next`}>
        <ChevronRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
      </Button>
    </nav>
  );
}
