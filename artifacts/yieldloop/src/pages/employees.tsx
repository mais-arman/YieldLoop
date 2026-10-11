import { useMemo, useState, type FormEvent } from 'react';
import { Pager } from '@/components/pager';
import { pageSlice } from '@/lib/role-access';
import { useUt } from '@/lib/ui-i18n';

const EMP_PAGE_SIZE = 15;
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Loader2, Plus, RotateCw, Search, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FormAlert } from '@/components/brand';
import { PasswordInput } from '@/components/password-input';
import { useToast } from '@/hooks/use-toast';
import {
  createEmployee, resetEmployeePassword, updateEmployee, useEmployees, type Employee, type Role,
} from '@/lib/auth';
import { useI18n, type MsgKey } from '@/lib/i18n';
import { displayName, errorMessage, fieldErrors, initials, ROLES } from '@/lib/session';
import { cn } from '@/lib/utils';

const EMP_KEY = ['auth', 'employees'];

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-destructive">{msg}</p> : null;
}

function CreateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const blank = { username: '', first_name: '', last_name: '', role: 'cutting_operator' as Role, temporary_password: '' };
  const [f, setF] = useState(blank);
  const m = useMutation({
    mutationFn: () => createEmployee({
      username: f.username.trim(),
      first_name: f.first_name.trim() || undefined,
      last_name: f.last_name.trim() || undefined,
      role: f.role,
      temporary_password: f.temporary_password,
    }),
    onSuccess: (emp) => {
      setF(blank);
      m.reset();
      qc.invalidateQueries({ queryKey: EMP_KEY });
      toast({ title: t('created', { name: displayName(emp) }) });
      onOpenChange(false);
    },
    onError: () => setF((s) => ({ ...s, temporary_password: '' })),
  });
  const fe = fieldErrors(m.error, t);
  const close = (o: boolean) => {
    if (!o) { setF(blank); m.reset(); }
    onOpenChange(o);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!f.username.trim() || !f.temporary_password || m.isPending) return;
    m.mutate();
  };
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate data-testid="form-create-employee">
          <DialogHeader>
            <DialogTitle>{t('createTitle')}</DialogTitle>
            <DialogDescription>{t('createDesc')}</DialogDescription>
          </DialogHeader>
          <div className="mt-5 flex flex-col gap-4">
            {m.error && <FormAlert message={errorMessage(m.error, t)} testId="error-create-employee" />}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-username">{t('username')}</Label>
              <Input id="c-username" data-testid="input-new-username" dir="ltr" autoComplete="off" autoCapitalize="off" spellCheck={false}
                value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} aria-invalid={!!fe.username} />
              <FieldError msg={fe.username} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="c-first">{t('firstName')} <span className="font-normal text-muted-foreground">({t('optional')})</span></Label>
                <Input id="c-first" data-testid="input-new-first-name" autoComplete="off" value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} />
                <FieldError msg={fe.first_name} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="c-last">{t('lastName')} <span className="font-normal text-muted-foreground">({t('optional')})</span></Label>
                <Input id="c-last" data-testid="input-new-last-name" autoComplete="off" value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} />
                <FieldError msg={fe.last_name} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-role">{t('roleLabel')}</Label>
              <Select value={f.role} onValueChange={(v) => setF({ ...f, role: v as Role })}>
                <SelectTrigger id="c-role" data-testid="select-new-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{t(`role_${r}` as MsgKey)}</SelectItem>)}
                </SelectContent>
              </Select>
              <FieldError msg={fe.role} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-temp">{t('temporaryPassword')}</Label>
              <PasswordInput id="c-temp" data-testid="input-new-temp-password" autoComplete="new-password"
                value={f.temporary_password} onChange={(e) => setF({ ...f, temporary_password: e.target.value })} aria-invalid={!!fe.temporary_password} />
              <FieldError msg={fe.temporary_password} />
              <p className="text-xs text-muted-foreground">{t('tempHint')}</p>
            </div>
            <FieldError msg={fe.non_field_errors} />
          </div>
          <DialogFooter className="mt-6 gap-2">
            <Button type="button" variant="outline" onClick={() => close(false)}>{t('cancel')}</Button>
            <Button type="submit" data-testid="button-submit-employee" disabled={m.isPending || !f.username.trim() || !f.temporary_password}>
              {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
              {m.isPending ? t('creating') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetDialog({ emp, onClose }: { emp: Employee | null; onClose: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [pwd, setPwd] = useState('');
  const m = useMutation({
    mutationFn: (id: number) => resetEmployeePassword(id, pwd),
    onSuccess: (updated) => {
      setPwd('');
      m.reset();
      qc.invalidateQueries({ queryKey: EMP_KEY });
      toast({ title: t('resetDone', { name: displayName(updated) }) });
      onClose();
    },
    onError: () => setPwd(''),
  });
  const fe = fieldErrors(m.error, t);
  const close = () => { setPwd(''); m.reset(); onClose(); };
  return (
    <Dialog open={!!emp} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="sm:max-w-md">
        {emp && (
          <form onSubmit={(e) => { e.preventDefault(); if (pwd && !m.isPending) m.mutate(emp.id); }} noValidate data-testid="form-reset-password">
            <DialogHeader>
              <DialogTitle>{t('resetTitle', { name: displayName(emp) })}</DialogTitle>
              <DialogDescription>{t('resetDesc')}</DialogDescription>
            </DialogHeader>
            <div className="mt-5 flex flex-col gap-3">
              {m.error && <FormAlert message={errorMessage(m.error, t)} testId="error-reset-password" />}
              <Label htmlFor="r-temp">{t('temporaryPassword')}</Label>
              <PasswordInput id="r-temp" data-testid="input-reset-temp-password" autoComplete="new-password" autoFocus value={pwd} onChange={(e) => setPwd(e.target.value)} aria-invalid={!!fe.temporary_password} />
              <FieldError msg={fe.temporary_password} />
              <FieldError msg={fe.non_field_errors} />
              <p className="text-xs text-muted-foreground">{t('tempHint')}</p>
            </div>
            <DialogFooter className="mt-6 gap-2">
              <Button type="button" variant="outline" onClick={close}>{t('cancel')}</Button>
              <Button type="submit" data-testid="button-submit-reset" disabled={!pwd || m.isPending}>
                {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />}
                {m.isPending ? t('resetting') : t('resetSubmit')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PwdState({ e }: { e: Employee }) {
  const { t } = useI18n();
  if (e.temporary_password_expired) return <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">{t('pwdExpired')}</span>;
  if (e.must_change_password) return <span className="rounded-full bg-[hsl(38_92%_50%/0.14)] px-2 py-0.5 text-xs font-medium text-[hsl(32_81%_29%)]">{t('pwdTemporary')}</span>;
  return <span className="text-xs text-muted-foreground">{t('pwdSet')}</span>;
}

function EmployeeRow({ e, self, onReset, onDeactivate }: { e: Employee; self: boolean; onReset: () => void; onDeactivate: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (data: { role?: Role; is_active?: boolean }) => updateEmployee(e.id, data),
    onSuccess: (u, vars) => {
      qc.setQueryData<Employee[]>(EMP_KEY, (list) => list?.map((x) => (x.id === u.id ? u : x)));
      qc.invalidateQueries({ queryKey: EMP_KEY });
      if (vars.role) toast({ title: t('roleUpdated', { name: displayName(u), role: t(`role_${u.role}` as MsgKey) }) });
      else if (vars.is_active) toast({ title: t('activated', { name: displayName(u) }) });
    },
    onError: (err) => toast({ variant: 'destructive', title: errorMessage(err, t) }),
  });
  const [pendingRole, setPendingRole] = useState<Role | null>(null);
  return (
    <li className={cn('grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-[1.6fr_1.2fr_0.9fr_1fr_auto] md:items-center md:gap-4', !e.is_active && 'bg-muted/40')} data-testid={`row-employee-${e.id}`}>
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold', e.is_active ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground')} aria-hidden>{initials(e)}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 truncate text-sm font-medium">
            {displayName(e)}
            {self && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">{t('you')}</span>}
          </div>
          <div className="truncate font-mono text-xs text-muted-foreground" dir="ltr">{e.username}</div>
        </div>
      </div>
      <div>
        <Select value={e.role} disabled={self || m.isPending} onValueChange={(v) => { if (v !== e.role) setPendingRole(v as Role); }}>
          <SelectTrigger className="h-9" aria-label={t('colRole')} data-testid={`select-role-${e.id}`}><SelectValue /></SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => <SelectItem key={r} value={r}>{t(`role_${r}` as MsgKey)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Switch
          checked={e.is_active}
          disabled={self || m.isPending}
          data-testid={`switch-active-${e.id}`}
          aria-label={e.is_active ? t('deactivate') : t('activate')}
          onCheckedChange={(on) => (on ? m.mutate({ is_active: true }) : onDeactivate())}
        />
        <span className={e.is_active ? '' : 'text-muted-foreground'}>{e.is_active ? t('active') : t('inactive')}</span>
      </label>
      <div><PwdState e={e} /></div>
      <div className="md:text-end">
        <Button variant="outline" size="sm" disabled={self} onClick={onReset} data-testid={`button-reset-${e.id}`}>
          <KeyRound className="h-3.5 w-3.5" aria-hidden />
          {t('resetPassword')}
        </Button>
      </div>
      <AlertDialog open={pendingRole !== null} onOpenChange={(o) => { if (!o) setPendingRole(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('colRole')}: {displayName(e)}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(`role_${e.role}` as MsgKey)} → {pendingRole ? t(`role_${pendingRole}` as MsgKey) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid={`button-cancel-role-${e.id}`}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction data-testid={`button-confirm-role-${e.id}`} onClick={() => { if (pendingRole) m.mutate({ role: pendingRole }); setPendingRole(null); }}>{t('colRole')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

export default function EmployeesPage({ user }: { user: Employee }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const q = useEmployees(user.role === 'manager');
  const ut = useUt();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [resetFor, setResetFor] = useState<Employee | null>(null);
  const [deact, setDeact] = useState<Employee | null>(null);

  const deactM = useMutation({
    mutationFn: (id: number) => updateEmployee(id, { is_active: false }),
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: EMP_KEY });
      toast({ title: t('deactivated', { name: displayName(u) }) });
      setDeact(null);
    },
    onError: (err) => { toast({ variant: 'destructive', title: errorMessage(err, t) }); setDeact(null); },
  });

  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const counts = useMemo(() => {
    const all = q.data ?? [];
    return { active: all.filter((x) => x.is_active).length, inactive: all.filter((x) => !x.is_active).length, temp: all.filter((x) => x.is_active && (x.must_change_password || x.temporary_password_expired)).length };
  }, [q.data]);
  const list = useMemo(() => {
    const all = [...(q.data ?? [])].filter((e) => roleFilter === 'all' || e.role === roleFilter).sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.username.localeCompare(b.username));
    const s = query.trim().toLowerCase();
    if (!s) return all;
    return all.filter((e) => `${e.username} ${e.first_name} ${e.last_name}`.toLowerCase().includes(s));
  }, [q.data, query, roleFilter]);
  // Employees API returns a bounded array without a paging contract; page it client-side.
  const [empPage, setEmpPage] = useState(1);
  const paged = pageSlice(list, empPage, EMP_PAGE_SIZE);

  return (
    <div className="space-y-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">{t('empTitle')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('empSubtitle')}</p>
        </div>
        <Button onClick={() => setCreating(true)} data-testid="button-add-employee">
          <Plus className="h-4 w-4" aria-hidden />
          {t('addEmployee')}
        </Button>
      </div>

      {q.data && (
        <dl className="mt-6 flex flex-wrap gap-2 text-sm" data-testid="panel-employee-counts">
          <div className="flex items-baseline gap-2 rounded-md border bg-card px-3 py-1.5"><dt className="text-muted-foreground">{t('active')}</dt><dd className="font-mono font-semibold">{counts.active}</dd></div>
          <div className="flex items-baseline gap-2 rounded-md border bg-card px-3 py-1.5"><dt className="text-muted-foreground">{t('inactive')}</dt><dd className="font-mono font-semibold">{counts.inactive}</dd></div>
          <div className={cn('flex items-baseline gap-2 rounded-md border px-3 py-1.5', counts.temp > 0 ? 'border-[hsl(38_92%_50%/0.4)] bg-[hsl(38_92%_50%/0.08)]' : 'bg-card')}><dt className="text-muted-foreground">{t('pwdTemporary')}</dt><dd className="font-mono font-semibold">{counts.temp}</dd></div>
        </dl>
      )}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input className="ps-9" placeholder={t('searchEmployees')} aria-label={t('searchEmployees')} value={query} onChange={(e) => { setQuery(e.target.value); setEmpPage(1); }} data-testid="input-search-employees" />
        </div>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v as Role | 'all'); setEmpPage(1); }}>
          <SelectTrigger className="sm:w-52" aria-label={t('colRole')} data-testid="select-role-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ut('allRoles')}</SelectItem>
            {ROLES.map((r) => <SelectItem key={r} value={r}>{t(`role_${r}` as MsgKey)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border bg-card">
        <div className="hidden grid-cols-[1.6fr_1.2fr_0.9fr_1fr_auto] gap-4 border-b bg-muted/50 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground md:grid">
          <span>{t('colEmployee')}</span><span>{t('colRole')}</span><span>{t('colStatus')}</span><span>{t('colPassword')}</span><span className="text-end">{t('colActions')}</span>
        </div>
        {q.isPending ? (
          <ul className="divide-y" aria-busy>
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-24" /></div>
                <Skeleton className="hidden h-8 w-32 md:block" />
              </li>
            ))}
          </ul>
        ) : q.isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <p className="text-sm font-medium">{t('loadError')}</p>
            <p className="text-sm text-muted-foreground">{errorMessage(q.error, t)}</p>
            <Button variant="outline" size="sm" onClick={() => q.refetch()} data-testid="button-retry-employees">
              <RotateCw className="h-3.5 w-3.5" aria-hidden />{t('retry')}
            </Button>
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground" aria-hidden><Users className="h-5 w-5" /></span>
            {query.trim() ? (
              <p className="text-sm text-muted-foreground">{t('noMatches', { q: query.trim() })}</p>
            ) : (
              <>
                <p className="mt-2 text-sm font-medium">{t('emptyEmployees')}</p>
                <p className="text-sm text-muted-foreground">{t('emptyEmployeesDesc')}</p>
              </>
            )}
          </div>
        ) : (
          <ul className="divide-y">
            {paged.rows.map((e) => (
              <EmployeeRow key={e.id} e={e} self={e.id === user.id} onReset={() => setResetFor(e)} onDeactivate={() => setDeact(e)} />
            ))}
          </ul>
        )}
        <Pager page={paged.page} totalPages={paged.totalPages} onPage={setEmpPage} testId="employees" className="border-t px-4 py-2" />
      </div>

      <CreateDialog open={creating} onOpenChange={setCreating} />
      <ResetDialog emp={resetFor} onClose={() => setResetFor(null)} />
      <AlertDialog open={!!deact} onOpenChange={(o) => { if (!o && !deactM.isPending) setDeact(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deact ? t('deactivateTitle', { name: displayName(deact) }) : ''}</AlertDialogTitle>
            <AlertDialogDescription>{t('deactivateDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactM.isPending}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-deactivate"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deactM.isPending}
              onClick={(ev) => { ev.preventDefault(); if (deact) deactM.mutate(deact.id); }}
            >
              {deactM.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {t('deactivate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
