import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, FilePlus2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FormAlert } from '@/components/brand';
import { FieldError, jobErrorMessage, jobFieldErrors } from '@/components/job-ui';
import { useToast } from '@/hooks/use-toast';
import { createJob, JOBS_KEY } from '@/lib/jobs';
import { useI18n } from '@/lib/i18n';
import { jobLabel } from '@/lib/core-helpers';

export default function JobNewPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const m = useMutation({
    mutationFn: () => createJob({ title: title.trim(), notes: notes.trim() || undefined }),
    onSuccess: (job) => {
      qc.invalidateQueries({ queryKey: JOBS_KEY });
      toast({ title: t('jobCreated', { num: jobLabel(job) }) });
      navigate(`/jobs/${job.id}`);
    },
  });
  const fe = jobFieldErrors(m.error, t);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || m.isPending) return;
    m.mutate();
  };
  return (
    <div className="mx-auto max-w-2xl animate-in fade-in slide-in-from-bottom-1 duration-500">
      <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-jobs">
        <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden />{t('backToJobs')}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight" data-testid="text-page-title">{t('newJobTitle')}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('newJobDesc')}</p>
      <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-5 rounded-lg border bg-card p-5 sm:p-6" data-testid="form-create-job">
        {m.error && <FormAlert message={jobErrorMessage(m.error, t)} testId="error-create-job" />}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="j-title">{t('jobTitleLabel')}</Label>
          <Input id="j-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!fe.title} aria-describedby="j-title-hint" data-testid="input-job-title" />
          <FieldError msg={fe.title} />
          <p id="j-title-hint" className="text-xs text-muted-foreground">{t('jobTitleHint')}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="j-notes">{t('jobNotesLabel')} <span className="font-normal text-muted-foreground">({t('optional')})</span></Label>
          <Textarea id="j-notes" rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} aria-invalid={!!fe.notes} data-testid="input-job-notes" />
          <FieldError msg={fe.notes} />
        </div>
        <FieldError msg={fe.non_field_errors} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/jobs')}>{t('cancel')}</Button>
          <Button type="submit" disabled={!title.trim() || m.isPending} data-testid="button-submit-job">
            {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FilePlus2 className="h-4 w-4" aria-hidden />}
            {m.isPending ? t('creating') : t('createJob')}
          </Button>
        </div>
      </form>
    </div>
  );
}
