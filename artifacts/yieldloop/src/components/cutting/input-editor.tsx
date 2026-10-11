import { useEffect, useId, useState, type ReactNode } from 'react';
import { AlertTriangle, ChevronDown, Link2, Link2Off, Square, RectangleHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MaterialPicker } from '@/components/materials/material-picker';
import type { Material } from '@/lib/materials';
import { blankPiece, MAX_COPIES, MAX_PIECES, type FormErrors, type InputForm, type PieceForm } from './model';
import { useCt, type CtKey } from './cutting-i18n';
import { cn } from '@/lib/utils';
import { useUt } from '@/lib/ui-i18n';
import { squareWidthPatch, toggleSquareLock } from '@/lib/display-format';

function Group({ title, children, aside, invalid }: { title: string; children: ReactNode; aside?: ReactNode; invalid?: boolean }) {
  const [open, setOpen] = useState(true);
  // A group with an error is always expanded so invalid fields stay reachable and focusable.
  useEffect(() => { if (invalid) setOpen(true); }, [invalid]);
  return (
    <details open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)} className="rounded-md border bg-background/50 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer select-none items-center gap-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform motion-reduce:transition-none', !open && '-rotate-90 rtl:rotate-90')} aria-hidden />
        <span className="flex-1">{title}</span>
        {invalid && <span className="h-1.5 w-1.5 rounded-full bg-destructive" aria-hidden />}
        {aside}
      </summary>
      <div className="flex flex-col gap-4 border-t px-3 pb-3 pt-3">{children}</div>
    </details>
  );
}

function Err({ id, k, vars }: { id: string; k?: CtKey; vars?: Record<string, number> }) {
  const ct = useCt();
  if (!k) return null;
  return <p id={id} className="text-xs font-medium text-destructive" role="alert">{ct(k, vars)}</p>;
}

