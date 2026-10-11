import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n } from '@/lib/i18n';
import { useUt } from '@/lib/ui-i18n';
import { cn } from '@/lib/utils';

/**
 * YieldLoop mark: a material sheet with a cut line, wrapped by a recovery loop
 * whose arrowhead returns material into the sheet. Original geometric mark.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8 shrink-0', className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="hsl(217 71% 33%)" />
      <rect x="8" y="8" width="12.5" height="16" rx="1.6" fill="hsl(0 0% 100%)" />
      <path d="M8 18.2h12.5" stroke="hsl(217 71% 33%)" strokeWidth="1.3" strokeDasharray="2 1.6" />
      <rect x="8" y="18.9" width="5" height="5.1" fill="hsl(172 62% 42%)" opacity=".9" />
      <path d="M20.5 9.5a8 8 0 0 1 2.6 13.4" fill="none" stroke="hsl(172 62% 52%)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M19.6 21.3l3.7 1.8-.6-4" fill="none" stroke="hsl(172 62% 52%)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BrandLockup({ className, sub, size = 'md' }: { className?: string; sub?: string; size?: 'md' | 'lg' }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <BrandMark className={size === 'lg' ? 'h-10 w-10' : 'h-8 w-8'} />
      <span className="leading-tight">
        <span className={cn('block font-semibold tracking-tight text-foreground', size === 'lg' ? 'text-xl' : 'text-[15px]')} dir="ltr">
          Yield<span className="text-[hsl(172_62%_32%)]">Loop</span>
        </span>
        {sub && <span className="block text-[11px] text-muted-foreground">{sub}</span>}
      </span>
    </span>
  );
}

export function LangSwitch({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const ut = useUt();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          data-testid="button-switch-language"
          variant="ghost"
          size="icon"
          className={cn('h-9 w-9 text-muted-foreground hover:text-foreground', className)}
          aria-label={ut('changeLanguage')}
          onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
        >
          <Globe className="h-[18px] w-[18px]" aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{ut('changeLanguage')}</TooltipContent>
    </Tooltip>
  );
}

export function FormAlert({ message, tone = 'error', testId }: { message: string; tone?: 'error' | 'info'; testId?: string }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      data-testid={testId}
      className={cn(
        'rounded-md border px-3 py-2.5 text-sm leading-relaxed',
        tone === 'error'
          ? 'border-destructive/30 bg-destructive/5 text-destructive'
          : 'border-primary/25 bg-accent text-accent-foreground',
      )}
    >
      {message}
    </div>
  );
}
