import {
  databaseReadiness,
  healthCheck,
  useDatabaseReadiness,
  useHealthCheck,
  getDatabaseReadinessQueryKey,
  getHealthCheckQueryKey,
} from '@workspace/api-client-react';
import { CheckCircle2, CircleAlert, Database, Languages, Loader2, RotateCw, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n, type MsgKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export const REQUEST_TIMEOUT_MS = 8000;
const TIMEOUT_S = REQUEST_TIMEOUT_MS / 1000;

function withTimeout(signal: AbortSignal) {
  return AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]);
}

type Phase = 'checking' | 'ok' | 'failed';
type CheckView = {
  phase: Phase;
  detail: string;
  httpCode: number | null;
  checkedAt: number | null;
};

function describeError(err: unknown, t: (k: MsgKey, v?: Record<string, string | number>) => string, dbUnavailable = false) {
  const status = typeof err === 'object' && err !== null && (err as { name?: unknown }).name === 'ApiError'
    ? (err as { status?: unknown }).status
    : undefined;
  if (typeof status === 'number') {
    if (dbUnavailable && status === 503) return { detail: t('dbUnavailable'), code: status };
    return { detail: t('httpError', { code: status }), code: status };
  }
  if (err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
    return { detail: t('timeout', { s: TIMEOUT_S }), code: null };
  }
  return { detail: t('network'), code: null };
}

function useApiCheck(): CheckView & { retry: () => void } {
  const { t } = useI18n();
  const q = useHealthCheck({
    query: {
      queryKey: getHealthCheckQueryKey(),
      queryFn: ({ signal }) => healthCheck({ signal: withTimeout(signal) }),
      retry: false,
      staleTime: 0,
      gcTime: 0,
      refetchOnWindowFocus: false,
    },
  });
  const retry = () => void q.refetch();
  if (q.isFetching || q.isPending) return { phase: 'checking', detail: t('checkingDetail'), httpCode: null, checkedAt: null, retry };
  if (q.isError) {
    const e = describeError(q.error, t);
    return { phase: 'failed', detail: e.detail, httpCode: e.code, checkedAt: q.errorUpdatedAt, retry };
  }
  if (q.data?.status === 'ok') return { phase: 'ok', detail: t('okApi'), httpCode: 200, checkedAt: q.dataUpdatedAt, retry };
  return { phase: 'failed', detail: t('unexpected'), httpCode: 200, checkedAt: q.dataUpdatedAt, retry };
}

function useDbCheck(): CheckView & { retry: () => void } {
  const { t } = useI18n();
  const q = useDatabaseReadiness({
    query: {
      queryKey: getDatabaseReadinessQueryKey(),
      queryFn: ({ signal }) => databaseReadiness({ signal: withTimeout(signal) }),
      retry: false,
      staleTime: 0,
      gcTime: 0,
      refetchOnWindowFocus: false,
    },
  });
  const retry = () => void q.refetch();
  if (q.isFetching || q.isPending) return { phase: 'checking', detail: t('checkingDetail'), httpCode: null, checkedAt: null, retry };
  if (q.isError) {
    const e = describeError(q.error, t, true);
    return { phase: 'failed', detail: e.detail, httpCode: e.code, checkedAt: q.errorUpdatedAt, retry };
  }
  if (q.data?.status === 'ready' && q.data.database === 'connected') {
    return { phase: 'ok', detail: t('okDb'), httpCode: 200, checkedAt: q.dataUpdatedAt, retry };
  }
  return { phase: 'failed', detail: t('unexpected'), httpCode: 200, checkedAt: q.dataUpdatedAt, retry };
}

const tone: Record<Phase, { rail: string; chip: string; icon: typeof CheckCircle2 }> = {
  checking: { rail: 'bg-primary/30', chip: 'bg-secondary text-muted-foreground border-border', icon: Loader2 },
  ok: { rail: 'bg-[hsl(var(--success))]', chip: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.25)]', icon: CheckCircle2 },
  failed: { rail: 'bg-destructive', chip: 'bg-destructive/10 text-destructive border-destructive/25', icon: CircleAlert },
};