function NumField({ id, label, value, onChange, error, disabled, suffix = 'mm', intRange }: {
  id: string; label: string; value: string; onChange: (v: string) => void; error?: CtKey; disabled: boolean; suffix?: string; intRange?: [number, number];
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <div className="relative">
        <Input id={id} dir="ltr" inputMode={intRange ? 'numeric' : 'decimal'} value={value} disabled={disabled}
          onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={error ? `${id}-e` : undefined}
          className={cn('pe-10 font-mono', error && 'border-destructive')} data-testid={`input-${id}`} />
        {suffix && <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" dir="ltr">{suffix}</span>}
      </div>
      <Err id={`${id}-e`} k={error} vars={intRange ? { min: intRange[0], max: intRange[1] } : undefined} />
    </div>
  );
}

export function InputEditor({ form, errors, copies, onChange, disabled, canCreateMaterial, showErrors }: {
  form: InputForm; errors: FormErrors; copies: number; onChange: (f: InputForm) => void;
  disabled: boolean; canCreateMaterial: boolean; showErrors: boolean;
}) {
  const ct = useCt();
  const u = useId().replace(/:/g, '');
  const er = (k: string) => (showErrors ? errors[k] : undefined);
  const set = <K extends keyof InputForm>(k: K, v: InputForm[K]) => onChange({ ...form, [k]: v });
  const setPiece = (i: number, patch: Partial<PieceForm>) => onChange({ ...form, pieces: form.pieces.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const ut = useUt();
  const [squares, setSquares] = useState<Set<string>>(() => new Set());
  const toggleSquare = (key: string, on: boolean) => setSquares((prev) => { const n = new Set(prev); if (on) n.add(key); else n.delete(key); return n; });
  const addPiece = (square: boolean) => {
    const p = blankPiece();
    if (square) toggleSquare(p.key, true);
    onChange({ ...form, pieces: [...form.pieces, p] });
    requestAnimationFrame(() => document.getElementById(`${u}-p${form.pieces.length}-l`)?.focus());
  };
  const anyErr = (keys: string[]) => keys.some((k) => !!er(k));
  const material: Material | null = form.material_id === null ? null : ({ id: form.material_id, name: form.material_name, specification: '', unit: 'kg' } as unknown as Material);

  return (
    <div className="flex flex-col gap-3">
      <Group title={ut('grpStock')} invalid={anyErr(['stock_label', 'unit', 'material', 'width', 'height', 'quantity'])}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${u}-label`} className="text-xs">{ct('stockLabel')}</Label>
            <Input id={`${u}-label`} value={form.stock_label} maxLength={120} disabled={disabled} onChange={(e) => set('stock_label', e.target.value)}
              aria-invalid={!!er('stock_label')} aria-describedby={`${u}-label-e`} data-testid="input-stock-label" />
            <Err id={`${u}-label-e`} k={er('stock_label')} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${u}-unit`} className="text-xs">{ct('unit')}</Label>
            <Select value={form.unit} onValueChange={(v) => set('unit', v as 'mm')} disabled={disabled}>
              <SelectTrigger id={`${u}-unit`} aria-invalid={!!er('unit')} aria-describedby={er('unit') ? `${u}-unit-e` : undefined} data-testid="select-unit"><SelectValue placeholder={ct('unitChoose')} /></SelectTrigger>
              <SelectContent><SelectItem value="mm">{ct('unitMm')}</SelectItem></SelectContent>
            </Select>
            <Err id={`${u}-unit-e`} k={er('unit')} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium">{ct('material')}</span>
          {form.material_id !== null && (
            <p className="text-sm" data-testid="text-material-selected">
              <span className="font-medium">{form.material_name || ct('materialSelected', { id: form.material_id })}</span>
              <span className="ms-2 font-mono text-xs text-muted-foreground">#{form.material_id}</span>
            </p>
          )}
          {!disabled && <MaterialPicker value={material} onChange={(m) => onChange({ ...form, material_id: m.id, material_name: m.name })} canCreate={canCreateMaterial} disabled={disabled} errorId={er('material') ? `${u}-mat-e` : undefined} />}
          <p className="text-xs text-muted-foreground">{ct('materialHint')}</p>
          <Err id={`${u}-mat-e`} k={er('material')} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2">
          <NumField id={`${u}-w`} label={ct('width')} value={form.width} onChange={(v) => set('width', v)} error={er('width')} disabled={disabled} />
          <NumField id={`${u}-h`} label={ct('height')} value={form.height} onChange={(v) => set('height', v)} error={er('height')} disabled={disabled} />
          <NumField id={`${u}-q`} label={ct('boardQty')} value={form.quantity} onChange={(v) => set('quantity', v)} error={er('quantity')} disabled={disabled} suffix="" intRange={[1, 10]} />
        </div>
      </Group>
      <Group title={ut('grpMargins')} invalid={anyErr(['left', 'right', 'top', 'bottom', 'kerf'])}>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs font-medium">{ct('margins')}</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
            {(['left', 'right', 'top', 'bottom'] as const).map((k) => (
              <NumField key={k} id={`${u}-${k}`} label={ct(k)} value={form[k]} onChange={(v) => set(k, v)} error={er(k)} disabled={disabled} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{ct('marginsHint')}</p>
        </fieldset>
        <div className="flex flex-col gap-1">
          <NumField id={`${u}-kerf`} label={ct('kerf')} value={form.kerf} onChange={(v) => set('kerf', v)} error={er('kerf')} disabled={disabled} />
          <p className="text-xs text-muted-foreground">{ct('kerfHint')}</p>
        </div>
      </Group>
      <Group title={ut('grpMode')} invalid={anyErr(['cutting_mode'])}>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${u}-mode`} className="text-xs">{ct('mode')}</Label>
            <Select value={form.cutting_mode} onValueChange={(v) => set('cutting_mode', v as 'rectangular_spacing_only')} disabled={disabled}>
              <SelectTrigger id={`${u}-mode`} aria-invalid={!!er('cutting_mode')} aria-describedby={er('cutting_mode') ? `${u}-mode-e` : undefined} data-testid="select-mode"><SelectValue placeholder={ct('modeChoose')} /></SelectTrigger>
              <SelectContent><SelectItem value="rectangular_spacing_only">{ct('modeRect')}</SelectItem></SelectContent>
            </Select>
            <Err id={`${u}-mode-e`} k={er('cutting_mode')} />
          </div>
        <p className="flex items-start gap-2 rounded-md border border-[hsl(38_92%_50%/0.35)] bg-[hsl(38_92%_50%/0.08)] px-3 py-2 text-xs text-[hsl(32_60%_28%)]" data-testid="text-mode-notice">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{ct('modeNotice')}
        </p>
      </Group>

      <Group title={ut('grpParts')} invalid={showErrors && Object.keys(errors).some((k) => k.startsWith('p') && k !== 'pieces') || !!(showErrors && errors.pieces)}
        aside={<span className={cn('font-mono text-[11px] normal-case tracking-normal', copies > MAX_COPIES ? 'text-destructive' : 'text-muted-foreground')}>{ct('copiesTotal', { n: copies })}</span>}>
        <ol className="flex flex-col gap-3">
          {form.pieces.map((p, i) => (
            <li key={p.key} className="rounded-md border bg-background/60 p-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.4fr_1fr_1fr_0.8fr_1fr_auto] sm:items-start xl:grid-cols-2">
                <div className="col-span-2 flex flex-col gap-1 sm:col-span-1 xl:col-span-2">
                  <Label htmlFor={`${u}-p${i}-l`} className="text-xs">{ct('pieceLabel')}</Label>
                  <Input id={`${u}-p${i}-l`} value={p.label} maxLength={80} disabled={disabled} onChange={(e) => setPiece(i, { label: e.target.value })} aria-invalid={!!er(`p${i}.label`)} aria-describedby={er(`p${i}.label`) ? `${u}-p${i}-l-e` : undefined} data-testid={`input-piece-label-${i}`} />
                  <Err id={`${u}-p${i}-l-e`} k={er(`p${i}.label`)} />
                </div>
                <NumField id={`${u}-p${i}-w`} label={ct('width')} value={p.width} onChange={(v) => setPiece(i, squareWidthPatch(squares, p.key, v))} error={er(`p${i}.width`)} disabled={disabled} />
                <NumField id={`${u}-p${i}-h`} label={ct('height')} value={p.height} onChange={(v) => setPiece(i, { height: v })} error={er(`p${i}.height`)} disabled={disabled || squares.has(p.key)} />
                <NumField id={`${u}-p${i}-q`} label={ct('quantity')} value={p.quantity} onChange={(v) => setPiece(i, { quantity: v })} error={er(`p${i}.quantity`)} disabled={disabled} suffix="" intRange={[1, 100]} />
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`${u}-p${i}-r`} className="text-xs">{ct('rotation')}</Label>
                  <Select value={p.rotation} onValueChange={(v) => setPiece(i, { rotation: v as 'yes' | 'no' })} disabled={disabled}>
                    <SelectTrigger id={`${u}-p${i}-r`} aria-invalid={!!er(`p${i}.rotation`)} aria-describedby={er(`p${i}.rotation`) ? `${u}-p${i}-r-e` : undefined} data-testid={`select-rotation-${i}`}><SelectValue placeholder={ct('rotationChoose')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">{ct('rotationYes')}</SelectItem>
                      <SelectItem value="no">{ct('rotationNo')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Err id={`${u}-p${i}-r-e`} k={er(`p${i}.rotation`)} />
                </div>
                {!disabled && (
                  <Button type="button" variant="ghost" size="icon" className="self-end text-muted-foreground hover:text-destructive sm:mt-5 xl:mt-0" onClick={() => onChange({ ...form, pieces: form.pieces.filter((_, j) => j !== i) })} aria-label={`${ct('removePiece')} ${p.label}`} data-testid={`button-remove-piece-${i}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {!disabled && (
                <button type="button" aria-pressed={squares.has(p.key)} data-testid={`button-square-${i}`}
                  onClick={() => { const r = toggleSquareLock(squares, p.key, p.width, p.height); setSquares(r.next); if (r.patch) setPiece(i, r.patch); }}
                  className={cn('mt-2 inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-[11px] font-medium transition-colors', squares.has(p.key) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                  {squares.has(p.key) ? <Link2 className="h-3 w-3" aria-hidden /> : <Link2Off className="h-3 w-3" aria-hidden />}
                  {squares.has(p.key) ? ut('squareLocked') : ut('lockSquare')}
                </button>
              )}
            </li>
          ))}
        </ol>
        <Err id={`${u}-pieces-e`} k={showErrors || form.pieces.length > MAX_PIECES ? errors.pieces : undefined} />
        {!disabled && (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => addPiece(false)} disabled={form.pieces.length >= MAX_PIECES} data-testid="button-add-piece">
              <RectangleHorizontal className="h-3.5 w-3.5" aria-hidden />{ut('addRectangle')}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addPiece(true)} disabled={form.pieces.length >= MAX_PIECES} data-testid="button-add-square">
              <Square className="h-3.5 w-3.5" aria-hidden />{ut('addSquare')}
            </Button>
            <span className="text-xs text-muted-foreground">{ct('piecesLimit')}</span>
          </div>
        )}
      </Group>
    </div>
  );
}
