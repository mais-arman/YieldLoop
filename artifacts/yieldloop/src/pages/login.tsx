import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandMark, FormAlert, LangSwitch } from '@/components/brand';
import { PasswordInput } from '@/components/password-input';
import { login } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { errorMessage, fieldErrors, startSession } from '@/lib/session';

export default function LoginPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const notice = new URLSearchParams(window.location.search).get('notice');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const pwdRef = useRef<HTMLInputElement>(null);

  const m = useMutation({
    mutationFn: () => login(username.trim(), password),
    onSuccess: ({ user }) => {
      setPassword('');
      setUsername('');
      startSession(qc, user);
      // Start a fresh document after the server rotates the session cookie.
      // This prevents an older anonymous /me result or route guard from racing
      // the login transition (especially after a rejected credential attempt).
      const base = import.meta.env.BASE_URL.replace(/\/$/, '');
      window.location.replace(`${base}${user.must_change_password ? '/password' : '/'}`);
    },
    onError: () => {
      setPassword('');
      pwdRef.current?.focus();
    },
  });
  const fe = fieldErrors(m.error, t);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password || m.isPending) return;
    m.mutate();
  };

  return (
    <div className="grid min-h-[100dvh] w-full bg-background lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[hsl(222_47%_11%)] text-[hsl(210_40%_96%)] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden>
          <defs>
            <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M28 0H0V28" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        <svg viewBox="0 0 400 400" className="pointer-events-none absolute -bottom-24 -end-24 h-[460px] w-[460px] text-[hsl(160_84%_39%)] opacity-30" aria-hidden>
          <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 10" />
          <circle cx="200" cy="200" r="100" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="200" cy="200" r="50" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
        <div className="relative flex items-center gap-3">
          <BrandMark className="h-9 w-9" />
          <span className="text-base font-semibold" dir="ltr">{t('brand')}</span>
        </div>
        <div className="relative max-w-md">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-[hsl(160_84%_55%)]">{t('phase')}</div>
          <p className="mt-4 text-3xl font-semibold leading-snug">{t('signInSubtitle')}</p>
        </div>
        <div className="relative font-mono text-xs text-[hsl(210_40%_96%/0.55)]" dir="ltr">/api/v1/auth</div>
      </aside>

      <div className="flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 lg:justify-end">
          <div className="flex items-center gap-2.5 lg:hidden">
            <BrandMark />
            <span className="text-sm font-semibold" dir="ltr">{t('brand')}</span>
          </div>
          <LangSwitch />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-16">
          <form onSubmit={submit} noValidate className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500" data-testid="form-login">
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">{t('signInTitle')}</h1>
            <p className="mt-2 text-sm text-muted-foreground lg:hidden">{t('signInSubtitle')}</p>

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
          </form>
        </div>
      </div>
    </div>
  );
}
