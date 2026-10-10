import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { KeyRound, Loader2, TimerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FormAlert } from '@/components/brand';
import { PasswordInput } from '@/components/password-input';
import { SignOutButton } from '@/components/app-shell';
import { AuthError, changePassword, type Employee } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { endSession, errorMessage, fieldErrors, ME_KEY } from '@/lib/session';

function ExpiredNotice() {
  const { t } = useI18n();
  return (
    <section className="max-w-lg rounded-lg border border-destructive/30 bg-card p-6" data-testid="panel-password-expired">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive" aria-hidden>
        <TimerOff className="h-5 w-5" />
      </span>
      <h1 className="mt-4 text-xl font-semibold" data-testid="text-page-title">{t('pwdExpiredTitle')}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('pwdExpiredDesc')}</p>
      <div className="mt-6"><SignOutButton variant="default" /></div>
    </section>
  );
}

export default function PasswordPage({ user }: { user: Employee }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [local, setLocal] = useState<string | null>(null);
  const forced = user.must_change_password;

  const m = useMutation({
    mutationFn: () => changePassword(current, next),
    onSuccess: () => {
      setCurrent(''); setNext(''); setConfirm('');
      endSession(qc);
      navigate('/login?notice=changed', { replace: true });
    },
    onError: (err) => {
      setCurrent('');
      if (err instanceof AuthError && err.code === 'temporary_password_expired') {
        qc.setQueryData<Employee | null>(ME_KEY, (u) => (u ? { ...u, temporary_password_expired: true } : u));
      }
    },
  });

  if (user.temporary_password_expired) return <ExpiredNotice />;

  const fe = fieldErrors(m.error, t);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!current || !next || !confirm) return setLocal(t('required'));
    if (next !== confirm) return setLocal(t('mismatch'));
    if (next === current) return setLocal(t('sameAsCurrent'));
    setLocal(null);
    m.mutate();
  };

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_1.2fr] animate-in fade-in slide-in-from-bottom-1 duration-500">
      <div>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground" aria-hidden>
          <KeyRound className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight" data-testid="text-page-title">{forced ? t('pwdRequiredTitle') : t('pwdTitle')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{forced ? t('pwdRequiredDesc') : ''} {t('pwdSubtitle')}</p>
        {forced && <div className="mt-6"><SignOutButton variant="outline" /></div>}
      </div>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-lg border bg-card p-6" data-testid="form-password">
        {(local || m.error) && <FormAlert message={local ?? errorMessage(m.error, t)} testId="error-password" />}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="current">{forced ? t('currentTempPassword') : t('currentPassword')}</Label>
          <PasswordInput id="current" data-testid="input-current-password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} aria-invalid={!!fe.current_password} />
          {fe.current_password && <p className="text-xs text-destructive">{fe.current_password}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new">{t('newPassword')}</Label>
          <PasswordInput id="new" data-testid="input-new-password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} aria-invalid={!!fe.new_password} />
          {fe.new_password && <p className="text-xs text-destructive">{fe.new_password}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm">{t('confirmPassword')}</Label>
          <PasswordInput id="confirm" data-testid="input-confirm-password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {Object.entries(fe).filter(([k]) => k !== 'current_password' && k !== 'new_password').map(([k, v]) => (
          <p key={k} className="text-xs text-destructive">{v}</p>
        ))}
        <Button type="submit" className="mt-2" data-testid="button-save-password" disabled={m.isPending}>
          {m.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {m.isPending ? t('saving') : t('savePassword')}
        </Button>
      </form>
    </div>
  );
}
