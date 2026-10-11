import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CuttingInput, Placement } from '@/lib/cutting';
import { colorFor, fmtNum, pid, pieceDims } from './model';
import { useCt } from './cutting-i18n';
import { cn } from '@/lib/utils';

interface Props {
  input: CuttingInput; placements: Placement[]; board: number; onBoard: (b: number) => void;
  selected: string | null; onSelect: (id: string | null) => void; readOnly: boolean;
  /** Returns true if accepted. Coordinates are board-model millimetres. */
  onMove: (p: Placement, x: number, y: number) => boolean;
  onRotate: (p: Placement) => void; onRemove: (p: Placement) => void;
}

export function BoardCanvas({ input, placements, board, onBoard, selected, onSelect, readOnly, onMove, onRotate, onRemove }: Props) {
  const ct = useCt();
  const svg = useRef<SVGSVGElement>(null);
  const W = Number(input.board.width), H = Number(input.board.height);
  const M = { l: Number(input.board.left), r: Number(input.board.right), t: Number(input.board.top), b: Number(input.board.bottom) };
  const pad = Math.max(W, H) * 0.08;
  const fs = Math.max(W, H) / 42;
  const [zoom, setZoom] = useState(1);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number; x: number; y: number; moved: boolean } | null>(null);

  const selP = placements.find((p) => pid(p) === selected && p.board === board);
  const fullW = W + pad * 2, fullH = H + pad * 2;
  const vw = fullW / zoom, vh = fullH / zoom;
  let cx = W / 2, cy = H / 2;
  if (zoom > 1 && selP) { const d = pieceDims(input, selP); cx = Number(selP.x) + d.w / 2; cy = Number(selP.y) + d.h / 2; }
  const vx = zoom === 1 ? -pad : Math.min(Math.max(cx - vw / 2, -pad), W + pad - vw);
  const vy = zoom === 1 ? -pad : Math.min(Math.max(cy - vh / 2, -pad), H + pad - vh);

  const toModel = (e: PointerEvent) => {
    const el = svg.current!;
    const pt = el.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const m = el.getScreenCTM();
    const r = m ? pt.matrixTransform(m.inverse()) : pt;
    return { x: r.x, y: r.y };
  };

  const down = (e: PointerEvent, p: Placement) => {
    onSelect(pid(p));
    if (readOnly) return;
    const m = toModel(e);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDrag({ id: pid(p), dx: m.x - Number(p.x), dy: m.y - Number(p.y), x: Number(p.x), y: Number(p.y), moved: false });
  };
  const move = (e: PointerEvent) => {
    if (!drag) return;
    const m = toModel(e);
    setDrag({ ...drag, x: Math.max(0, m.x - drag.dx), y: Math.max(0, m.y - drag.dy), moved: true });
  };
  const up = () => {
    if (!drag) return;
    const p = placements.find((q) => pid(q) === drag.id);
    if (p && drag.moved) onMove(p, Math.round(drag.x * 1000) / 1000, Math.round(drag.y * 1000) / 1000);
    setDrag(null);
  };

  const key = (e: KeyboardEvent, p: Placement) => {
    if (readOnly) return;
    const step = e.shiftKey ? 10 : 1;
    const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (d[e.key]) {
      e.preventDefault();
      onMove(p, Math.max(0, Number(p.x) + d[e.key][0]), Math.max(0, Number(p.y) + d[e.key][1]));
    } else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); onRotate(p); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); onRemove(p); }
  };

  const onBoardItems = placements.filter((p) => p.board === board);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {input.board.quantity > 1 && (
          <div className="flex flex-wrap gap-1" role="tablist" aria-label={ct('board')}>
            {Array.from({ length: input.board.quantity }, (_, i) => {
              const n = placements.filter((p) => p.board === i).length;
              return (
                <button key={i} type="button" role="tab" aria-selected={board === i} onClick={() => onBoard(i)}
                  className={cn('rounded-md border px-2.5 py-1 text-xs font-medium transition-colors', board === i ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted')}
                  data-testid={`tab-board-${i}`}>
                  {ct('boardN', { n: i + 1 })} <span className="font-mono text-muted-foreground">({n})</span>
                </button>
              );
            })}
          </div>
        )}
        <div className="ms-auto flex gap-1">
          <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => setZoom((z) => Math.max(1, z / 1.5))} disabled={zoom <= 1} aria-label={ct('zoomOut')}><ZoomOut className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => setZoom((z) => Math.min(6, z * 1.5))} disabled={zoom >= 6} aria-label={ct('zoomIn')}><ZoomIn className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => setZoom(1)} disabled={zoom === 1} aria-label={ct('zoomReset')}><Maximize className="h-4 w-4" /></Button>
        </div>
      </div>
      {/* Physical coordinates never mirror in RTL. */}
      <div dir="ltr" className="overflow-hidden rounded-lg border bg-[hsl(40_30%_96%)]">
        <svg ref={svg} viewBox={`${vx} ${vy} ${vw} ${vh}`} className="block h-auto max-h-[70vh] w-full touch-none select-none"
          style={{ aspectRatio: `${fullW} / ${fullH}` }}
          role="group" aria-label={`${ct('canvas')} ${ct('boardN', { n: board + 1 })}: ${fmtNum(W)} × ${fmtNum(H)} mm`}
          onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)}
          onPointerDown={(e) => { if (e.target === svg.current) onSelect(null); }} data-testid="svg-board">
          <defs>
            <pattern id="margin-hatch" width={fs} height={fs} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2={fs} stroke="hsl(30 20% 60%)" strokeWidth={fs / 8} />
            </pattern>
          </defs>
          <rect x={0} y={0} width={W} height={H} fill="url(#margin-hatch)" stroke="hsl(30 15% 35%)" strokeWidth={fs / 6} onPointerDown={() => onSelect(null)} />
          <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} fill="hsl(42 45% 92%)" stroke="hsl(30 15% 55%)" strokeDasharray={`${fs / 2} ${fs / 3}`} strokeWidth={fs / 10} onPointerDown={() => onSelect(null)} />
          <text x={W / 2} y={-pad * 0.35} textAnchor="middle" fontSize={fs} fill="hsl(30 15% 30%)" fontFamily="ui-monospace, monospace">{fmtNum(W)} mm</text>
          <text x={-pad * 0.35} y={H / 2} textAnchor="middle" fontSize={fs} fill="hsl(30 15% 30%)" fontFamily="ui-monospace, monospace" transform={`rotate(-90 ${-pad * 0.35} ${H / 2})`}>{fmtNum(H)} mm</text>
          <text x={M.l + fs * 0.3} y={H - Math.max(M.b, 0) + fs * 1.1 > H + pad ? H : H + fs * 1.2} fontSize={fs * 0.7} fill="hsl(30 15% 40%)">{ct('usableArea')}: {fmtNum(W - M.l - M.r)} × {fmtNum(H - M.t - M.b)}</text>
          {onBoardItems.map((p) => {
            const id = pid(p);
            const { part, w, h } = pieceDims(input, p);
            const isDrag = drag?.id === id;
            const x = isDrag ? drag.x : Number(p.x), y = isDrag ? drag.y : Number(p.y);
            const sel = selected === id;
            const c = colorFor(input, p.piece_key);
            const lf = Math.min(fs, w / 6, h / 3);
            return (
              <g key={id} tabIndex={0} role="button" aria-pressed={sel}
                aria-label={`${part.label} #${p.copy + 1}, ${fmtNum(w)} × ${fmtNum(h)} mm, x ${p.x}, y ${p.y}${p.rotated ? `, ${ct('rotated')}` : ''}`}
                onPointerDown={(e) => down(e, p)} onFocus={() => onSelect(id)} onKeyDown={(e) => key(e, p)}
                className={cn('outline-none', !readOnly && 'cursor-grab', isDrag && 'cursor-grabbing')} data-testid={`piece-${id}`}>
                <rect x={x} y={y} width={w} height={h} fill={`hsl(${c} / ${isDrag ? 0.45 : 0.28})`} stroke={`hsl(${c})`} strokeWidth={sel ? fs / 3.5 : fs / 9} />
                {sel && <rect x={x - fs / 3} y={y - fs / 3} width={w + fs / 1.5} height={h + fs / 1.5} fill="none" stroke="hsl(30 15% 20%)" strokeDasharray={`${fs / 2} ${fs / 4}`} strokeWidth={fs / 10} />}
                {lf > fs * 0.25 && (
                  <>
                    <text x={x + w / 2} y={y + h / 2 - lf * 0.15} textAnchor="middle" fontSize={lf} fontWeight={600} fill="hsl(30 20% 15%)" pointerEvents="none">{part.label}{p.rotated ? ' (R)' : ''}</text>
                    <text x={x + w / 2} y={y + h / 2 + lf * 0.95} textAnchor="middle" fontSize={lf * 0.75} fill="hsl(30 15% 25%)" fontFamily="ui-monospace, monospace" pointerEvents="none">{fmtNum(w)}×{fmtNum(h)}</text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="text-xs text-muted-foreground">{onBoardItems.length === 0 ? ct('canvasEmpty') + ' ' : ''}{!readOnly && ct('canvasHelp')}</p>
    </div>
  );
}
