import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { BarChart3, Box, Boxes, Check, ChevronDown, ClipboardList, FileText, Gauge, Globe, KeyRound, Loader2, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Ruler, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BrandLockup, BrandMark } from '@/components/brand';
import { navFor, canAccess, type NavKey } from '@/lib/role-access';
import { roleHome } from '@/lib/role-home';
import { AssistantProvider } from '@/components/assistant-panel';
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

const ICONS: Record<NavKey, typeof Users> = {
  navOverview: Gauge, navDashboard: BarChart3, navMyWork: ClipboardList, navJobs: ClipboardList, navCutting: Ruler,
  navInventory: Boxes, navReports: FileText, navPackaging: Box, navEmployees: Users,
};

const isActive = (location: string, href: string) =>
  /^\/jobs\/\d+\/cutting/.test(location)
    ? href === '/cutting'
    : location.startsWith('/comparison') ? href === '/reports'
    : location === href || location.startsWith(`${href}/`);

function pageKey(location: string): UiKey {
  if (location.startsWith('/dashboard')) return 'pageDashboard';
  if (location.startsWith('/reports') || location.startsWith('/comparison')) return 'pageReports';
  if (location === '/jobs/new') return 'pageJobNew';
  if (/^\/jobs\/\d+\/cutting/.test(location) || location.startsWith('/cutting')) return 'pageCutting';
  if (/^\/jobs\/[^/]+/.test(location)) return 'pageJob';
  if (location.startsWith('/jobs')) return 'pageJobs';
  if (/^\/inventory\/[^/]+/.test(location)) return 'pageLot';
  if (location.startsWith('/inventory')) return 'pageInventory';
  if (location.startsWith('/employees')) return 'pageEmployees';
  if (location.startsWith('/password')) return 'pagePassword';
  if (location.startsWith('/assistant')) return 'pageAssistant';
  if (location.startsWith('/packaging')) return 'pagePackaging';
  return 'pageNotFound';
}

