import { Link } from 'wouter';
import { Compass } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background px-5">
      <div className="max-w-sm text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground" aria-hidden><Compass className="h-5 w-5" /></span>
        <div className="mt-4 font-mono text-xs text-muted-foreground" dir="ltr">404</div>
        <h1 className="mt-1 text-xl font-semibold">{t('notFoundTitle')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('notFoundDesc')}</p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">{t('backHome')}</Link>
      </div>
    </div>
  );
}
