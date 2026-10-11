import { useRef, useState, type MouseEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, ListTree, Lock, RotateCw, Ruler, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { JobNumber, StatusBadge, jobErrorMessage } from '@/components/job-ui';
import { AuthError, type Employee } from '@/lib/auth';
import { useJob, type ProductionJob } from '@/lib/jobs';
import { useI18n } from '@/lib/i18n';
import { PlanList } from '@/components/cutting/plan-list';
import { PlanEditor } from '@/components/cutting/plan-editor';
import { ConfirmDialog, type ConfirmSpec } from '@/components/cutting/confirm-dialog';
import { useCt, type CtKey } from '@/components/cutting/cutting-i18n';
import { useUt } from '@/lib/ui-i18n';
import { jobLabel } from '@/lib/core-helpers';

export function canWriteCutting(user: Employee, job: ProductionJob) {
  if (user.role === 'manager') return job.status === 'draft' || job.status === 'open';
  if (user.role === 'production_supervisor') return job.status === 'open';
  return false;
}

export default function CuttingStudioPage({ id, user }: { id: number; user: Employee }) {
  const { t } = useI18n();
  const ct = useCt();
  const q = useJob(id);
  if (!Number.isInteger(id) || id <= 0 || (q.isError && q.error instanceof AuthError && (q.error.status === 404 || q.error.code === 'not_found'))) {
    return (
      <div className="mx-auto max-w-md py-10 text-center" data-testid="panel-job-not-found">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground" aria-hidden><SearchX className="h-5 w-5" /></span>
        <h1 className="mt-4 text-xl font-semibold" data-testid="text-page-title">{t('jobNotFoundTitle')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('err_not_found')}</p>
        <Link href="/cutting" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">{ct('studioTitle')}</Link>
      </div>
    );
  }
  if (q.isPending) return <div className="space-y-4" aria-busy><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-72 max-w-full" /><Skeleton className="h-96 w-full" /></div>;
  if (q.isError && !q.data) {
    return (
      <div className="mx-auto max-w-md py-10 text-center" role="alert">
        <h1 className="text-lg font-semibold">{t('jobLoadError')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{jobErrorMessage(q.error, t)}</p>
        <Button className="mt-6" variant="outline" onClick={() => q.refetch()}><RotateCw className="h-4 w-4" aria-hidden />{t('retry')}</Button>
      </div>
    );
  }
  return <Studio job={q.data!} user={user} />;
}

function Studio({ job, user }: { job: ProductionJob; user: Employee }) {
  const ct = useCt();
  const [, navigate] = useLocation();
  const writable = canWriteCutting(user, job);
  const [sel, setSel] = useState<{ id: number | null; nonce: number } | null>(null);
  const dirty = useRef(false);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [plansOpen, setPlansOpen] = useState(false);
  const ut = useUt();

  const guard = (fn: () => void) => {
    if (!dirty.current) { fn(); return; }
    setConfirm({ title: ct('leaveConfirmTitle'), desc: ct('leaveConfirmDesc'), action: ct('leave'), cancel: ct('stay'), onConfirm: () => { dirty.current = false; fn(); } });
  };
  const guardLink = (href: string) => (e: MouseEvent) => { if (dirty.current) { e.preventDefault(); guard(() => navigate(href)); } };

  const planList = (
    <PlanList jobId={job.id} active={sel?.id ?? null} isNew={sel !== null && sel.id === null} writable={writable}
      onOpen={(id) => { if (sel?.id !== id) guard(() => setSel({ id, nonce: Date.now() })); }}
      onNew={() => guard(() => setSel({ id: null, nonce: Date.now() }))} />
  );
  let notice: CtKey | null = null;
  if (!writable) notice = job.status === 'cancelled' ? 'readOnlyCancelled' : user.role === 'production_supervisor' && job.status === 'draft' ? 'readOnlyDraftSup' : 'readOnlyOperator';

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-500">
      <Link href={`/jobs/${job.id}`} onClick={guardLink(`/jobs/${job.id}`)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-job">
        <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden />{ct('backToJob')}
      </Link>
      <header className="mt-3 flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"><Ruler className="h-3.5 w-3.5" aria-hidden />{ct('studioTitle')}</span>
          <JobNumber value={jobLabel(job)} className="text-sm" />
          <StatusBadge status={job.status} />
        </div>
        <h1 className="break-words text-xl font-semibold tracking-tight sm:text-2xl" data-testid="text-page-title">{job.title}</h1>
        <p className="max-w-3xl text-xs text-muted-foreground sm:text-sm">{ct('studioScope')}</p>
      </header>
      {notice && (
        <p className="mt-4 flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground" data-testid="text-cutting-readonly">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{ct(notice)}
        </p>
      )}
      {sel === null ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside>{planList}</aside>
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden><Ruler className="h-5 w-5" /></span>
            <p className="max-w-sm text-sm text-muted-foreground">{ct('selectPlan')}</p>
            {writable && <Button onClick={() => setSel({ id: null, nonce: Date.now() })} data-testid="button-start-plan">{ct('newPlan')}</Button>}
          </div>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          <div>
            <Button type="button" variant="outline" size="sm" aria-expanded={plansOpen} onClick={() => setPlansOpen((o) => !o)} data-testid="button-toggle-plans">
              <ListTree className="h-3.5 w-3.5" aria-hidden />{plansOpen ? ut('hidePlans') : ut('showPlans')}
            </Button>
            {plansOpen && <div className="mt-3 max-w-md">{planList}</div>}
          </div>
          <PlanEditor key={sel.id === null ? `new-${sel.nonce}` : `plan-${sel.id}`} jobId={job.id} planId={sel.id} writable={writable}
            canCreateMaterial={user.role === 'manager'} onDirty={(d) => { dirty.current = d; }}
            onSaved={(p) => { if (sel.id !== p.id) setSel({ id: p.id, nonce: Date.now() }); }} />
        </div>
      )}
      <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
