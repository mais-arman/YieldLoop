import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowLeft, Ban, Loader2, Lock, PlayCircle, RotateCw, Save, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FormAlert } from '@/components/brand';
import { FieldError, JobNumber, StatusBadge, isStale, jobErrorMessage, jobFieldErrors, useFormatDate } from '@/components/job-ui';
import { useToast } from '@/hooks/use-toast';
import { AuthError } from '@/lib/auth';
import { JOBS_KEY, updateJob, useJob, type JobStatus, type JobUpdate, type ProductionJob } from '@/lib/jobs';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

function BackLink() {
  const { t } = useI18n();
  return (
    <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-jobs">
      <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden />{t('backToJobs')}
    </Link>
  );
}

export default function JobDetailPage({ id }: { id: number }) {
  const { t } = useI18n();
  const q = useJob(id);
  if (!Number.isInteger(id) || id <= 0 || (q.isError && q.error instanceof AuthError && (q.error.status === 404 || q.error.code === 'not_found'))) {
    return (
      <div className="mx-auto max-w-md py-10 text-center" data-testid="panel-job-not-found">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground" aria-hidden><SearchX className="h-5 w-5" /></span>
        <h1 className="mt-4 text-xl font-semibold" data-testid="text-page-title">{t('jobNotFoundTitle')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('err_not_found')}</p>
        <div className="mt-6"><BackLink /></div>
      </div>
    );
  }
  if (q.isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" aria-busy>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (q.isError && !q.data) {
    return (
      <div className="mx-auto max-w-md py-10 text-center" role="alert">
        <h1 className="text-lg font-semibold">{t('jobLoadError')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{jobErrorMessage(q.error, t)}</p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button variant="outline" onClick={() => q.refetch()} data-testid="button-retry-job"><RotateCw className="h-4 w-4" aria-hidden />{t('retry')}</Button>
          <BackLink />
        </div>
      </div>
    );
  }
  return <JobView key={id} job={q.data!} refetch={() => q.refetch()} />;
}

function JobView({ job, refetch }: { job: ProductionJob; refetch: () => Promise<{ data?: ProductionJob; isError?: boolean }> }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fmt = useFormatDate();
  const [title, setTitle] = useState(job.title);
  const [notes, setNotes] = useState(job.notes ?? '');
  const base = useRef({ title: job.title, notes: job.notes ?? '', revision: job.revision });
  const [confirm, setConfirm] = useState<JobStatus | null>(null);
  const [reloading, setReloading] = useState(false);

  const dirty = title !== base.current.title || notes !== base.current.notes;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  // Adopt newer server values only when the user has no unsaved input.
  useEffect(() => {
    if (job.revision !== base.current.revision && !dirtyRef.current) {
      base.current = { title: job.title, notes: job.notes ?? '', revision: job.revision };
      setTitle(job.title);
      setNotes(job.notes ?? '');
    }
  }, [job.revision, job.title, job.notes]);

  const adopt = (j: ProductionJob) => {
    base.current = { title: j.title, notes: j.notes ?? '', revision: j.revision };
    setTitle(j.title);
    setNotes(j.notes ?? '');
    qc.setQueryData([...JOBS_KEY, 'detail', j.id], j);
    qc.invalidateQueries({ queryKey: JOBS_KEY });
  };

  const save = useMutation({
    mutationFn: () => {
      const data: JobUpdate = { revision: base.current.revision };
      if (job.permissions.edit_title && title !== base.current.title) data.title = title.trim();
      if (job.permissions.edit_notes && notes !== base.current.notes) data.notes = notes;
      return updateJob(job.id, data);
    },
    onSuccess: (j) => { adopt(j); save.reset(); toast({ title: t('jobSaved') }); },
  });

  const transition = useMutation({
    mutationFn: (status: JobStatus) => updateJob(job.id, { revision: base.current.revision, status }),
    onSuccess: (j, status) => {
      setConfirm(null);
      adopt(j);
      toast({ title: t(status === 'open' ? 'jobOpened' : 'jobCancelled', { num: j.job_number }) });
    },
    onError: () => setConfirm(null),
  });

  const loadLatest = async () => {
    setReloading(true);
    try {
      const r = await refetch();
      if (r.isError || !r.data) {
        toast({ title: t('jobLoadError'), variant: 'destructive' });
        return;
      }
      adopt(r.data);
      save.reset();
      transition.reset();
    } finally {
      setReloading(false);
    }
  };

  const stale = isStale(save.error) || isStale(transition.error);
  const fe = jobFieldErrors(save.error, t);
  const canEdit = job.permissions.edit_title || job.permissions.edit_notes;
  const transitions = job.permissions.transitions ?? [];
  const otherError = !stale ? (save.error ?? transition.error) : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!dirty || save.isPending || transition.isPending || reloading || stale || (job.permissions.edit_title && !title.trim())) return;
    save.mutate();
  };

  const discard = () => { setTitle(base.current.title); setNotes(base.current.notes); save.reset(); };

  return (
    <div className="mx-auto max-w-3xl animate-in fade-in slide-in-from-bottom-1 duration-500">
      <BackLink />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <JobNumber value={job.job_number} className="text-sm" />
        <StatusBadge status={job.status} />
      </div>
      <h1 className={cn('mt-2 break-words text-2xl font-semibold tracking-tight', job.status === 'cancelled' && 'text-muted-foreground')} data-testid="text-page-title">{job.title}</h1>

      <div className="mt-8 grid gap-4 md:grid-cols-[1fr_16rem]">
        <form onSubmit={submit} noValidate className="flex flex-col gap-5 rounded-lg border bg-card p-5 sm:p-6" data-testid="form-edit-job">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">{t('jobDetails')}</h2>
            {dirty && <span className="rounded-full bg-[hsl(38_92%_50%/0.14)] px-2 py-0.5 text-xs font-medium text-[hsl(32_81%_29%)]" data-testid="badge-unsaved">{t('unsaved')}</span>}
          </div>

          {stale && (
            <div className="rounded-md border border-[hsl(38_92%_50%/0.4)] bg-[hsl(38_92%_50%/0.08)] p-4" role="alert" data-testid="alert-stale">
              <p className="text-sm font-semibold">{t('staleTitle')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('staleDesc')}</p>
              <Button type="button" size="sm" variant="outline" className="mt-3" onClick={loadLatest} disabled={reloading} data-testid="button-load-latest">
                {reloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RotateCw className="h-3.5 w-3.5" aria-hidden />}
                {t('loadLatest')}
              </Button>
            </div>
          )}
          {otherError && <FormAlert message={jobErrorMessage(otherError, t)} testId="error-job" />}

          {!canEdit && (
            <p className="flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground" data-testid="text-readonly">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {job.status === 'cancelled' ? t('cancelledLocked') : t('readOnlyJob')}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="e-title">{t('jobTitleLabel')}</Label>
            {job.permissions.edit_title ? (
              <Input id="e-title" value={title} disabled={save.isPending || transition.isPending || reloading} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!fe.title} data-testid="input-edit-title" />
            ) : (
              <p id="e-title" className="text-sm" data-testid="text-job-title">{job.title}</p>
            )}
            <FieldError msg={fe.title} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="e-notes">{t('jobNotesLabel')}</Label>
            {job.permissions.edit_notes ? (
              <Textarea id="e-notes" rows={7} value={notes} disabled={save.isPending || transition.isPending || reloading} onChange={(e) => setNotes(e.target.value)} aria-invalid={!!fe.notes} data-testid="input-edit-notes" />
            ) : (
              <p id="e-notes" className={cn('whitespace-pre-wrap break-words text-sm', !job.notes && 'text-muted-foreground')} data-testid="text-job-notes">{job.notes || t('noNotes')}</p>
            )}
            <FieldError msg={fe.notes} />
            {!job.permissions.edit_notes && job.status === 'draft' && !job.permissions.edit_title && transitions.includes('open') && (
              <p className="text-xs text-muted-foreground">{t('notesOnlyOpen')}</p>
            )}
          </div>
          <FieldError msg={fe.non_field_errors ?? fe.revision ?? fe.status} />

          {canEdit && (
            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={discard} disabled={!dirty || save.isPending} data-testid="button-discard">{t('discardChanges')}</Button>
              <Button type="submit" disabled={!dirty || save.isPending || transition.isPending || reloading || stale || (job.permissions.edit_title && !title.trim())} data-testid="button-save-job">
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
                {save.isPending ? t('saving') : t('saveChanges')}
              </Button>
            </div>
          )}
        </form>

        <aside className="flex flex-col gap-4">
          <section className="rounded-lg border bg-card p-5">
            <h2 className="text-sm font-semibold">{t('actions')}</h2>
            {transitions.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{job.status === 'cancelled' ? t('cancelledLocked') : t('noTransitions')}</p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {dirty && <p className="text-xs text-muted-foreground">{t('saveBeforeTransition')}</p>}
                {transitions.includes('open') && (
                  <Button onClick={() => setConfirm('open')} disabled={dirty || stale || reloading || save.isPending || transition.isPending} data-testid="button-open-job">
                    <PlayCircle className="h-4 w-4" aria-hidden />{t('openJob')}
                  </Button>
                )}
                {transitions.includes('cancelled') && (
                  <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirm('cancelled')} disabled={dirty || stale || reloading || save.isPending || transition.isPending} data-testid="button-cancel-job">
                    <Ban className="h-4 w-4" aria-hidden />{t('cancelJob')}
                  </Button>
                )}
              </div>
            )}
          </section>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-3 rounded-lg border bg-card p-5 text-sm md:grid-cols-1">
            <div><dt className="text-xs text-muted-foreground">{t('colCreatedBy')}</dt><dd className="font-mono text-xs" dir="ltr" style={{ textAlign: 'start' }}>{job.created_by.username}</dd></div>
            <div><dt className="text-xs text-muted-foreground">{t('revisionLabel')}</dt><dd className="font-mono text-xs" data-testid="text-revision">{job.revision}</dd></div>
            <div><dt className="text-xs text-muted-foreground">{t('createdLabel')}</dt><dd className="text-xs">{fmt(job.created_at)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">{t('updatedLabel')}</dt><dd className="text-xs">{fmt(job.updated_at)}</dd></div>
          </dl>
        </aside>
      </div>

      {confirm !== null && <AlertDialog open onOpenChange={(o) => { if (!o && !transition.isPending) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(confirm === 'open' ? 'openJobTitle' : 'cancelJobTitle', { num: job.job_number })}</AlertDialogTitle>
            <AlertDialogDescription>{confirm === 'open' ? t('openJobDesc') : t('cancelJobDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={transition.isPending}>{confirm === 'cancelled' ? t('keepJob') : t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-transition"
              className={confirm === 'cancelled' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
              disabled={transition.isPending}
              onClick={(ev) => { ev.preventDefault(); if (confirm) transition.mutate(confirm); }}
            >
              {transition.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {confirm === 'open' ? t('openJob') : t('cancelJob')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>}
    </div>
  );
}
