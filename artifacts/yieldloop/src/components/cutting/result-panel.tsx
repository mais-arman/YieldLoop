import { AlertTriangle, CheckCircle2, Loader2, RotateCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CuttingInput, CuttingResult } from '@/lib/cutting';
import { useCt } from './cutting-i18n';
import { readableDecimal, trimDecimal } from '@/lib/display-format';

export function Metrics({ result, input }: { result: CuttingResult; input: CuttingInput | null }) {
  const ct = useCt();
  const rows: [string, string, boolean?][] = [
    [ct('m_utilization'), result.utilization === null ? ct('na') : `${trimDecimal(result.utilization)} %`, true],
    [ct('m_boards_used'), String(result.board_count), true],
    [ct('m_boards_supplied'), String(result.available_boards)],
    [ct('m_placed'), String(result.placed_count), true],
    [ct('m_unplaced'), String(result.unplaced_count), true],
    [ct('m_required_area'), `${readableDecimal(result.required_area)} mm²`],
    [ct('m_placed_area'), `${readableDecimal(result.placed_area)} mm²`],
    [ct('m_board_area'), `${readableDecimal(result.board_area)} mm²`],
    [ct('m_used_board_area'), `${readableDecimal(result.used_board_area)} mm²`],
    [ct('m_unused_area'), `${readableDecimal(result.unused_area)} mm²`],
    [ct('m_available_area'), `${readableDecimal(result.available_area)} mm²`],
  ];
  const label = (k: string) => input?.pieces.find((p) => p.key === k)?.label ?? k;
  return (
    <div className="flex flex-col gap-3">
      <p className={`flex items-center gap-1.5 text-xs font-semibold ${result.valid ? 'text-primary' : 'text-destructive'}`}>
        {result.valid ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <XCircle className="h-3.5 w-3.5" aria-hidden />}
        {result.valid ? ct('validLayout') : ct('invalidLayout')}
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {rows.map(([k, v, big]) => (
          <div key={k} className="min-w-0">
            <dt className="text-[11px] text-muted-foreground">{k}</dt>
            <dd className={`font-mono tabular-nums ${big ? 'text-base font-semibold' : 'text-xs'}`} dir="ltr" style={{ textAlign: 'start' }}>{v}</dd>
          </div>
        ))}
      </dl>
      {result.unplaced.length > 0 && (
        <div>
          <p className="text-xs font-semibold">{ct('unplacedTypes')}</p>
          <ul className="mt-1 flex flex-col gap-1 text-xs">
            {result.unplaced.map((u) => (
              <li key={u.piece_key} className="flex flex-wrap gap-x-2 rounded bg-muted/60 px-2 py-1">
                <span className="font-medium">{label(u.piece_key)}</span><span className="font-mono">× {u.quantity}</span>
                <span className="text-muted-foreground">{ct(u.reason === 'cannot_fit' ? 'reason_cannot_fit' : 'reason_not_placed')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ResultPanel({ result, input, status, onRetry, readOnly, errorMsg }: {
  result: CuttingResult | null; input: CuttingInput | null; status: 'idle' | 'evaluating' | 'error';
  onRetry: () => void; readOnly: boolean; errorMsg: string | null;
}) {
  const ct = useCt();
  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4" aria-live="polite" data-testid="panel-result">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{readOnly ? ct('savedResult') : ct('results')}</h3>
        {status === 'evaluating' && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" aria-hidden />{ct('validating')}</span>}
      </div>
      {result ? <Metrics result={result} input={input} /> : status === 'error' ? (
        <div className="flex flex-col gap-2" role="alert">
          <p className="text-sm font-medium text-destructive">{ct('evalError')}</p>
          {errorMsg && <p className="text-xs text-muted-foreground">{errorMsg}</p>}
          <Button type="button" size="sm" variant="outline" className="self-start" onClick={onRetry} data-testid="button-retry-eval"><RotateCw className="h-3.5 w-3.5" aria-hidden />{ct('retryEval')}</Button>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2.5" data-testid="text-result-stale">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <p className="text-sm font-medium">{readOnly ? ct('noResult') : ct('stale')}</p>
            {!readOnly && <p className="text-xs text-muted-foreground">{ct('staleHint')}</p>}
          </div>
        </div>
      )}
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">{ct('definitions')}</summary>
        <ul className="mt-2 list-disc space-y-1 ps-4">{(['d1', 'd2', 'd3', 'd4', 'd5'] as const).map((k) => <li key={k}>{ct(k)}</li>)}</ul>
      </details>
      <p className="text-[11px] text-muted-foreground">{ct('compatNote')}</p>
    </section>
  );
}
