import { useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Activity, BarChart3, Boxes, ChevronDown, ClipboardList, FileText, KeyRound, Loader2, LogOut, Menu, Ruler, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BrandMark, LangSwitch } from '@/components/brand';
import { logout, type Employee } from '@/lib/auth';
import { useI18n, type MsgKey } from '@/lib/i18n';
import { useUt, type UiKey } from '@/lib/ui-i18n';
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
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground" aria-hidden>
        {initials(user)}
      </span>
      <div className="hidden min-w-0 text-start leading-tight sm:block">
        <div className="max-w-[10rem] truncate text-sm font-medium">{displayName(user)}</div>
        <div className="text-xs text-muted-foreground">{t(`role_${user.role}` as MsgKey)}</div>
      </div>
    </div>
  );
}

type NavItem = { href: string; label: string; icon: typeof Users; testId: string };

function useNav(user: Employee): NavItem[] {
  const ut = useUt();
  return [
    { href: '/dashboard', label: ut('pageDashboard'), icon: BarChart3, testId: 'dashboard' },
    { href: '/jobs', label: ut('pageJobs'), icon: ClipboardList, testId: 'jobs' },
    { href: '/cutting', label: ut('pageCutting'), icon: Ruler, testId: 'cutting' },
    { href: '/inventory', label: ut('pageInventory'), icon: Boxes, testId: 'inventory' },
    { href: '/reports', label: ut('pageReports'), icon: FileText, testId: 'reports' },
    ...(user.role === 'manager' ? [{ href: '/employees', label: ut('pageEmployees'), icon: Users, testId: 'employees' }] : []),
  ];
}

const isActive = (location: string, href: string) =>
  /^\/jobs\/\d+\/cutting/.test(location)
    ? href === '/cutting'
    : location === href || location.startsWith(`${href}/`);

function pageKey(location: string): UiKey {
  if (location.startsWith('/dashboard')) return 'pageDashboard';
  if (location.startsWith('/reports')) return 'pageReports';
  if (location === '/jobs/new') return 'pageJobNew';
  if (/^\/jobs\/\d+\/cutting/.test(location) || location.startsWith('/cutting')) return 'pageCutting';
  if (/^\/jobs\/[^/]+/.test(location)) return 'pageJob';
  if (location.startsWith('/jobs')) return 'pageJobs';
  if (/^\/inventory\/[^/]+/.test(location)) return 'pageLot';
  if (location.startsWith('/inventory')) return 'pageInventory';
  if (location.startsWith('/employees')) return 'pageEmployees';
  if (location.startsWith('/password')) return 'pagePassword';
  return 'pageNotFound';
}

function NavList({ items, location, onNavigate }: { items: NavItem[]; location: string; onNavigate?: () => void }) {
  const { t } = useI18n();
  return (
    <nav aria-label={t('nav')} className="flex flex-col gap-0.5">
      {items.map(({ href, label, icon: Icon, testId }) => {
        const active = isActive(location, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            data-testid={`link-nav-${testId}`}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150',
              active ? 'bg-white/10 font-medium text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
            )}
          >
            <span className={cn('absolute inset-y-1.5 start-0 w-0.5 rounded-full bg-[hsl(160_84%_39%)] transition-opacity', active ? 'opacity-100' : 'opacity-0')} aria-hidden />
            <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-[hsl(160_84%_52%)]' : 'text-slate-400 group-hover:text-slate-200')} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({ user, location, onNavigate }: { user: Employee; location: string; onNavigate?: () => void }) {
  const { t } = useI18n();
  const ut = useUt();
  const items = useNav(user);
  return (
    <div className="flex h-full flex-col bg-[hsl(222_47%_11%)] text-slate-200">
      <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5 px-5 pb-6 pt-5" data-testid="link-brand">
        <BrandMark className="h-8 w-8 text-[hsl(175_70%_45%)]" />
        <span className="leading-tight">
          <span className="block text-sm font-semibold text-white" dir="ltr">{t('brand')}</span>
          <span className="block text-[11px] text-slate-400">{t('phase')}</span>
        </span>
      </Link>
      <div className="flex-1 overflow-y-auto px-3">
        <NavList items={items} location={location} onNavigate={onNavigate} />
      </div>
      <div className="border-t border-white/10 px-3 py-3">
        <Link href="/health" onClick={onNavigate} data-testid="link-nav-health"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200">
          <Activity className="h-3.5 w-3.5" aria-hidden />{ut('systemStatus')}
        </Link>
      </div>
    </div>
  );
}

function AccountMenu({ user }: { user: Employee }) {
  const { t } = useI18n();
  const ut = useUt();
  const [, navigate] = useLocation();
  const { signOut, pending } = useSignOut();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={ut('account')} data-testid="button-account-menu">
          <UserChip user={user} />
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate text-sm font-medium">{displayName(user)}</div>
          <div className="truncate text-xs text-muted-foreground" dir="ltr" style={{ textAlign: 'start' }}>{user.username}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{t(`role_${user.role}` as MsgKey)}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/password')} data-testid="link-nav-password">
          <KeyRound className="h-4 w-4" aria-hidden />{t('navPassword')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/health')}>
          <Activity className="h-4 w-4" aria-hidden />{ut('systemStatus')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); if (!pending) void signOut(); }} disabled={pending} data-testid="button-sign-out" className="text-destructive focus:text-destructive">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LogOut className="h-4 w-4 rtl:-scale-x-100" aria-hidden />}
          {pending ? t('signingOut') : t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ user, children, minimal = false, wide = false }: { user: Employee; children: ReactNode; minimal?: boolean; wide?: boolean }) {
  const { t, dir } = useI18n();
  const ut = useUt();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);

  if (minimal) {
    return (
      <div className="min-h-[100dvh] w-full bg-background">
        <header className="flex items-center justify-between gap-3 border-b bg-card px-5 py-3">
          <div className="flex items-center gap-2.5"><BrandMark /><span className="text-sm font-semibold" dir="ltr">{t('brand')}</span></div>
          <div className="flex items-center gap-2"><LangSwitch /><SignOutButton /></div>
        </header>
        <main className="mx-auto max-w-2xl px-5 py-10">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-background lg:ps-60">
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-60 lg:block">
        <SidebarBody user={user} location={location} />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side={dir === 'rtl' ? 'right' : 'left'} className="w-72 max-w-[85vw] border-0 p-0"
          onCloseAutoFocus={(event) => { event.preventDefault(); menuTrigger.current?.focus(); }}>
          <SheetTitle className="sr-only">{t('nav')}</SheetTitle>
          <SidebarBody user={user} location={location} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur sm:px-6">
        <Button ref={menuTrigger} variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label={ut('openMenu')} data-testid="button-open-nav">
          <Menu className="h-5 w-5" aria-hidden />
        </Button>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground" data-testid="text-page-context">{ut(pageKey(location))}</p>
        <LangSwitch />
        <AccountMenu user={user} />
      </header>
      <main className={cn('mx-auto w-full px-4 py-6 sm:px-6 sm:py-8', wide ? 'max-w-[1680px]' : 'max-w-6xl')}>
        <div className="animate-in fade-in duration-300 motion-reduce:animate-none">{children}</div>
      </main>
    </div>
  );
}
