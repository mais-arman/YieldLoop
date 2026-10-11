import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandLockup, FormAlert, LangSwitch } from '@/components/brand';
import { PasswordInput } from '@/components/password-input';
import { login } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { errorMessage, fieldErrors, startSession } from '@/lib/session';
import { useUt } from '@/lib/ui-i18n';
import { roleHome } from '@/lib/role-home';

export default function LoginPage() {
  const { t } = useI18n();
  const ut = useUt();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const submitting = useRef(false);
  const notice = new URLSearchParams(window.location.search).get('notice');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const pwdRef = useRef<HTMLInputElement>(null);

  const m = useMutation({
    mutationFn: () => login(username.trim(), password),
    onSuccess: async ({ user }) => {
      setPassword('');
      setUsername('');
      await startSession(qc, user);
      navigate(user.must_change_password ? '/password' : roleHome(user.role), { replace: true });
    },
    onError: () => {
      setPassword('');
      pwdRef.current?.focus();
    },
    onSettled: () => { submitting.current = false; },
  });
  const fe = fieldErrors(m.error, t);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password || m.isPending || submitting.current) return;
    submitting.current = true;
    m.mutate();
  };

  return (
    <div className="grid min-h-[100dvh] w-full bg-background lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden border-e bg-[hsl(216_45%_95%)] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <BrandLockup size="lg" />
        <div className="relative">
          <SheetIllustration />
          <h2 className="mt-10 text-3xl font-semibold leading-tight tracking-tight text-foreground">{ut('loginTagline')}</h2>
          <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">{ut('loginLead')}</p>
        </div>
        <p className="text-sm text-muted-foreground">{ut('orgName')}</p>
      </aside>

      <div className="flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 lg:justify-end">
          <span className="lg:hidden"><BrandLockup /></span>
          <LangSwitch />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-16">
          <form onSubmit={submit} noValidate className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500" data-testid="form-login">
            <p className="text-sm font-medium text-primary lg:hidden">{ut('loginTagline')}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight" data-testid="text-page-title">{t('signIn')}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground lg:hidden">{ut('loginLead')}</p>

            <div className="mt-6 flex flex-col gap-3">
              {notice === 'changed' && !m.error && <FormAlert tone="info" message={t('passwordChangedNotice')} testId="notice-login" />}
              {notice === 'ended' && !m.error && <FormAlert tone="info" message={t('sessionEndedNotice')} testId="notice-login" />}
              {m.error && <FormAlert message={errorMessage(m.error, t)} testId="error-login" />}
            </div>

            <div className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="username">{t('username')}</Label>
                <Input
                  id="username"
                  data-testid="input-username"
                  dir="ltr"
                  autoComplete="username"
                  autoCapitalize="off"
                  spellCheck={false}
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  aria-invalid={!!fe.username}
                />
                {fe.username && <p className="text-xs text-destructive">{fe.username}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">{t('password')}</Label>
                <PasswordInput
                  id="password"
                  ref={pwdRef}
                  data-testid="input-password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!fe.password}
                />
                {fe.password && <p className="text-xs text-destructive">{fe.password}</p>}
              </div>
              <Button type="submit" className="mt-2 w-full" data-testid="button-sign-in" disabled={m.isPending || !username.trim() || !password}>
                {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LogIn className="h-4 w-4 rtl:-scale-x-100" aria-hidden />}
                {m.isPending ? t('signingIn') : t('signIn')}
              </Button>
            </div>
            <p className="mt-6 text-xs leading-relaxed text-muted-foreground">{t('noAccount')}</p>
            <p className="mt-8 border-t pt-4 text-xs text-muted-foreground lg:hidden">{ut('orgName')}</p>
          </form>
        </div>
      </div>
    </div>
  );
}

/** Abstract cutting layout: one sheet, placed parts, reusable offcut and the recovery loop. Decorative only. */
function SheetIllustration() {
  return (
    <svg viewBox="0 0 360 220" className="w-full max-w-md" aria-hidden>
      <rect x="10" y="14" width="250" height="190" rx="10" fill="hsl(0 0% 100%)" stroke="hsl(218 26% 84%)" />
      {[[26, 30, 100, 70], [134, 30, 110, 70], [26, 108, 70, 80], [104, 108, 70, 80]].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="4" fill="hsl(217 71% 33% / 0.1)" stroke="hsl(217 71% 33% / 0.55)" />
      ))}
      <rect x="182" y="108" width="62" height="80" rx="4" fill="hsl(172 62% 38% / 0.14)" stroke="hsl(172 62% 38%)" strokeDasharray="4 3" />
      <path d="M10 104h250M130 14v90" stroke="hsl(217 71% 33% / 0.25)" strokeDasharray="3 4" />
      <path d="M262 150c62 0 84-36 70-74s-58-52-92-36" fill="none" stroke="hsl(172 62% 38%)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M248 32l-10 9 13 4" fill="none" stroke="hsl(172 62% 38%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
