import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCurrentUser } from '@/lib/auth';
import { useJobs } from '@/lib/jobs';
import { useI18n } from '@/lib/i18n';
import { jobLabel } from '@/lib/core-helpers';

export function SendToCutting({ saved, ready, supported }: {
  saved: { id: number; revision: number } | null; ready: boolean; supported: boolean;
}) {
  const { lang } = useI18n();
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useJobs({ page, search });
  const ar = lang === 'ar';
  if (!user.data || user.data.role === 'cutting_operator') return null;
  return <section className="mt-4 rounded-lg border p-3 space-y-3">
    <Button disabled={!ready || !saved || !supported} onClick={() => setOpen(!open)} aria-expanded={open} data-testid="button-send-cutting">
      {ar ? 'إرسال إلى استوديو القص' : 'Send to Cutting Studio'}
    </Button>
    <p className="text-xs text-muted-foreground">{!supported
      ? (ar ? 'متاح للعلبة المسطحة ذات الغطاء المنفصل فقط.' : 'Available for flat boxes with separate lids only.')
      : !ready || !saved ? (ar ? 'تحقق من التصوّر واحفظ التغييرات أولاً.' : 'Validate and save your changes first.')
      : (ar ? 'طقم ألواح منفصلة بالمليمتر؛ ليس قالب كرتون مطوياً.' : 'Separate-panel kit in mm, not a folded-carton blank.')}</p>
    {open && ready && saved && supported && <>
      <Input aria-label={ar ? 'البحث عن أمر إنتاج' : 'Find a production job'} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      {q.isError && <p role="alert">{ar ? 'تعذر تحميل الأوامر.' : 'Could not load jobs.'}</p>}
      {q.isPending && <p role="status">{ar ? 'جارٍ التحميل…' : 'Loading…'}</p>}
      {q.data?.results.map(job => {
        const allowed = job.status === 'open' || (job.status === 'draft' && user.data?.role === 'manager');
        return allowed && <Link className="block text-sm text-primary underline" key={job.id}
          href={`/jobs/${job.id}/cutting?concept=${saved.id}&revision=${saved.revision}`} data-testid={`link-kit-job-${job.id}`}>
          {jobLabel(job)} — {job.title}
        </Link>;
      })}
      <p className="text-xs">{ar ? 'اختر أمراً مفتوحاً (أو مسودة للمدير).' : 'Choose an Open job (Managers may also choose a Draft).'}</p>
      <div className="flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>{ar ? 'السابق' : 'Previous'}</Button>
        <Button variant="outline" disabled={!q.data || page >= q.data.total_pages} onClick={() => setPage(page + 1)}>{ar ? 'التالي' : 'Next'}</Button></div>
    </>}
  </section>;
}
