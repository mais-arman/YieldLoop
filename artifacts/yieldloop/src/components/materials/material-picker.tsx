import { Pager } from '@/components/pager';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Plus, RotateCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from '@/components/job-ui';
import { FormAlert } from '@/components/brand';
import { useToast } from '@/hooks/use-toast';
import { MATERIALS_KEY, createMaterial, useMaterials, type Material } from '@/lib/materials';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { matErrorMessage, matFieldErrors } from './mat-utils';

export function MaterialPicker({ value, onChange, canCreate, disabled, errorId }: {
  value: Material | null; onChange: (m: Material) => void; canCreate: boolean; disabled?: boolean; errorId?: string;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [raw, setRaw] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const q = useMaterials(page, search, true);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [spec, setSpec] = useState('');
  const create = useMutation({
    mutationFn: () => createMaterial({ name: name.trim(), specification: spec.trim(), unit: 'kg' }),
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: MATERIALS_KEY });
      onChange(m);
      setCreating(false); setName(''); setSpec(''); create.reset();
      toast({ title: t('matDefCreated', { name: m.name }) });
    },
  });
  const fe = matFieldErrors(create.error, t);

  const onSearch = (v: string) => {
    setRaw(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setSearch(v.trim()); setPage(1); }, 300);
  };

  return (
    <div className="flex flex-col gap-2" data-testid="picker-material">
      <div className="relative">
        <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input type="search" value={raw} onChange={(e) => onSearch(e.target.value)} placeholder={t('matSearch')} aria-label={t('matSearch')} aria-invalid={!!errorId} aria-describedby={errorId} className="ps-8" disabled={disabled} maxLength={120} data-testid="input-material-search" />
      </div>
      <div className="max-h-56 overflow-y-auto rounded-md border" role="listbox" aria-label={t('matChooseMaterial')}>
        {q.isPending ? (
          <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
        ) : q.isError ? (
          <div className="flex items-center justify-between gap-3 p-3 text-sm" role="alert">
            <span className="text-destructive">{t('matDefsError')}</span>
            <Button type="button" size="sm" variant="outline" onClick={() => q.refetch()} data-testid="button-retry-materials"><RotateCw className="h-3.5 w-3.5" aria-hidden />{t('retry')}</Button>
          </div>
        ) : q.data.results.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">{search ? t('matNoDefMatches', { q: search }) : t('matNoDefs')}</p>
        ) : (
          <ul className="divide-y">
            {q.data.results.map((m) => {
              const sel = value?.id === m.id;
              return (
                <li key={m.id}>
                  <button type="button" role="option" aria-selected={sel} disabled={disabled} onClick={() => onChange(m)}
                    className={cn('flex w-full items-start gap-2 px-3 py-2 text-start text-sm transition-colors hover:bg-muted/60 disabled:opacity-60', sel && 'bg-accent text-accent-foreground')}
                    data-testid={`option-material-${m.id}`}>
                    <Check className={cn('mt-0.5 h-4 w-4 shrink-0', !sel && 'invisible')} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block break-words font-medium">{m.name}</span>
                      <span className="block break-words text-xs text-muted-foreground">{m.specification}</span>
                    </span>
                    <span className="font-mono text-xs text-muted-foreground" dir="ltr">{m.unit}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {q.data && <Pager page={q.data.page} totalPages={q.data.total_pages} onPage={setPage} busy={q.isFetching} testId="materials" />}

      {canCreate ? (
        creating ? (
          <div className="flex flex-col gap-3 rounded-md border border-dashed bg-muted/30 p-3" data-testid="form-new-material">
            <p className="text-xs text-muted-foreground">{t('matNewDefDesc')}</p>
            {create.error && !Object.keys(fe).length && <FormAlert message={matErrorMessage(create.error, t)} testId="error-new-material" />}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="m-name">{t('matName')}</Label>
              <Input id="m-name" value={name} maxLength={160} onChange={(e) => setName(e.target.value)} disabled={create.isPending} aria-invalid={!!fe.name} data-testid="input-material-name" />
              <FieldError msg={fe.name} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="m-spec">{t('matSpec')}</Label>
              <Textarea id="m-spec" rows={2} value={spec} maxLength={500} onChange={(e) => setSpec(e.target.value)} disabled={create.isPending} aria-invalid={!!fe.specification} data-testid="input-material-spec" />
              <FieldError msg={fe.specification ?? fe.unit ?? fe.non_field_errors} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => { setCreating(false); create.reset(); }} disabled={create.isPending} data-testid="button-cancel-material">{t('cancel')}</Button>
              <Button type="button" size="sm" disabled={!name.trim() || !spec.trim() || create.isPending} onClick={() => create.mutate()} data-testid="button-create-material">
                {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}{t('matCreateDef')}
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setCreating(true)} disabled={disabled} data-testid="button-new-material"><Plus className="h-3.5 w-3.5" aria-hidden />{t('matNewDef')}</Button>
        )
      ) : (
        <p className="text-xs text-muted-foreground">{t('matManagerOnly')}</p>
      )}
    </div>
  );
}
