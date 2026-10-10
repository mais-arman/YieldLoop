import { ShieldOff } from 'lucide-react';
import { useI18n, type MsgKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function LotStateBadge({ state, className }: { state: 'available' | 'voided'; className?: string }) {
  const { t } = useI18n();
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-medium',
        state === 'available' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive', className)}
      data-testid={`status-lot-${state}`}>
      <span className={cn('h-1.5 w-1.5 rounded-full', state === 'available' ? 'bg-primary' : 'bg-destructive')} aria-hidden />
      {t(`state_${state}` as MsgKey)}
    </span>
  );
}

export function Kg({ v, className }: { v: string; className?: string }) {
  const { t } = useI18n();
  return <span className={className}><span dir="ltr" className="font-mono tabular-nums">{v}</span> <span className="text-xs font-normal text-muted-foreground">{t('matUnitKg')}</span></span>;
}

export function ReuseBlockedNotice({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="rounded-md border border-[hsl(38_92%_50%/0.4)] bg-[hsl(38_92%_50%/0.08)] p-3" data-testid="notice-reuse-blocked">
      <p className="flex items-start gap-2 text-sm font-medium"><ShieldOff className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(32_81%_29%)]" aria-hidden />{compact ? t('invAvailableHint') : t('invFoundation')}</p>
      {!compact && (
        <div className="mt-2 flex flex-wrap gap-1.5 ps-6 text-xs">
          <span className="rounded bg-card px-1.5 py-0.5 font-medium" data-testid="text-compat-unverified">{t('invCompat')}</span>
          <span className="rounded bg-card px-1.5 py-0.5 font-medium" data-testid="text-policy-missing">{t('invPolicy')}</span>
        </div>
      )}
    </div>
  );
}