function NavList({ user, location, collapsed, onNavigate }: { user: Employee; location: string; collapsed?: boolean; onNavigate?: () => void }) {
  const { t } = useI18n();
  const ut = useUt();
  return (
    <nav aria-label={t('nav')} className="flex flex-col gap-1">
      {navFor(user.role).map(({ href, key, testId }) => {
        const active = isActive(location, href);
        const Icon = ICONS[key];
        const link = (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            data-testid={`link-nav-${testId}`}
            aria-current={active ? 'page' : undefined}
            aria-label={collapsed ? ut(key) : undefined}
            className={cn(
              'yl-sidebar-link group relative flex h-10 items-center gap-3 rounded-lg text-sm transition-colors duration-150',
              collapsed ? 'justify-center px-0' : 'px-3',
              active ? 'bg-white/[0.08] font-medium text-white' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100',
            )}
          >
            <span className={cn('absolute inset-y-2 start-0 w-[3px] rounded-full bg-[#10B981] transition-opacity', active ? 'opacity-100' : 'opacity-0')} aria-hidden />
            <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-[#10B981]' : 'text-slate-500 group-hover:text-slate-300')} aria-hidden />
            {!collapsed && <span className="truncate">{ut(key)}</span>}
          </Link>
        );
        return collapsed ? (
          <Tooltip key={href}><TooltipTrigger asChild>{link}</TooltipTrigger><TooltipContent side="right">{ut(key)}</TooltipContent></Tooltip>
        ) : link;
      })}
    </nav>
  );
}

function SidebarBody({ user, location, collapsed = false, onToggle, onNavigate }: { user: Employee; location: string; collapsed?: boolean; onToggle?: () => void; onNavigate?: () => void }) {
  const ut = useUt();
  return (
    <div className="flex h-full flex-col bg-[#0F172A] text-slate-200">
      <Link href={roleHome(user.role)} onClick={onNavigate} className={cn('flex h-16 items-center', collapsed ? 'justify-center' : 'px-5')} data-testid="link-brand">
        {collapsed ? <BrandMark /> : <BrandLockup inverse sub={ut('loginTagline')} />}
      </Link>
      <div className={cn('flex-1 overflow-y-auto pt-3', collapsed ? 'px-2' : 'px-3')}>
        <NavList user={user} location={location} collapsed={collapsed} onNavigate={onNavigate} />
      </div>
      {onToggle && (
        <button type="button" onClick={onToggle} className={cn('yl-sidebar-link mx-3 mb-2 flex h-9 items-center gap-2 rounded-lg text-xs text-slate-400 hover:bg-white/[0.04] hover:text-slate-100', collapsed ? 'justify-center' : 'px-3')}
          aria-label={collapsed ? ut('expandSidebar') : ut('collapseSidebar')} aria-expanded={!collapsed} data-testid="button-toggle-sidebar">
          {collapsed ? <PanelLeftOpen className="h-4 w-4 rtl:-scale-x-100" aria-hidden /> : <PanelLeftClose className="h-4 w-4 rtl:-scale-x-100" aria-hidden />}
          {!collapsed && ut('collapseSidebar')}
        </button>
      )}
      {!collapsed && <p className="border-t border-white/[0.06] px-5 py-3 text-[11px] leading-snug text-slate-500">{ut('orgName')}</p>}
    </div>
  );
}

function AccountMenu({ user }: { user: Employee }) {
  const { t, lang, setLang } = useI18n();
  const ut = useUt();
  const [, navigate] = useLocation();
  const { signOut, pending } = useSignOut();
  const langs = [{ code: 'en' as const, label: ut('langEn') }, { code: 'ar' as const, label: ut('langAr') }];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={ut('account')} data-testid="button-account-menu">
          <UserChip user={user} />
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate text-sm font-medium">{displayName(user)}</div>
          <div className="truncate text-xs text-muted-foreground" dir="ltr" style={{ textAlign: 'start' }}>{user.username}</div>
          <div className="mt-1 inline-flex rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground" data-testid="text-account-role">{t(`role_${user.role}` as MsgKey)}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2 py-1 text-xs font-medium text-muted-foreground"><Globe className="h-3.5 w-3.5" aria-hidden />{ut('language')}</DropdownMenuLabel>
        {langs.map((l) => (
          <DropdownMenuItem key={l.code} onSelect={() => setLang(l.code)} data-testid={`button-lang-${l.code}`} aria-checked={lang === l.code} role="menuitemradio">
            <Check className={cn('h-4 w-4', lang === l.code ? 'opacity-100 text-primary' : 'opacity-0')} aria-hidden />
            <span lang={l.code} dir={l.code === 'ar' ? 'rtl' : 'ltr'}>{l.label}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {!user.must_change_password && (
          <DropdownMenuItem onSelect={() => navigate('/password')} data-testid="link-nav-password">
            <KeyRound className="h-4 w-4" aria-hidden />{t('navPassword')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); if (!pending) void signOut(); }} disabled={pending} data-testid="button-sign-out" className="text-destructive focus:text-destructive">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LogOut className="h-4 w-4 rtl:-scale-x-100" aria-hidden />}
          {pending ? t('signingOut') : t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const COLLAPSE_KEY = 'yl.sidebar.collapsed';

export function AppShell({ user, children, minimal = false, wide = false }: { user: Employee; children: ReactNode; minimal?: boolean; wide?: boolean }) {
  const { t, dir } = useI18n();
  const ut = useUt();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; } });
  const menuTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch { /* storage unavailable */ } }, [collapsed]);

  if (minimal) {
    return (
      <div className="min-h-[100dvh] w-full bg-background">
        <header className="flex h-14 items-center justify-between gap-3 border-b bg-card px-5">
          <BrandLockup />
          <AccountMenu user={user} />
        </header>
        <main className="mx-auto max-w-2xl px-5 py-10">{children}</main>
      </div>
    );
  }

  return (
    <AssistantProvider allowCompare={canAccess(user.role, 'comparison')}>
    <div className={cn('min-h-[100dvh] w-full bg-background transition-[padding] duration-200', collapsed ? 'lg:ps-[68px]' : 'lg:ps-60')}>
      <aside className={cn('fixed inset-y-0 start-0 z-40 hidden transition-[width] duration-200 lg:block', collapsed ? 'w-[68px]' : 'w-60')}>
        <SidebarBody user={user} location={location} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side={dir === 'rtl' ? 'right' : 'left'} className="w-72 max-w-[85vw] border-0 p-0"
          onCloseAutoFocus={(event) => { event.preventDefault(); menuTrigger.current?.focus(); }}>
          <SheetTitle className="sr-only">{t('nav')}</SheetTitle>
          <SidebarBody user={user} location={location} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-card/95 px-4 backdrop-blur sm:px-6">
        <Button ref={menuTrigger} variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label={ut('openMenu')} data-testid="button-open-nav">
          <Menu className="h-5 w-5" aria-hidden />
        </Button>
        <span className="lg:hidden"><BrandLockup /></span>
        <span className="hidden text-sm font-medium text-muted-foreground lg:inline" data-testid="text-page-context">{ut(pageKey(location))}</span>
        <div className="flex-1" />
        <AccountMenu user={user} />
      </header>
      <main className={cn('mx-auto w-full px-4 py-6 sm:px-6 sm:py-8', wide ? 'max-w-[1680px]' : 'max-w-6xl')}>
        <div className="animate-in fade-in duration-200 motion-reduce:animate-none pb-16">{children}</div>
      </main>
    </div>
    </AssistantProvider>
  );
}
