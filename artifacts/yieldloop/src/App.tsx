import { useEffect, useRef, type ReactNode } from 'react';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { RotateCw, ShieldAlert } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AppShell } from '@/components/app-shell';
import { BrandMark, LangSwitch } from '@/components/brand';
import NotFound from '@/pages/not-found';
import ConnectivityPage from '@/pages/connectivity';
import LoginPage from '@/pages/login';
import HomePage from '@/pages/home';
import EmployeesPage from '@/pages/employees';
import PasswordPage from '@/pages/password';
import JobsPage from '@/pages/jobs';
import JobNewPage from '@/pages/job-new';
import JobDetailPage from '@/pages/job-detail';
import InventoryPage from '@/pages/inventory';
import InventoryDetailPage from '@/pages/inventory-detail';
import { DashboardPage, ReportsPage } from '@/pages/reports';
import { AuthError, useCurrentUser, type Employee } from '@/lib/auth';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { endSession, errorMessage, isSessionLoss, ME_KEY } from '@/lib/session';

function onProtectedError(err: unknown) {
  if (isSessionLoss(err)) {
    endSession(queryClient);
  } else if (err instanceof AuthError && err.code === 'password_change_required') {
    queryClient.invalidateQueries({ queryKey: ME_KEY });
  }
}

const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (err, query) => {
      if (query.queryKey[0] === 'auth' && query.queryKey[1] === 'me') return;
      onProtectedError(err);
    },
  }),
  mutationCache: new MutationCache({
    onError: (err) => {
      // Login failures are credential errors, not session loss.
      if (err instanceof AuthError && err.code === 'invalid_credentials') return;
      onProtectedError(err);
    },
  }),
});

function SessionSkeleton() {
  const { t } = useI18n();
  return (
    <div className="min-h-[100dvh] w-full bg-background" aria-busy aria-label={t('loadingSession')}>
      <div className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4">
          <BrandMark />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="ms-auto h-8 w-28" />
        </div>
      </div>
      <div className="mx-auto max-w-5xl space-y-3 px-5 py-12">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <Skeleton className="mt-6 h-48 w-full" />
      </div>
    </div>
  );
}

function SessionError({ error, retry }: { error: unknown; retry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background">
      <div className="flex justify-end p-4"><LangSwitch /></div>
      <div className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="max-w-sm text-center">
          <BrandMark className="mx-auto h-10 w-10" />
          <h1 className="mt-5 text-lg font-semibold">{t('sessionError')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{errorMessage(error, t)}</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={retry} data-testid="button-retry-session"><RotateCw className="h-4 w-4" aria-hidden />{t('retry')}</Button>
            <Link href="/health" className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted">{t('navHealth')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Forbidden() {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-md py-10 text-center" data-testid="panel-forbidden">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive" aria-hidden><ShieldAlert className="h-5 w-5" /></span>
      <h1 className="mt-4 text-xl font-semibold" data-testid="text-page-title">{t('forbiddenTitle')}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('forbiddenDesc')}</p>
      <Link href="/" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">{t('backHome')}</Link>
    </section>
  );
}

/** Clears cached data whenever the signed-in identity changes. */
function useSessionWatch(user: Employee | null | undefined) {
  const qc = useQueryClient();
  const last = useRef<number | null | undefined>(undefined);
  useEffect(() => {
    if (user === undefined) return;
    const id = user?.id ?? null;
    if (last.current !== undefined && last.current !== id) {
      qc.removeQueries({ predicate: (q) => !(q.queryKey[0] === 'auth' && q.queryKey[1] === 'me') });
    }
    last.current = id;
  }, [user, qc]);
}

function Authed({ user }: { user: Employee }) {
  const [location] = useLocation();
  if (user.must_change_password && location !== '/password') return <Redirect to="/password" replace />;
  if (user.must_change_password) {
    return <AppShell user={user} minimal><PasswordPage user={user} /></AppShell>;
  }
  return (
    <Switch>
      <Route path="/login"><Redirect to="/" replace /></Route>
      <Route path="/"><AppShell user={user}><HomePage user={user} /></AppShell></Route>
      <Route path="/employees">
        <AppShell user={user}>{user.role === 'manager' ? <EmployeesPage user={user} /> : <Forbidden />}</AppShell>
      </Route>
      <Route path="/jobs"><AppShell user={user}><JobsPage user={user} /></AppShell></Route>
      <Route path="/jobs/new">
        <AppShell user={user}>{user.role === 'manager' ? <JobNewPage /> : <Forbidden />}</AppShell>
      </Route>
      <Route path="/jobs/:id">
        {(params) => <AppShell user={user}><JobDetailPage key={params.id} id={Number(params.id)} /></AppShell>}
      </Route>
      <Route path="/inventory"><AppShell user={user}><InventoryPage /></AppShell></Route>
      <Route path="/inventory/:id">
        {(params) => <AppShell user={user}><InventoryDetailPage key={params.id} id={Number(params.id)} /></AppShell>}
      </Route>
      <Route path="/dashboard"><AppShell user={user}><DashboardPage /></AppShell></Route>
      <Route path="/reports"><AppShell user={user}><ReportsPage /></AppShell></Route>
      <Route path="/password"><AppShell user={user}><PasswordPage user={user} /></AppShell></Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function Protected() {
  const me = useCurrentUser();
  const [location] = useLocation();
  useSessionWatch(me.data);
  if (me.isPending) return <SessionSkeleton />;
  if (me.isError) return <SessionError error={me.error} retry={() => me.refetch()} />;
  if (!me.data) {
    if (location === '/login') return <LoginPage />;
    return <Redirect to="/login" replace />;
  }
  return <Authed user={me.data} />;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/health" component={ConnectivityPage} />
        <Route component={Protected} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
}

export default App;
