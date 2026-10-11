import { useState } from 'react';
import { FolderOpen, History, Loader2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pager } from '@/components/pager';
import { useFormatDate } from '@/components/job-ui';
import { useFt } from '@/lib/feature-i18n';
import { useI18n } from '@/lib/i18n';
import { errorMessage } from '@/lib/session';
import { usePackagingDesignHistory, usePackagingDesigns, type PackagingDesignRecord } from '@/lib/packaging-designs';
import type { PackagingDesign } from '@/lib/packaging-templates';
import { cn } from '@/lib/utils';

const dimsLine = (d: PackagingDesign) => `${d.parameters.length ?? '?'} × ${d.parameters.width ?? '?'} × ${d.parameters.height ?? '?'} mm`;

export function SavedConcepts({ activeId, opening, onOpen, tplLabel, onLoadRevision }: {
  activeId: number | null; opening: number | null; onOpen: (id: number) => void; tplLabel: (id: PackagingDesign['template']) => string;
  onLoadRevision: (rec: { id: number; design: PackagingDesign }) => void;
}) {
  const ft = useFt();
  const { t } = useI18n();
  const fmt = useFormatDate();
  const [page, setPage] = useState(1);
  const [historyFor, setHistoryFor] = useState<PackagingDesignRecord | null>(null);
  const q = usePackagingDesigns(page);
  return (
    <section className="rounded-lg border bg-card" data-testid="panel-saved-concepts">
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <FolderOpen className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold">{ft('pkLibrary')}</h2>
        {q.data && <span className="font-mono text-xs text-muted-foreground">{q.data.count}</span>}
      </header>
      {q.isPending ? <div className="space-y-2 p-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
      : q.isError ? (
        <div className="p-5 text-center text-sm" role="alert">
          <p>{ft('pkLibraryError')} <span className="text-muted-foreground">{errorMessage(q.error, t)}</span></p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => q.refetch()}><RotateCw className="h-3.5 w-3.5" aria-hidden />{ft('pkRetry')}</Button>
        </div>
      ) : !q.data.results.length ? (
        <p className="p-6 text-center text-sm text-muted-foreground" data-testid="text-library-empty">{ft('pkLibraryEmpty')}</p>
      ) : (
        <ul className="divide-y">
          {q.data.results.map((r) => (
            <li key={r.id} className={cn('flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center', activeId === r.id && 'bg-accent/50')} data-testid={`row-design-${r.id}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" dir="auto">{r.design.name}</p>
                <p className="text-xs text-muted-foreground">
                  {tplLabel(r.design.template)} · <span dir="ltr" className="font-mono">{dimsLine(r.design)}</span> · {ft('pkRevision', { r: r.revision })} · {fmt(r.updated_at)}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setHistoryFor(r)} data-testid={`button-history-${r.id}`}><History className="h-3.5 w-3.5" aria-hidden />{ft('pkHistory')}</Button>
                <Button size="sm" variant="outline" disabled={opening !== null} onClick={() => onOpen(r.id)} data-testid={`button-open-${r.id}`}>
                  {opening === r.id && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}{ft('pkOpen')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {q.data && <Pager page={page} totalPages={q.data.total_pages} onPage={setPage} busy={q.isFetching} testId="designs" className="border-t p-2" />}
      {historyFor && <HistoryDialog rec={historyFor} onClose={() => setHistoryFor(null)} tplLabel={tplLabel} onLoad={(d) => { onLoadRevision({ id: historyFor.id, design: d }); setHistoryFor(null); }} />}
    </section>
  );
}

function HistoryDialog({ rec, onClose, tplLabel, onLoad }: { rec: PackagingDesignRecord; onClose: () => void; tplLabel: (id: PackagingDesign['template']) => string; onLoad: (d: PackagingDesign) => void }) {
  const ft = useFt();
  const { t } = useI18n();
  const fmt = useFormatDate();
  const [page, setPage] = useState(1);
  const q = usePackagingDesignHistory(rec.id, page);
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto" data-testid="dialog-design-history">
        <DialogHeader>
          <DialogTitle>{ft('pkHistoryTitle')}</DialogTitle>
          <DialogDescription dir="auto">{rec.design.name}</DialogDescription>
        </DialogHeader>
        {q.isPending ? <Skeleton className="h-24 w-full" /> : q.isError ? (
          <div className="text-sm" role="alert">{errorMessage(q.error, t)} <Button size="sm" variant="outline" onClick={() => q.refetch()}>{ft('pkRetry')}</Button></div>
        ) : !q.data.results.length ? <p className="text-sm text-muted-foreground">{ft('pkHistoryEmpty')}</p> : (
          <ol className="relative space-y-4 border-s ps-4">
            {q.data.results.map((h) => (
              <li key={h.revision} className="relative" data-testid={`row-design-rev-${h.revision}`}>
                <span className="absolute -start-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary" aria-hidden />
                <p className="text-sm font-semibold">{ft('pkRevision', { r: h.revision })} <span className="font-normal text-muted-foreground">· {h.actor} · {fmt(h.created_at)}</span></p>
                <p className="text-xs text-muted-foreground">{tplLabel(h.design.template)} · {ft(`st_${h.design.state}`)} · <span dir="ltr" className="font-mono">{dimsLine(h.design)}</span></p>
                {h.reason && <p className="mt-1 whitespace-pre-wrap break-words text-sm" dir="auto">{h.reason}</p>}
                <Button size="sm" variant="ghost" className="mt-1 h-7 px-2 text-xs" onClick={() => onLoad(h.design)} data-testid={`button-load-rev-${h.revision}`}>{ft('pkRestore')}</Button>
              </li>
            ))}
          </ol>
        )}
        {q.data && <Pager page={page} totalPages={q.data.total_pages} onPage={setPage} busy={q.isFetching} testId="design-history" />}
      </DialogContent>
    </Dialog>
  );
}