function CheckRow({ id, icon: Icon, title, desc, endpoint, view }: {
  id: string;
  icon: typeof Server;
  title: string;
  desc: string;
  endpoint: string;
  view: CheckView & { retry: () => void };
}) {
  const { t, formatTime } = useI18n();
  const s = tone[view.phase];
  const StatusIcon = s.icon;
  const label = view.phase === 'checking' ? t('checking') : view.phase === 'ok' ? t('ok') : t('failed');
  return (
    <section
      data-testid={`card-${id}`}
      aria-busy={view.phase === 'checking'}
      className="relative overflow-hidden rounded-lg border bg-card"
    >
      <div className={cn('absolute inset-y-0 start-0 w-1 transition-colors', s.rail)} aria-hidden />
      {view.phase === 'checking' && (
        <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden" aria-hidden>
          <div className="yl-sweep h-full w-1/3 bg-primary/60" />
        </div>
      )}
      <div className="flex flex-col gap-5 p-5 ps-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
            <p data-testid={`text-${id}-detail`} role="status" aria-live="polite" className="mt-3 text-sm">
              {view.detail}
            </p>
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <div className="flex gap-1.5">
                <dt>{t('endpoint')}</dt>
                <dd dir="ltr" className="font-mono text-foreground/80">GET {endpoint}</dd>
              </div>
              {view.httpCode !== null && (
                <div className="flex gap-1.5">
                  <dt>{t('httpStatus')}</dt>
                  <dd data-testid={`text-${id}-http`} dir="ltr" className="font-mono text-foreground/80">{view.httpCode}</dd>
                </div>
              )}
              {view.checkedAt ? (
                <div className="flex gap-1.5">
                  <dt>{t('checkedAt')}</dt>
                  <dd className="font-mono text-foreground/80">{formatTime(view.checkedAt)}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
          <span
            data-testid={`status-${id}`}
            data-state={view.phase}
            className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', s.chip)}
          >
            <StatusIcon className={cn('h-3.5 w-3.5', view.phase === 'checking' && 'animate-spin motion-reduce:animate-none')} aria-hidden />
            {label}
          </span>
          {view.phase === 'failed' && (
            <Button data-testid={`button-retry-${id}`} variant="outline" size="sm" onClick={view.retry}>
              <RotateCw className="h-3.5 w-3.5" aria-hidden />
              {t('retry')}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

export default function ConnectivityPage() {
  const { t, lang, setLang } = useI18n();
  const api = useApiCheck();
  const db = useDbCheck();
  const busy = api.phase === 'checking' || db.phase === 'checking';
  const okCount = [api, db].filter((v) => v.phase === 'ok').length;
  const summary = busy ? t('summaryChecking') : okCount === 2 ? t('summaryOk') : okCount === 1 ? t('summaryPartial') : t('summaryDown');
  const summaryPhase: Phase = busy ? 'checking' : okCount === 2 ? 'ok' : 'failed';

  return (
    <div className="min-h-[100dvh] w-full bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 32 32" className="h-8 w-8 text-primary" aria-hidden>
              <rect width="32" height="32" rx="7" fill="hsl(222 47% 11%)" />
              <path d="M9 21a7 7 0 1 1 7 0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M16 21l3-3m-3 3l-3-3" fill="none" stroke="hsl(160 84% 39%)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <div className="leading-tight">
              <div className="text-sm font-semibold" dir="ltr">{t('brand')}</div>
              <div className="text-xs text-muted-foreground">{t('phase')}</div>
            </div>
          </div>
          <Button
            data-testid="button-switch-language"
            variant="ghost"
            size="sm"
            aria-label={t('switchLangLabel')}
            lang={lang === 'en' ? 'ar' : 'en'}
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
          >
            <Languages className="h-4 w-4" aria-hidden />
            {t('switchLang')}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <h1 data-testid="text-page-title" className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('subtitle')}</p>
          </div>
          <Button
            data-testid="button-check-all"
            onClick={() => {
              api.retry();
              db.retry();
            }}
            disabled={busy}
          >
            <RotateCw className={cn('h-4 w-4', busy && 'animate-spin motion-reduce:animate-none')} aria-hidden />
            {t('retryAll')}
          </Button>
        </div>

        <div className="mt-8 flex items-center gap-2 text-sm" data-testid="status-summary" data-state={summaryPhase}>
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              summaryPhase === 'ok' ? 'bg-[hsl(var(--success))]' : summaryPhase === 'failed' ? 'bg-destructive' : 'bg-muted-foreground/50',
            )}
            aria-hidden
          />
          <span className="font-medium">{summary}</span>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <CheckRow id="api" icon={Server} title={t('apiTitle')} desc={t('apiDesc')} endpoint="/api/healthz" view={api} />
          <CheckRow id="database" icon={Database} title={t('dbTitle')} desc={t('dbDesc')} endpoint="/api/v1/health/ready" view={db} />
        </div>

        <p className="mt-8 text-xs text-muted-foreground">{t('footer', { s: TIMEOUT_S })}</p>
      </main>
    </div>
  );
}
