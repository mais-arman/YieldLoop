import { useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import type { CuttingInput, CuttingResult } from '@/lib/cutting';
import { useCt } from './cutting-i18n';

export interface CompareColumn { key: string; name: string; input: CuttingInput | null; result: CuttingResult | null; origin: string; materialName?: string }

/** Side-by-side inputs and results. Rows with missing input/result read as not available, never as stale numbers. */
export function CompareView({ columns }: { columns: CompareColumn[] }) {
  const ct = useCt();
  const scroll = useRef<HTMLDivElement>(null);
  const na = <span className="text-muted-foreground">{ct('na')}</span>;
  const iv = (f: (i: CuttingInput) => ReactNode) => (c: CompareColumn) => (c.input ? f(c.input) : na);
  const rv = (f: (r: CuttingResult) => ReactNode) => (c: CompareColumn) => (c.result ? f(c.result) : <span className="text-muted-foreground">{ct('stale')}</span>);
  const rows: [string, (c: CompareColumn) => ReactNode][] = [
    [ct('material'), iv((i) => <>{columns.find((c) => c.input === i)?.materialName || ''} <span className="font-mono text-muted-foreground">#{i.material_id}</span></>)],
    [ct('stockLabel'), iv((i) => i.stock_label)],
    [`${ct('width')} × ${ct('height')}`, iv((i) => <span className="font-mono" dir="ltr">{i.board.width} × {i.board.height} mm</span>)],
    [ct('boardQty'), iv((i) => <span className="font-mono">{i.board.quantity}</span>)],
    [ct('margins'), iv((i) => <span className="font-mono text-xs">{ct('margins4', { l: i.board.left, r: i.board.right, t: i.board.top, b: i.board.bottom })}</span>)],
    [ct('kerf'), iv((i) => <span className="font-mono">{i.kerf} mm</span>)],
    [ct('pieces'), iv((i) => (
      <ul className="space-y-0.5 text-xs">{i.pieces.map((p) => <li key={p.key}><span className="font-medium">{p.label}</span> <span className="font-mono" dir="ltr">{p.width}×{p.height} ×{p.quantity}</span> <span className="text-muted-foreground">{p.rotation_allowed ? ct('rotationYes') : ct('rotationNo')}</span></li>)}</ul>
    ))],
    [ct('layoutSource'), (c) => ct(c.origin === 'shelf_v1' ? 'origin_shelf_v1' : 'origin_manual')],
    [ct('m_utilization'), rv((r) => <span className="font-mono font-semibold">{r.utilization === null ? ct('na') : `${r.utilization} %`}</span>)],
    [ct('m_boards_used'), rv((r) => <span className="font-mono">{r.board_count} / {r.available_boards}</span>)],
    [ct('m_placed'), rv((r) => <span className="font-mono">{r.placed_count}</span>)],
    [ct('m_unplaced'), rv((r) => <span className="font-mono">{r.unplaced_count}</span>)],
    [ct('m_required_area'), rv((r) => <span className="font-mono text-xs">{r.required_area} mm²</span>)],
    [ct('m_placed_area'), rv((r) => <span className="font-mono text-xs">{r.placed_area} mm²</span>)],
    [ct('m_used_board_area'), rv((r) => <span className="font-mono text-xs">{r.used_board_area} mm²</span>)],
    [ct('m_unused_area'), rv((r) => <span className="font-mono text-xs">{r.unused_area} mm²</span>)],
    [ct('validLayout'), rv((r) => (r.valid ? ct('validLayout') : ct('invalidLayout')))],
  ];
  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{ct('compareScroll')}</span>
        <Button type="button" size="sm" variant="outline" onClick={() => scroll.current?.scrollBy({ left: -240, behavior: 'smooth' })}>{ct('scrollLeft')}</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => scroll.current?.scrollBy({ left: 240, behavior: 'smooth' })}>{ct('scrollRight')}</Button>
      </div>
    <div ref={scroll} tabIndex={0} role="region" aria-label={ct('compareTitle')} className="overflow-x-auto rounded-lg border bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" data-testid="table-compare">
      <table className="w-full min-w-[32rem] text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th scope="col" className="w-36 px-3 py-2 text-start text-xs font-medium text-muted-foreground" />
            {columns.map((c) => <th key={c.key} scope="col" className="px-3 py-2 text-start font-semibold">{c.name || ct('scenario')}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(([label, cell]) => (
            <tr key={label}>
              <th scope="row" className="px-3 py-2 text-start align-top text-xs font-medium text-muted-foreground">{label}</th>
              {columns.map((c) => <td key={c.key} className="px-3 py-2 align-top">{cell(c)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}
