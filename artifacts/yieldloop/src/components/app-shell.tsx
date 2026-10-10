import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Activity, KeyRound, LayoutGrid, Loader2, LogOut, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandMark, LangSwitch } from '@/components/brand';
import { logout, type Employee } from '@/lib/auth';
import { useI18n, type MsgKey } from '@/lib/i18n';
import { displayName, endSession, initials, errorMessage, isSessionLoss } from '@/lib/session';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function useSignOut() {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [pending, setPending] = useState(false);
  const signOut = async () => {
    setPending(true);
    try {
      await logout();
      endSession(qc);
      navigate('/login');
    } catch (error) {
      if (isSessionLoss(error)) {
        endSession(qc);
        navigate('/login');
      } else {
        toast({ description: errorMessage(error, t), variant: 'destructive' });
      }
    } finally {
      setPending(false);
    }
  };
  return { signOut, pending };
}

export function SignOutButton({ variant = 'ghost' }: { variant?: 'ghost' | 'outline' | 'default' }) {
  const { t } = useI18n();
  const { signOut, pending } = useSignOut();
  return (
    <Button data-testid="button-sign-out" variant={variant} size="sm" onClick={signOut} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LogOut className="h-4 w-4 rtl:-scale-x-100" aria-hidden />}
      {pending ? t('signingOut') : t('signOut')}
    </Button>
  );
}

export function UserChip({ user }: { user: Employee }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2.5" data-testid="user-chip">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground" aria-hidden>
        {initials(user)}
      </span>
      <div className="hidden leading-tight sm:block">
        <div className="text-sm font-medium">{displayName(user)}</div>
        <div className="text-xs text-muted-foreground">{t(`role_${user.role}` as MsgKey)}</div>
      </div>
    </div>
  );
}

export function AppShell({ user, children, minimal = false }: { user: Employee; children: ReactNode; minimal?: boolean }) {
  const { t } = useI18n();
  const [location] = useLocation();
  const items: { href: string; label: string; icon: typeof Users }[] = [
    { href: '/', label: t('navHome'), icon: LayoutGrid },
    ...(user.role === 'manager' ? [{ href: '/employees', label: t('navEmployees'), icon: Users }] : []),
    { href: '/password', label: t('navPassword'), icon: KeyRound },
    { href: '/health', label: t('navHealth'), icon: Activity },
  ];
  return (
    <div className="min-h-[100dvh] w-full bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div className="leading-tight">
              <div className="text-sm font-semibold" dir="ltr">{t('brand')}</div>
              <div className="text-xs text-muted-foreground">{t('phase')}</div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <LangSwitch />
            <UserChip user={user} />
            <SignOutButton />
          </div>
        </div>
        {!minimal && (
          <nav aria-label={t('nav')} className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 sm:px-4">
            {items.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return (
                <Link
                  key={href}
                  href={href}
                  data-testid={`link-nav-${href.replace('/', '') || 'home'}`}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex shrink-0 items-center gap-2 px-3 py-2.5 text-sm transition-colors',
                    active ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                  <span className={cn('absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary transition-opacity', active ? 'opacity-100' : 'opacity-0')} aria-hidden />
                </Link>
              );
            })}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8 sm:py-12">{children}</main>
    </div>
  );
}
