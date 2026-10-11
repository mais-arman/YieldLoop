import { useEffect, useState } from 'react';
import { Plus, RotateCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CuttingInput, Placement } from '@/lib/cutting';
import { fmtNum, pid, pieceDims, unplacedCopies } from './model';
import { useCt } from './cutting-i18n';
import { cn } from '@/lib/utils';

const COORD = /^(0|[1-9]\d{0,5})(\.\d{1,3})?$/;

function BoardSelect({ value, onChange, count, id }: { value: string; onChange: (v: string) => void; count: number; id: string }) {
  const ct = useCt();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id}><SelectValue /></SelectTrigger>
      <SelectContent>{Array.from({ length: count }, (_, i) => <SelectItem key={i} value={String(i)}>{ct('boardN', { n: i + 1 })}</SelectItem>)}</SelectContent>
    </Select>
  );
}

/** Numeric placement controls: fully equivalent to canvas drag for keyboard and mobile users. */
export function PlacementPanel({ input, placements, selected, onSelect, readOnly, apply, feedback }: {
  input: CuttingInput; placements: Placement[]; selected: string | null; onSelect: (id: string | null) => void;
  readOnly: boolean; apply: (next: Placement[]) => boolean; feedback: string | null;
}) {
  const ct = useCt();
  const sel = placements.find((p) => pid(p) === selected) ?? null;
  const [x, setX] = useState(''); const [y, setY] = useState(''); const [b, setB] = useState('0'); const [rot, setRot] = useState(false);
  useEffect(() => { if (sel) { setX(sel.x); setY(sel.y); setB(String(sel.board)); setRot(sel.rotated); } }, [sel?.x, sel?.y, sel?.board, sel?.rotated, selected]);

  const free = unplacedCopies(input, placements);
  const [addId, setAddId] = useState('');
  const [ax, setAx] = useState(''); const [ay, setAy] = useState(''); const [ab, setAb] = useState('0'); const [arot, setArot] = useState(false);
  const addTarget = free.find((f) => pid(f) === addId);
  const addPart = addTarget ? input.pieces.find((p) => p.key === addTarget.piece_key) : undefined;
  const [localErr, setLocalErr] = useState<string | null>(null);

  const selPart = sel ? pieceDims(input, sel).part : null;
  const coordOk = (v: string) => COORD.test(v.trim());

  const applySel = () => {
    if (!sel) return;
    if (!coordOk(x) || !coordOk(y)) { setLocalErr(ct('fieldFormat')); return; }
    setLocalErr(null);
    apply(placements.map((p) => (pid(p) === selected ? { ...p, x: x.trim(), y: y.trim(), board: Number(b), rotated: rot } : p)));
  };
  const add = () => {
    if (!addTarget) return;
    if (!coordOk(ax) || !coordOk(ay)) { setLocalErr(ct('fieldFormat')); return; }
    setLocalErr(null);
    const np: Placement = { piece_key: addTarget.piece_key, copy: addTarget.copy, board: Number(ab), x: ax.trim(), y: ay.trim(), rotated: arot };
    if (apply([...placements, np])) { onSelect(pid(np)); setAddId(''); setAx(''); setAy(''); setArot(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div aria-live="polite" className="min-h-0">
        {(localErr || feedback) && <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive" role="alert" data-testid="text-placement-feedback">{localErr ?? feedback}</p>}
      </div>

      <section className="rounded-md border p-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{ct('selected')}</h4>
        {!sel || !selPart ? (
          <p className="mt-2 text-sm text-muted-foreground">{ct('noSelection')}</p>
        ) : (
          <div className="mt-2 flex flex-col gap-3">
            <p className="text-sm"><span className="font-semibold">{selPart.label}</span> <span className="text-muted-foreground">#{sel.copy + 1}</span>
              <span className="ms-2 font-mono text-xs text-muted-foreground" dir="ltr">{fmtNum(pieceDims(input, { ...sel, rotated: rot }).w)} × {fmtNum(pieceDims(input, { ...sel, rotated: rot }).h)} mm</span></p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {input.board.quantity > 1 && <div className="col-span-2 flex flex-col gap-1 sm:col-span-1"><Label htmlFor="sel-b" className="text-xs">{ct('board')}</Label><BoardSelect id="sel-b" value={b} onChange={setB} count={input.board.quantity} /></div>}
              <div className="flex flex-col gap-1"><Label htmlFor="sel-x" className="text-xs">x (mm)</Label><Input id="sel-x" dir="ltr" inputMode="decimal" className="font-mono" value={x} disabled={readOnly} onChange={(e) => setX(e.target.value)} data-testid="input-sel-x" /></div>
              <div className="flex flex-col gap-1"><Label htmlFor="sel-y" className="text-xs">y (mm)</Label><Input id="sel-y" dir="ltr" inputMode="decimal" className="font-mono" value={y} disabled={readOnly} onChange={(e) => setY(e.target.value)} data-testid="input-sel-y" /></div>
            </div>
            {!readOnly && (
              <div className="flex flex-wrap items-center gap-2">
                <label className={cn('flex items-center gap-2 text-sm', !selPart.rotation_allowed && 'text-muted-foreground')}>
                  <Checkbox checked={rot} disabled={!selPart.rotation_allowed} onCheckedChange={(v) => setRot(v === true)} data-testid="checkbox-sel-rotated" />{ct('rotated')}
                </label>
                {!selPart.rotation_allowed && <span className="text-xs text-muted-foreground">{ct('rotationLocked')}</span>}
                <div className="ms-auto flex gap-2">
                  <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { apply(placements.filter((p) => pid(p) !== selected)); onSelect(null); }} data-testid="button-remove-placement">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />{ct('removePlacement')}
                  </Button>
                  <Button type="button" size="sm" onClick={applySel} data-testid="button-apply-placement">{ct('apply')}</Button>
                </div>
              </div>
            )}
            {readOnly && sel.rotated && <p className="text-xs text-muted-foreground">{ct('rotated')}</p>}
          </div>
        )}
      </section>

      {!readOnly && (
        <section className="rounded-md border p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{ct('addUnplaced')}</h4>
          {free.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{ct('allPlaced')}</p> : (
            <div className="mt-2 flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="add-copy" className="text-xs">{ct('copy')}</Label>
                <Select value={addId} onValueChange={(v) => { setAddId(v); setArot(false); }}>
                  <SelectTrigger id="add-copy" data-testid="select-add-copy"><SelectValue placeholder={ct('chooseCopy')} /></SelectTrigger>
                  <SelectContent>{free.map((f) => <SelectItem key={pid(f)} value={pid(f)}>{f.label} #{f.copy + 1}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {input.board.quantity > 1 && <div className="col-span-2 flex flex-col gap-1 sm:col-span-1"><Label htmlFor="add-b" className="text-xs">{ct('board')}</Label><BoardSelect id="add-b" value={ab} onChange={setAb} count={input.board.quantity} /></div>}
                <div className="flex flex-col gap-1"><Label htmlFor="add-x" className="text-xs">x (mm)</Label><Input id="add-x" dir="ltr" inputMode="decimal" className="font-mono" value={ax} onChange={(e) => setAx(e.target.value)} data-testid="input-add-x" /></div>
                <div className="flex flex-col gap-1"><Label htmlFor="add-y" className="text-xs">y (mm)</Label><Input id="add-y" dir="ltr" inputMode="decimal" className="font-mono" value={ay} onChange={(e) => setAy(e.target.value)} data-testid="input-add-y" /></div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className={cn('flex items-center gap-2 text-sm', !addPart?.rotation_allowed && 'text-muted-foreground')}>
                  <Checkbox checked={arot} disabled={!addPart?.rotation_allowed} onCheckedChange={(v) => setArot(v === true)} />{ct('rotated')}
                </label>
                <Button type="button" size="sm" variant="outline" className="ms-auto" onClick={add} disabled={!addTarget || !ax.trim() || !ay.trim()} data-testid="button-add-placement">
                  <Plus className="h-3.5 w-3.5" aria-hidden />{ct('place')}
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {placements.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{ct('placedList')}</h4>
          <ul className="mt-2 max-h-56 divide-y overflow-y-auto rounded-md border text-sm">
            {placements.map((p) => {
              const { part, w, h } = pieceDims(input, p);
              const active = pid(p) === selected;
              return (
                <li key={pid(p)}>
                  <button type="button" onClick={() => onSelect(pid(p))} aria-pressed={active}
                    className={cn('flex w-full items-center gap-2 px-3 py-1.5 text-start hover:bg-muted/60', active && 'bg-accent text-accent-foreground')}>
                    <span className="min-w-0 flex-1 truncate">{part.label} <span className="text-muted-foreground">#{p.copy + 1}</span></span>
                    {p.rotated && <RotateCw className="h-3 w-3 text-muted-foreground" aria-label={ct('rotated')} />}
                    <span className="font-mono text-xs text-muted-foreground" dir="ltr">{ct('boardN', { n: p.board + 1 })} · {p.x},{p.y} · {fmtNum(w)}×{fmtNum(h)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
