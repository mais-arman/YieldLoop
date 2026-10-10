import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8 text-primary', className)} aria-hidden>
      <rect width="32" height="32" rx="7" fill="hsl(222 47% 11%)" />
      <path d="M9 21a7 7 0 1 1 7 0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 21l3-3m-3 3l-3-3" fill="none" stroke="hsl(160 84% 39%)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function LangSwitch({ className }: { className?: string }) {
  const { t, lang, setLang } = useI18n();
  return (
    <Button
      data-testid="button-switch-language"
      variant="ghost"
      size="sm"
      className={className}
      aria-label={t('switchLangLabel')}
      lang={lang === 'en' ? 'ar' : 'en'}
      onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
    >
      <Languages className="h-4 w-4" aria-hidden />
      {t('switchLang')}
    </Button>
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
