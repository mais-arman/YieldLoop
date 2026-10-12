import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, Ban, Bot, CheckCircle2, ChevronRight, FlaskConical, Ruler, Loader2, Lock, PlayCircle, RotateCw, Save, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { JobCardFields } from '@/components/job-card-fields';
import { cardValues, cardPayload, validCard } from '@/lib/job-card';
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
import { MaterialsSection } from '@/components/materials/materials-section';
import { cn } from '@/lib/utils';
import type { Employee } from '@/lib/auth';
import { closeErrorCode, jobLabel, redirectAfterClose, showsBothIds, useKt, useMachines, type CKey } from '@/lib/core';
import { MATERIAL_STATE_KEY, useJobMaterials } from '@/lib/materials';
import { useCt } from '@/components/cutting/cutting-i18n';
import { useUt } from '@/lib/ui-i18n';
import { useFt } from '@/lib/feature-i18n';

function BackLink() {
  const { t } = useI18n();
  return (
    <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-jobs">
      <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden />{t('backToJobs')}
    </Link>
  );
}

export default function JobDetailPage({ id, user }: { id: number; user: Employee }) {
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
      <div className="mx-auto max-w-6xl space-y-4" aria-busy>
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
  return <JobView key={id} job={q.data!} user={user} refetch={() => q.refetch()} />;
}

