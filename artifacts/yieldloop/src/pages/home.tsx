import { Link } from 'wouter';
import { ArrowRight, KeyRound, ShieldCheck, Users } from 'lucide-react';
import type { Employee } from '@/lib/auth';
import { useI18n, type MsgKey } from '@/lib/i18n';
import { displayName, initials, ROLES } from '@/lib/session';
import { cn } from '@/lib/utils';

export default function HomePage({ user }: { user: Employee }) {
  const { t } = useI18n();
  const fullName = `${user.first_name} ${user.last_name}`.trim();
  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-500">
      <p className="text-sm text-muted-foreground">{t('welcome', { name: displayName(user) })}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight" data-testid="text-page-title">{t('homeTitle')}</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{t('homeSubtitle')}</p>

      <div className="mt-8 grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <section className="rounded-lg border bg-card p-6" aria-labelledby="identity-h">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[hsl(222_47%_11%)] text-lg font-semibold text-[hsl(160_84%_55%)]" aria-hidden>
              {initials(user)}
            </span>
            <div>
              <h2 id="identity-h" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('identity')}</h2>
              <div className="text-lg font-semibold" data-testid="text-user-name">{displayName(user)}</div>
            </div>
          </div>
          <dl className="mt-6 grid gap-x-6 gap-y-4 border-t pt-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">{t('username')}</dt>
              <dd className="mt-0.5 font-mono" dir="ltr" data-testid="text-username">{user.username}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('fullName')}</dt>
              <dd className={cn('mt-0.5', !fullName && 'text-muted-foreground')}>{fullName || t('notSet')}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('roleLabel')}</dt>
              <dd className="mt-0.5 font-medium" data-testid="text-role">{t(`role_${user.role}` as MsgKey)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('accountStatus')}</dt>
              <dd className="mt-0.5 inline-flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', user.is_active ? 'bg-[hsl(var(--success))]' : 'bg-destructive')} aria-hidden />
                {user.is_active ? t('active') : t('inactive')}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border bg-card p-6" aria-labelledby="role-h">
          <h2 id="role-h" className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {t('roleLabel')}
          </h2>
          <ol className="mt-4 flex flex-col gap-2">
            {ROLES.map((r) => {
              const mine = r === user.role;
              return (
                <li
                  key={r}
                  className={cn('rounded-md border px-3 py-2.5 transition-colors', mine ? 'border-primary/40 bg-accent' : 'border-transparent opacity-60')}
                  aria-current={mine ? 'true' : undefined}
                >
                  <div className={cn('text-sm', mine ? 'font-semibold text-accent-foreground' : 'font-medium')}>{t(`role_${r}` as MsgKey)}</div>
                  <div className="text-xs text-muted-foreground">{t(`roleScope_${r}` as MsgKey)}</div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {user.role === 'manager' && (
          <Link href="/employees" data-testid="link-manage-employees" className="group flex flex-1 items-center justify-between gap-3 rounded-lg border bg-card px-5 py-4 text-sm font-medium transition-colors hover:border-primary/40">
            <span className="flex items-center gap-3"><Users className="h-4 w-4 text-primary" aria-hidden />{t('manageEmployees')}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden />
          </Link>
        )}
        <Link href="/password" data-testid="link-change-password" className="group flex flex-1 items-center justify-between gap-3 rounded-lg border bg-card px-5 py-4 text-sm font-medium transition-colors hover:border-primary/40">
          <span className="flex items-center gap-3"><KeyRound className="h-4 w-4 text-primary" aria-hidden />{t('changeMyPassword')}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