function JobView({ job, user, refetch }: { job: ProductionJob; user: Employee; refetch: () => Promise<{ data?: ProductionJob; isError?: boolean }> }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fmt = useFormatDate();
  const ut = useUt();
  const ft = useFt();
  const [title, setTitle] = useState(job.title);
  const [notes, setNotes] = useState(job.notes ?? '');
  const [reference, setReference] = useState(job.reference ?? '');
  const [machine, setMachine] = useState(job.machine ?? '');
  const [card, setCard] = useState(cardValues(job));
  const baseCard = useRef(cardValues(job));
  const base = useRef({ title: job.title, notes: job.notes ?? '', reference: job.reference ?? '', machine: job.machine ?? '', revision: job.revision });
  const kt = useKt();
  const [, setLocation] = useLocation();
  const machines = useMachines(job.permissions.edit_machine);
  const [confirm, setConfirm] = useState<JobStatus | null>(null);
  const [reloading, setReloading] = useState(false);

  const cardDirty = JSON.stringify(card) !== JSON.stringify(baseCard.current);
  const dirty = title !== base.current.title || notes !== base.current.notes || reference !== base.current.reference || machine !== base.current.machine || cardDirty;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  // Adopt newer server values only when the user has no unsaved input.
  useEffect(() => {
    if (job.revision !== base.current.revision && !dirtyRef.current) {
      base.current = { title: job.title, notes: job.notes ?? '', reference: job.reference ?? '', machine: job.machine ?? '', revision: job.revision };
      setTitle(job.title);
      setNotes(job.notes ?? '');
      setReference(job.reference ?? '');
      setMachine(job.machine ?? '');
      baseCard.current = cardValues(job);
      setCard(cardValues(job));
    }
  }, [job.revision, job.title, job.notes, job.reference, job.machine]);

  const adopt = (j: ProductionJob) => {
    base.current = { title: j.title, notes: j.notes ?? '', reference: j.reference ?? '', machine: j.machine ?? '', revision: j.revision };
    setTitle(j.title);
    setNotes(j.notes ?? '');
    setReference(j.reference ?? '');
    setMachine(j.machine ?? '');
    baseCard.current = cardValues(j);
    setCard(cardValues(j));
    qc.setQueryData([...JOBS_KEY, 'detail', j.id], j);
    qc.invalidateQueries({ queryKey: JOBS_KEY });
  };

  const save = useMutation({
    mutationFn: () => {
      const data: JobUpdate = { revision: base.current.revision };
      if (job.permissions.edit_title && title !== base.current.title) data.title = title.trim();
      if (job.permissions.edit_notes && notes !== base.current.notes) data.notes = notes;
      if (job.permissions.edit_reference && reference !== base.current.reference) data.reference = reference.trim();
      if (job.permissions.edit_machine && machine !== base.current.machine) data.machine = machine.trim();
      if (job.permissions.edit_card && cardDirty) Object.assign(data, cardPayload(card));
      return updateJob(job.id, data);
    },
    onSuccess: (j) => { adopt(j); save.reset(); qc.invalidateQueries({ queryKey: MATERIAL_STATE_KEY }); qc.invalidateQueries({ queryKey: ['jobs', 'machines'] }); toast({ title: t('jobSaved') }); },
  });

  const transition = useMutation({
    mutationFn: (status: JobStatus) => updateJob(job.id, { revision: base.current.revision, status }),
    onSuccess: (j, status) => {
      setConfirm(null);
      adopt(j);
      toast({ title: t(status === 'open' ? 'jobOpened' : 'jobCancelled', { num: jobLabel(j) }) });
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
  const canEdit = job.permissions.edit_title || job.permissions.edit_notes || job.permissions.edit_reference || job.permissions.edit_machine;
  const transitions = job.permissions.transitions ?? [];
  const otherError = !stale ? (save.error ?? transition.error) : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!validCard(card)) return;
    if (!dirty || save.isPending || transition.isPending || reloading || stale || (job.permissions.edit_title && !title.trim())) return;
    save.mutate();
  };

  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (h === 'materials' || h === 'cutting') requestAnimationFrame(() => document.getElementById(h)?.scrollIntoView({ block: 'start' }));
  }, []);

  const workFirst = job.status === 'open';
  const discard = () => { setTitle(base.current.title); setNotes(base.current.notes); setReference(base.current.reference); setMachine(base.current.machine); setCard(baseCard.current); save.reset(); };

  const close = useMutation({
    mutationFn: () => updateJob(job.id, { revision: base.current.revision, status: 'completed' }),
    onSuccess: (j) => {
      setConfirm(null);
      toast({ title: kt('closed', { num: jobLabel(j) }) });
      qc.invalidateQueries({ queryKey: MATERIAL_STATE_KEY });
      qc.invalidateQueries({ queryKey: ['reports'] });
      if (redirectAfterClose(user.role)) { qc.invalidateQueries({ queryKey: JOBS_KEY }); setLocation('/jobs'); return; }
      adopt(j);
    },
    onError: () => setConfirm(null),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <BackLink />
      <header className="mt-4 flex flex-col gap-4 rounded-lg border bg-card p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm font-semibold tracking-wide" dir="ltr" data-testid="text-job-reference">{jobLabel(job)}</span>
            {showsBothIds(job) && <span className="text-xs text-muted-foreground">{kt('internalNo')} <JobNumber value={job.job_number} /></span>}
            <StatusBadge status={job.status} />
            {job.is_demo && <span title={kt('demoTitle')} className="inline-flex items-center gap-1 rounded-full bg-[hsl(262_40%_50%/0.1)] px-2 py-0.5 text-xs font-medium text-[hsl(262_40%_38%)] ring-1 ring-inset ring-[hsl(262_40%_50%/0.25)]" data-testid="badge-demo"><FlaskConical className="h-3 w-3" aria-hidden />{kt('demo')}</span>}
            <span className="text-xs text-muted-foreground">{t('updatedLabel')} {fmt(job.updated_at)}</span>
          </div>
          <h1 className={cn('mt-2 break-words text-2xl font-semibold tracking-tight', job.status === 'cancelled' && 'text-muted-foreground')} data-testid="text-page-title">{job.title}</h1>
        </div>
        <div className="flex flex-col gap-2 lg:items-end">
          <div className="flex flex-wrap gap-2">
            <Link href={`/jobs/${job.id}/cutting`} className="inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium hover:border-primary/40 hover:text-primary" data-testid="link-header-cutting">
              <Ruler className="h-4 w-4" aria-hidden />{ut('pageCutting')}
            </Link>
            <Link href={`/assistant?job_id=${job.id}`} className="inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium hover:border-primary/40 hover:text-primary" data-testid="link-header-assistant">
              <Bot className="h-4 w-4" aria-hidden />{ft('asOpenAssistant')}
            </Link>
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
          {transitions.length > 0 && dirty && <p className="text-xs text-muted-foreground">{t('saveBeforeTransition')}</p>}
          {transitions.length === 0 && <p className="text-xs text-muted-foreground">{job.status === 'cancelled' ? t('cancelledLocked') : job.status === 'completed' ? kt('completedLocked') : t('noTransitions')}</p>}
        </div>
      </header>

      <nav aria-label={t('jobDetails')} className="sticky top-14 z-10 -mx-1 mt-4 flex flex-wrap gap-1 bg-background/90 px-1 py-2 backdrop-blur">
        {(workFirst ? ([['materials', t('matTitle')], ['cutting', ut('pageCutting')], ['details', t('jobDetails')]] as const) : ([['details', t('jobDetails')], ['cutting', ut('pageCutting')], ['materials', t('matTitle')]] as const)).map(([id, label]) => (
          <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground" data-testid={`link-section-${id}`}>{label}</a>
        ))}
      </nav>

      {/* Open jobs lead with operational recording; other states lead with identity/details. */}
      <div className="flex flex-col">
      <div id="details" className={cn('mt-2 grid scroll-mt-28 gap-4 lg:grid-cols-[1fr_18rem]', workFirst ? 'order-4 mt-6' : 'order-1')}>
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
              {job.status === 'cancelled' ? t('cancelledLocked') : job.status === 'completed' ? kt('completedLocked') : t('readOnlyJob')}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="e-reference">{kt('reference')}</Label>
              {job.permissions.edit_reference ? (
                <Input id="e-reference" dir="ltr" maxLength={120} value={reference} disabled={save.isPending || reloading} onChange={(e) => setReference(e.target.value)} aria-invalid={!!fe.reference} placeholder={job.job_number} data-testid="input-edit-reference" />
              ) : (
                <p id="e-reference" dir="ltr" className={cn('font-mono text-sm', !job.reference && 'text-muted-foreground')} style={{ textAlign: 'start' }} data-testid="text-job-reference-field">{job.reference || job.job_number}</p>
              )}
              {job.permissions.edit_reference && <p className="text-xs text-muted-foreground">{kt('referenceHint')}</p>}
              <FieldError msg={fe.reference} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="e-machine">{kt('machine')}</Label>
              {job.permissions.edit_machine ? (
                <>
                  {user.role === 'manager' ? <Input id="e-machine" list="machine-options" maxLength={120} value={machine} disabled={save.isPending || reloading} onChange={(e) => setMachine(e.target.value)} aria-invalid={!!fe.machine} autoComplete="off" data-testid="input-edit-machine" /> :
                    <select id="e-machine" value={machine} disabled={save.isPending || reloading} onChange={(e) => setMachine(e.target.value)} aria-invalid={!!fe.machine} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="select-edit-machine">
                      <option value="" disabled>{kt('machineUnset')}</option>
                      {(machines.data?.machines ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>}
                  <datalist id="machine-options">{(machines.data?.machines ?? []).map((m) => <option key={m} value={m} />)}</datalist>
                  {user.role === 'manager' && <p className="text-xs text-muted-foreground">{kt('machineHint')}</p>}
                </>
              ) : (
                <p id="e-machine" className={cn('text-sm', !job.machine && 'text-muted-foreground')} data-testid="text-job-machine">{job.machine || kt('machineUnset')}</p>
              )}
              <FieldError msg={fe.machine} />
            </div>
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
          <JobCardFields value={card} onChange={job.permissions.edit_card ? setCard : undefined} disabled={save.isPending || stale} errors={fe} />
          <FieldError msg={fe.non_field_errors ?? fe.revision ?? fe.status} />

          {canEdit && (
            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={discard} disabled={!dirty || save.isPending} data-testid="button-discard">{t('discardChanges')}</Button>
              <Button type="submit" disabled={!dirty || !validCard(card) || save.isPending || transition.isPending || reloading || stale || (job.permissions.edit_title && !title.trim())} data-testid="button-save-job">
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
                {save.isPending ? t('saving') : t('saveChanges')}
              </Button>
            </div>
          )}
        </form>

        <aside className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-3 rounded-lg border bg-card p-5 text-sm lg:grid-cols-1">
            <div><dt className="text-xs text-muted-foreground">{t('colCreatedBy')}</dt><dd className="font-mono text-xs" dir="ltr" style={{ textAlign: 'start' }}>{job.created_by.username}</dd></div>
            <div><dt className="text-xs text-muted-foreground">{t('revisionLabel')}</dt><dd className="font-mono text-xs" data-testid="text-revision">{job.revision}</dd></div>
            <div><dt className="text-xs text-muted-foreground">{t('createdLabel')}</dt><dd className="text-xs">{fmt(job.created_at)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">{t('updatedLabel')}</dt><dd className="text-xs">{fmt(job.updated_at)}</dd></div>
          </dl>
        </aside>
      </div>

      <div id="cutting" className={cn('scroll-mt-28', workFirst ? 'order-3' : 'order-2')}><CuttingLink jobId={job.id} /></div>

      <div id="materials" className={cn('scroll-mt-28', workFirst ? 'order-1' : 'order-3')}><MaterialsSection job={job} /></div>

      {job.status === 'open' && (
        <div className="order-2"><ClosePanel jobId={job.id} dirty={dirty} busy={close.isPending || save.isPending || transition.isPending || reloading || stale} error={close.error} onClose={() => setConfirm('completed')} /></div>
      )}
      </div>

      {confirm === 'completed' && <AlertDialog open onOpenChange={(o) => { if (!o && !close.isPending) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{kt('closeConfirm', { num: jobLabel(job) })}</AlertDialogTitle>
            <AlertDialogDescription>{kt('closeConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={close.isPending}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction data-testid="button-confirm-close" disabled={close.isPending} onClick={(ev) => { ev.preventDefault(); close.mutate(); }}>
              {close.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{kt('closeBtn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>}

      {confirm !== null && confirm !== 'completed' && <AlertDialog open onOpenChange={(o) => { if (!o && !transition.isPending) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(confirm === 'open' ? 'openJobTitle' : 'cancelJobTitle', { num: jobLabel(job) })}</AlertDialogTitle>
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

function CuttingLink({ jobId }: { jobId: number }) {
  const ct = useCt();
  return (
    <Link href={`/jobs/${jobId}/cutting`} className="group mt-4 flex items-center gap-4 rounded-lg border border-primary/25 bg-primary/5 p-4 transition-colors hover:bg-primary/10" data-testid="link-cutting-studio">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-hidden><Ruler className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{ct('openStudio')}</span>
        <span className="block text-xs text-muted-foreground">{ct('openStudioDesc')}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden />
    </Link>
  );
}

function ClosePanel({ jobId, dirty, busy, error, onClose }: { jobId: number; dirty: boolean; busy: boolean; error: unknown; onClose: () => void }) {
  const kt = useKt();
  const { t } = useI18n();
  const q = useJobMaterials(jobId, 1);
  const closing = q.data?.closing;
  const code = closeErrorCode(error);
  const serverMsg = error ? (code ? kt(`err_${code}` as CKey) : jobErrorMessage(error, t)) : null;
  const can = !!closing?.can_close && !dirty && !busy;
  return (
    <section className="mt-4 rounded-lg border bg-card p-5" aria-labelledby="h-close" data-testid="panel-close-job">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id="h-close" className="text-sm font-semibold">{kt('closeTitle')}</h2>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{kt('closeDesc')}</p>
        </div>
        <Button onClick={onClose} disabled={!can} data-testid="button-close-job">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}{kt('closeBtn')}
        </Button>
      </div>
      <div className="mt-3 text-sm" aria-live="polite">
        {q.isPending ? <Skeleton className="h-5 w-64" /> : q.isError ? (
          <p className="text-destructive">{jobErrorMessage(q.error, t)}</p>
        ) : closing?.can_close ? (
          <p className="flex items-center gap-2 text-[hsl(152_50%_28%)]" data-testid="text-close-ready"><CheckCircle2 className="h-4 w-4" aria-hidden />{kt('closeReady')}</p>
        ) : (
          <p className="flex items-start gap-2" data-testid="text-close-blocked"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /><span><span className="font-medium">{kt('closeBlocked')}:</span> {closing?.reason ?? ''}</span></p>
        )}
        {dirty && <p className="mt-1 text-xs text-muted-foreground">{kt('closeDirty')}</p>}
        {serverMsg && <div className="mt-3"><FormAlert message={serverMsg} testId="error-close-job" /></div>}
      </div>
    </section>
  );
}
