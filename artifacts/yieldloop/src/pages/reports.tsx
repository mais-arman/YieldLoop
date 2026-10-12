import { Pager as SharedPager } from '@/components/pager';
import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { AlertTriangle, ArrowRight, CircleHelp, Users, ChevronDown, ChevronLeft, ChevronRight, FileText, Filter, GitCompare, Info, RotateCw, Scissors, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { FieldError, JobNumber, StatusBadge, useFormatDate } from '@/components/job-ui';
import { Kg, LotStateBadge } from '@/components/inventory-ui';
import { MaterialPicker } from '@/components/materials/material-picker';
import { AuthError } from '@/lib/auth';
import { useI18n, type Lang } from '@/lib/i18n';
import type { Material } from '@/lib/materials';
import { useReportOverview, type GetReportOverviewParams, type ReportMeasures, type ReportOverview } from '@/lib/reports';
import { errorMessage } from '@/lib/session';
import { cn } from '@/lib/utils';
import { jobLabel, useKt } from '@/lib/core';
import { Cell, Pie, PieChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Employee } from '@/lib/auth';
import { useUt, type UiKey } from '@/lib/ui-i18n';
import { dashboardFocus, jobStatusSlices, orderJobs, outputSlices, type OutputKey } from '@/lib/dashboard-data';

const S = {
  en: {
    dashTitle: 'Material dashboard', dashSub: 'Current material balances for a cohort of production jobs. Values are recorded figures, never inferred.',
    repTitle: 'Job & inventory report', repSub: 'Every job and inventory lot in the selected cohort, with its latest reconciliation.',
    filters: 'Filters', startDate: 'Created from', endDate: 'Created to', timezone: 'Date timezone', status: 'Job status', anyStatus: 'Any status',
    material: 'Material', allMaterials: 'All materials (quantities hidden)', chooseMaterial: 'Choose material', hidePicker: 'Hide list', clearMaterial: 'Clear material',
    apply: 'Apply', reset: 'Reset', refresh: 'Refresh', refreshing: 'Refreshing',
    dateFormat: 'Use the format YYYY-MM-DD.', dateOrder: 'The start date must be on or before the end date.',
    invalidChoice: 'Choose one of the listed options.', invalidFilter: 'Enter a valid value or clear this filter.',
    generated: 'Generated {time}', tzLabel: 'Timezone {tz}', basis: 'Dates select jobs by when the job was created.',
    allTime: 'All time', range: '{a} to {b}', from: 'From {a}', until: 'Until {b}',
    jobs: 'Jobs in cohort', measured: 'Measured', unmeasured: 'Unmeasured',
    production: 'Production balance', inventory: 'Offcut inventory', available: 'Available lots', voided: 'Voided lots',
    lots: '{n} lots', original: 'Original', remaining: 'Remaining',
    selectMaterial: 'Select one material to see kg totals, rates and inventory weights. Totals across different materials would mix unrelated kg.',
    unavailable: 'Unavailable', noData: 'No reconciliation recorded',
    openReport: 'Open detailed report', openDashboard: 'Back to dashboard',
    jobsTable: 'Jobs', lotsTable: 'Inventory lots', colJob: 'Job', colStatus: 'Status', colCreated: 'Created', colMaterial: 'Material',
    colLot: 'Lot', colSource: 'Source job', colState: 'State',
    snapshot: 'Reconciliation #{id} · revision {rev} · {time}',
    emptyTitle: 'No jobs in this cohort', emptyDesc: 'No production jobs visible to you were created in this range. Widen the dates or clear filters.',
    emptyLots: 'No inventory lots come from jobs in this cohort.',
    loadError: 'The report could not be loaded.', notFound: 'The selected material or page does not exist or is not visible to you.',
    validation: 'The server rejected some filters. Your inputs are kept below.', clearFilters: 'Clear filters',
    pageOf: 'Page {p} of {n} · {c} total', prev: 'Previous page', next: 'Next page',
    defs: 'Definitions', defsHint: 'What every number means',
    viewing: 'Showing {status} · {material}',
    dashTitle2: 'Today on the floor', dashSub2: 'What needs a decision now. Full figures live in Reports.',
    showFilters: 'Filters', hideFilters: 'Hide filters', activeFilters: '{n} active',
    kJobs: 'Jobs in cohort', kOpen: '{n} open · {d} draft', kMeasured: 'Reconciled', kMeasuredSub: '{n} awaiting reconciliation',
    kYield: 'Yield', kVariance: 'Net variance', kLots: 'Available offcut lots', kLotsSub: 'Registered only, not approved for reuse',
    needMaterial: 'Select a material', needMaterialSub: 'Totals are only shown for one material',
    attention: 'Needs attention', attentionScope: 'Checked across the first {n} jobs of this cohort. Open Reports for the rest.',
    attVariance: 'Unaccounted material {v} kg', attNegVariance: 'Accounted exceeds issued by {v} kg', attUnmeasured: 'No reconciliation yet',
    allClear: 'Nothing flagged in these jobs.', allClearSub: 'Every listed job is reconciled with zero variance.',
    recent: 'Jobs in this cohort', viewAll: 'All jobs', openJob: 'Open job', openCutting: 'Cutting Studio',
    colIssued: 'Issued', colGood: 'Good', colScrap: 'Scrap', colOffcut: 'Offcut', colRework: 'Rework', colVariance: 'Variance', colYield: 'Yield', colActions: '',
    unitsNote: 'All quantities in kg. Variance is unaccounted material, never scrap. Rates show Unavailable when nothing was issued.',
  },
  ar: {
    dashTitle: 'لوحة المواد', dashSub: 'أرصدة المواد الحالية لمجموعة من أوامر الإنتاج. القيم مسجّلة فعليًا وليست مستنتجة.',
    repTitle: 'تقرير الأوامر والمخزون', repSub: 'كل أمر وكل دفعة مخزون في المجموعة المحددة مع آخر تسوية لها.',
    filters: 'عوامل التصفية', startDate: 'تاريخ الإنشاء من', endDate: 'تاريخ الإنشاء إلى', timezone: 'المنطقة الزمنية للتاريخ', status: 'حالة الأمر', anyStatus: 'أي حالة',
    material: 'المادة', allMaterials: 'كل المواد (الكميات مخفية)', chooseMaterial: 'اختر مادة', hidePicker: 'إخفاء القائمة', clearMaterial: 'إزالة المادة',
    apply: 'تطبيق', reset: 'إعادة الضبط', refresh: 'تحديث', refreshing: 'جارٍ التحديث',
    dateFormat: 'استخدم الصيغة YYYY-MM-DD.', dateOrder: 'يجب أن يكون تاريخ البداية في تاريخ النهاية أو قبله.',
    invalidChoice: 'اختر أحد الخيارات المدرجة.', invalidFilter: 'أدخل قيمة صالحة أو امسح عامل التصفية هذا.',
    generated: 'أُنشئ {time}', tzLabel: 'المنطقة الزمنية {tz}', basis: 'تحدد التواريخ الأوامر حسب وقت إنشاء الأمر.',
    allTime: 'كل الأوقات', range: 'من {a} إلى {b}', from: 'من {a}', until: 'حتى {b}',
    jobs: 'الأوامر في المجموعة', measured: 'مقيسة', unmeasured: 'غير مقيسة',
    production: 'رصيد الإنتاج', inventory: 'مخزون القصاصات', available: 'دفعات متاحة', voided: 'دفعات ملغاة',
    lots: '{n} دفعات', original: 'الأصلية', remaining: 'المتبقية',
    selectMaterial: 'اختر مادة واحدة لعرض إجماليات الكيلوغرام والنسب وأوزان المخزون. جمع مواد مختلفة يخلط كيلوغرامات غير مرتبطة.',
    unavailable: 'غير متاح', noData: 'لا توجد تسوية مسجّلة',
    openReport: 'فتح التقرير المفصل', openDashboard: 'العودة إلى اللوحة',
    jobsTable: 'الأوامر', lotsTable: 'دفعات المخزون', colJob: 'الأمر', colStatus: 'الحالة', colCreated: 'الإنشاء', colMaterial: 'المادة',
    colLot: 'الدفعة', colSource: 'الأمر المصدر', colState: 'الحالة',
    snapshot: 'التسوية #{id} · المراجعة {rev} · {time}',
    emptyTitle: 'لا توجد أوامر في هذه المجموعة', emptyDesc: 'لم يُنشأ في هذا النطاق أي أمر إنتاج مرئي لك. وسّع التواريخ أو امسح عوامل التصفية.',
    emptyLots: 'لا توجد دفعات مخزون من أوامر هذه المجموعة.',
    loadError: 'تعذّر تحميل التقرير.', notFound: 'المادة أو الصفحة المحددة غير موجودة أو غير مرئية لك.',
    validation: 'رفض الخادم بعض عوامل التصفية. مدخلاتك محفوظة أدناه.', clearFilters: 'مسح عوامل التصفية',
    pageOf: 'الصفحة {p} من {n} · الإجمالي {c}', prev: 'الصفحة السابقة', next: 'الصفحة التالية',
    defs: 'التعريفات', defsHint: 'معنى كل رقم',
    viewing: 'عرض {status} · {material}',
    dashTitle2: 'اليوم في الورشة', dashSub2: 'ما يحتاج قرارًا الآن. الأرقام الكاملة في التقارير.',
    showFilters: 'عوامل التصفية', hideFilters: 'إخفاء عوامل التصفية', activeFilters: '{n} نشطة',
    kJobs: 'الأوامر في المجموعة', kOpen: '{n} مفتوحة · {d} مسودة', kMeasured: 'مُسوّاة', kMeasuredSub: '{n} بانتظار التسوية',
    kYield: 'المردود', kVariance: 'صافي الفرق', kLots: 'دفعات قصاصات متاحة', kLotsSub: 'مسجّلة فقط وغير معتمدة لإعادة الاستخدام',
    needMaterial: 'اختر مادة', needMaterialSub: 'تُعرض الإجماليات لمادة واحدة فقط',
    attention: 'يحتاج انتباهًا', attentionScope: 'فُحص أول {n} أمر في هذه المجموعة. افتح التقارير للبقية.',
    attVariance: 'مادة غير محتسبة {v} كغ', attNegVariance: 'المحتسب يزيد على المصروف بمقدار {v} كغ', attUnmeasured: 'لا توجد تسوية بعد',
    allClear: 'لا شيء مُعلَّم في هذه الأوامر.', allClearSub: 'كل أمر مدرج مُسوّى بفرق صفري.',
    recent: 'أوامر هذه المجموعة', viewAll: 'كل الأوامر', openJob: 'فتح الأمر', openCutting: 'استوديو القص',
    colIssued: 'المصروف', colGood: 'الجيد', colScrap: 'الهالك', colOffcut: 'القصاصات', colRework: 'إعادة تشغيل', colVariance: 'الفرق', colYield: 'المردود', colActions: '',
    unitsNote: 'كل الكميات بالكيلوغرام. الفرق مادة غير محتسبة وليس هالكًا. تظهر النسب غير متاحة عند عدم صرف أي مادة.',
  },
};
type SKey = keyof typeof S.en;


const MEASURE_LABEL: Record<Lang, Record<string, string>> = {
  en: { issued: 'Issued', good: 'Good', scrap: 'Scrap', offcut: 'Offcut', pending_rework: 'Pending rework', accounted: 'Accounted', variance: 'Variance', yield_rate: 'Yield', scrap_rate: 'Scrap rate', offcut_rate: 'Offcut rate' },
  ar: { issued: 'المصروف', good: 'الجيد', scrap: 'الهالك', offcut: 'القصاصات', pending_rework: 'إعادة تشغيل معلّقة', accounted: 'المحتسب', variance: 'الفرق', yield_rate: 'المردود', scrap_rate: 'نسبة الهالك', offcut_rate: 'نسبة القصاصات' },
};

function useS() {
  const { lang } = useI18n();
  return (k: SKey, v?: Record<string, string | number>) => {
    let s: string = S[lang][k];
    if (v) for (const [a, b] of Object.entries(v)) s = s.replace(`{${a}}`, String(b));
    return s;
  };
}

/* ---------- URL filter state ---------- */
type Tz = 'UTC' | 'Asia/Jerusalem';
type Status = 'draft' | 'open' | 'completed' | 'cancelled';
type Filters = { start_date: string; end_date: string; timezone: Tz; status: '' | Status; material_id: number | null; material_name: string; job_page: number; lot_page: number };
const EMPTY: Filters = { start_date: '', end_date: '', timezone: 'UTC', status: '', material_id: null, material_name: '', job_page: 1, lot_page: 1 };

function parse(search: string): Filters {
  const p = new URLSearchParams(search);
  // Preserve invalid supplied values for authoritative server validation.
  const num = (k: string) => p.has(k) ? Number(p.get(k)) : null;
  const st = p.get('status');
  return {
    start_date: p.get('start_date') ?? '', end_date: p.get('end_date') ?? '',
    timezone: (p.get('timezone') ?? 'UTC') as Tz,
    status: (st ?? '') as Filters['status'],
    material_id: num('material_id'), material_name: p.get('mname') ?? '',
    job_page: num('job_page') ?? 1, lot_page: num('lot_page') ?? 1,
  };
}
function toQuery(f: Filters, pages = true) {
  const p = new URLSearchParams();
  if (f.start_date) p.set('start_date', f.start_date);
  if (f.end_date) p.set('end_date', f.end_date);
  p.set('timezone', f.timezone);
  if (f.status) p.set('status', f.status);
  if (f.material_id) { p.set('material_id', String(f.material_id)); if (f.material_name) p.set('mname', f.material_name); }
  if (pages && f.job_page > 1) p.set('job_page', String(f.job_page));
  if (pages && f.lot_page > 1) p.set('lot_page', String(f.lot_page));
  return p.toString();
}
function toParams(f: Filters): GetReportOverviewParams {
  return {
    start_date: f.start_date || undefined, end_date: f.end_date || undefined, timezone: f.timezone,
    status: f.status || undefined, material_id: f.material_id ?? undefined,
    job_page: f.job_page, lot_page: f.lot_page, page_size: 20,
  };
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function validDate(s: string) { if (!DATE_RE.test(s)) return false; const d = new Date(`${s}T00:00:00Z`); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; }

function useReportState(path: string) {
  const search = useSearch();
  const [, navigate] = useLocation();
  const applied = useMemo(() => parse(search), [search]);
  const go = (f: Filters) => navigate(`${path}?${toQuery(f)}`);
  return { applied, go };
}

/* ---------- small pieces ---------- */
function Pct({ v }: { v: string | null }) {
  const s = useS();
  if (v === null) return <span className="text-sm text-muted-foreground">{s('unavailable')}</span>;
  return <span><span dir="ltr" className="font-mono tabular-nums">{v}</span><span className="text-xs text-muted-foreground"> %</span></span>;
}
function Signed({ v }: { v: string }) {
  const neg = v.startsWith('-');
  const zero = Number(v) === 0;
  return <Kg v={zero || neg ? v : `+${v}`} className={cn(!zero && 'text-[hsl(32_81%_29%)]')} />;
}

function MeasureGrid({ m, compact }: { m: ReportMeasures; compact?: boolean }) {
  const { lang } = useI18n();
  const L = MEASURE_LABEL[lang];
  const cell = (k: string, node: ReactNode, strong?: boolean) => (
    <div key={k} className={cn('flex flex-col gap-0.5', compact ? 'py-1' : 'rounded-md border bg-card px-3 py-2.5')}>
      <dt className="text-xs text-muted-foreground">{L[k]}</dt>
      <dd className={cn(strong ? 'text-base font-semibold' : 'text-sm font-medium')}>{node}</dd>
    </div>
  );
  return (
    <dl className={cn('grid gap-2', compact ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3')}>
      {cell('issued', <Kg v={m.issued} />, true)}
      {cell('good', <Kg v={m.good} />)}
      {cell('scrap', <Kg v={m.scrap} />)}
      {cell('offcut', <Kg v={m.offcut} />)}
      {cell('pending_rework', <Kg v={m.pending_rework ?? '0'} />)}
      {cell('accounted', <Kg v={m.accounted} />)}
      {cell('variance', <Signed v={m.variance} />)}
      {cell('yield_rate', <Pct v={m.yield_rate} />)}
      {cell('scrap_rate', <Pct v={m.scrap_rate} />)}
      {cell('offcut_rate', <Pct v={m.offcut_rate} />)}
    </dl>
  );
}

function Pager({ page, total, onPage, disabled, testId }: { page: number; total: number; count: number; onPage: (p: number) => void; disabled: boolean; testId: string }) {
  return <SharedPager page={page} totalPages={total} onPage={onPage} busy={disabled} testId={testId} />;
}

/* ---------- filters ---------- */
function FilterBar({ applied, go, serverFields }: { applied: Filters; go: (f: Filters) => void; serverFields: Record<string, string> }) {
  const { lang } = useI18n();
  const s = useS();
  const { t } = useI18n();
  const [draft, setDraft] = useState<Filters>(applied);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState(false);
  const key = toQuery(applied, false);
  useEffect(() => { setDraft(applied); setErrs({}); }, [key]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (draft.start_date && !validDate(draft.start_date)) er.start_date = s('dateFormat');
    if (draft.end_date && !validDate(draft.end_date)) er.end_date = s('dateFormat');
    if (!er.start_date && !er.end_date && draft.start_date && draft.end_date && draft.start_date > draft.end_date) er.end_date = s('dateOrder');
    setErrs(er);
    if (Object.keys(er).length) return;
    go({ ...draft, job_page: 1, lot_page: 1 });
  };
  const fe = (k: string) => {
    if (errs[k]) return errs[k];
    const code = serverFields[k];
    if (!code) return undefined;
    if (code.includes('invalid_choice')) return s('invalidChoice');
    if (code.includes('date_order')) return s('dateOrder');
    return s('invalidFilter');
  };
  const matValue = draft.material_id ? ({ id: draft.material_id, name: draft.material_name, specification: '', unit: 'kg', created_at: '' } as Material) : null;
  const sel = 'h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <form onSubmit={submit} noValidate className="rounded-lg border bg-card p-4" aria-label={s('filters')} data-testid="form-report-filters">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rf-start">{s('startDate')}</Label>
          <Input id="rf-start" type="date" dir="ltr" value={draft.start_date} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} aria-invalid={!!fe('start_date')} aria-describedby="rf-start-err" data-testid="input-start-date" />
          <FieldError id="rf-start-err" msg={fe('start_date')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rf-end">{s('endDate')}</Label>
          <Input id="rf-end" type="date" dir="ltr" value={draft.end_date} onChange={(e) => setDraft({ ...draft, end_date: e.target.value })} aria-invalid={!!fe('end_date')} aria-describedby="rf-end-err" data-testid="input-end-date" />
          <FieldError id="rf-end-err" msg={fe('end_date')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rf-tz">{s('timezone')}</Label>
          <select id="rf-tz" className={sel} value={draft.timezone} onChange={(e) => setDraft({ ...draft, timezone: e.target.value as Tz })} data-testid="select-timezone">
            <option value="UTC">UTC</option><option value="Asia/Jerusalem">Asia/Jerusalem</option>
          </select>
          <FieldError msg={fe('timezone')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rf-status">{s('status')}</Label>
          <select id="rf-status" className={sel} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Filters['status'] })} data-testid="select-status">
            <option value="">{s('anyStatus')}</option>
            {(['draft', 'open', 'completed', 'cancelled'] as const).map((v) => <option key={v} value={v}>{t(`status_${v}`)}</option>)}
          </select>
          <FieldError msg={fe('status')} />
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <span className="text-sm font-medium" id="rf-mat-label">{s('material')}</span>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('rounded-md border px-2.5 py-1.5 text-sm', draft.material_id ? 'border-primary/40 bg-primary/5 font-medium' : 'text-muted-foreground')} data-testid="text-selected-material">
            {draft.material_id ? (draft.material_name || `#${draft.material_id}`) : s('allMaterials')}
          </span>
          <Button type="button" size="sm" variant="outline" onClick={() => setPicker((p) => !p)} aria-expanded={picker} data-testid="button-toggle-material">{picker ? s('hidePicker') : s('chooseMaterial')}</Button>
          {draft.material_id && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setDraft({ ...draft, material_id: null, material_name: '' })} data-testid="button-clear-material"><X className="h-3.5 w-3.5" aria-hidden />{s('clearMaterial')}</Button>
          )}
        </div>
        {picker && (
          <div className="max-w-md" aria-labelledby="rf-mat-label">
            <MaterialPicker value={matValue} canCreate={false} onChange={(m) => { setDraft({ ...draft, material_id: m.id, material_name: m.name }); setPicker(false); }} />
          </div>
        )}
        <FieldError msg={fe('material_id')} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
        <Button type="submit" size="sm" data-testid="button-apply-filters">{s('apply')}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => { setDraft(EMPTY); setErrs({}); go(EMPTY); }} data-testid="button-reset-filters">{s('reset')}</Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground" data-testid="report-date-basis">{lang === 'ar'
        ? 'التواريخ تختار الأوامر بحسب تاريخ إنشائها، لا تاريخ الإنتاج أو الإغلاق. تُعرض أحدث القياسات لهذه الأوامر، بما فيها التصحيحات اللاحقة.'
        : 'Dates select jobs by creation date, not production or completion date. Results use those jobs’ latest measurements, including later corrections.'}</p>
    </form>
  );
}

/* ---------- freshness / scope ---------- */
/* ---------- summary ---------- */
function Summary({ data }: { data: ReportOverview }) {
  const s = useS();
  const { t } = useI18n();
  const inv = data.inventory;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
      <section className="rounded-lg border bg-card p-4" aria-labelledby="h-jobs">
        <h2 id="h-jobs" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s('jobs')}</h2>
        <p className="mt-1 font-mono text-4xl font-semibold tabular-nums" dir="ltr" data-testid="text-job-count">{data.job_count}</p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {(['draft', 'open', 'completed', 'cancelled'] as const).map((k) => (
            <div key={k}><dt className="text-xs text-muted-foreground">{t(`status_${k}`)}</dt><dd className="font-mono tabular-nums" dir="ltr">{data.job_counts[k]}</dd></div>
          ))}
        </dl>
        <div className="mt-4 border-t pt-3">
          <div className="flex justify-between text-sm"><span>{s('measured')}</span><span className="font-mono tabular-nums" data-testid="text-measured">{data.measured_jobs}</span></div>
          <div className="mt-1 flex justify-between text-sm"><span>{s('unmeasured')}</span><span className="font-mono tabular-nums" data-testid="text-unmeasured">{data.unmeasured_jobs}</span></div>
        </div>
      </section>
      <section className="rounded-lg border bg-card p-4" aria-labelledby="h-prod">
        <h2 id="h-prod" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s('production')}</h2>
        <div className="mt-3">
          {data.production ? <MeasureGrid m={data.production} /> : (
            <p className="flex items-start gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground" data-testid="text-select-material">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{data.quantity_unavailable_reason === 'select_material' ? s('selectMaterial') : s('unavailable')}
            </p>
          )}
        </div>
      </section>
      <section className="rounded-lg border bg-card p-4 lg:col-span-2" aria-labelledby="h-inv">
        <h2 id="h-inv" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s('inventory')}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(['available', 'voided'] as const).map((k) => (
            <div key={k} className="rounded-md border px-3 py-2.5" data-testid={`panel-inv-${k}`}>
              <div className="flex items-center justify-between"><LotStateBadge state={k} /><span className="text-sm font-medium">{s('lots', { n: inv[k].count })}</span></div>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div><dt className="text-xs text-muted-foreground">{s('original')}</dt><dd>{inv[k].original_quantity !== null ? <Kg v={inv[k].original_quantity!} /> : <span className="text-muted-foreground">{s('unavailable')}</span>}</dd></div>
                <div><dt className="text-xs text-muted-foreground">{s('remaining')}</dt><dd>{inv[k].remaining !== null ? <Kg v={inv[k].remaining!} /> : <span className="text-muted-foreground">{s('unavailable')}</span>}</dd></div>
              </dl>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t('invAvailableHint')}</p>
      </section>
    </div>
  );
}

/* ---------- drilldowns ---------- */
function scrollReportTable(event: KeyboardEvent<HTMLDivElement>) {
  if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  event.currentTarget.scrollBy({ left: event.key === 'ArrowLeft' ? -160 : 160, behavior: 'instant' });
}

function JobsList({ data, onPage, fetching }: { data: ReportOverview; onPage: (p: number) => void; fetching: boolean }) {
  const kt = useKt();
  const s = useS();
  const fmt = useFormatDate();
  const j = data.jobs;
  const num = 'px-3 py-2 text-end';
  return (
    <section aria-labelledby="h-jobs-list" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="h-jobs-list" className="text-lg font-semibold">{s('jobsTable')}</h2>
        <p className="text-xs text-muted-foreground">{s('unitsNote')}</p>
      </div>
      {j.results.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{s('emptyTitle')}</p> : (
        <div className="overflow-x-auto rounded-lg border bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" tabIndex={0} role="region" aria-labelledby="h-jobs-list" onKeyDown={scrollReportTable}>
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                {(['colJob', 'colStatus', 'colCreated', 'colMaterial'] as const).map((k) => <th key={k} scope="col" className="px-3 py-2 text-start font-medium">{s(k)}</th>)}
                {(['colIssued', 'colGood', 'colScrap', 'colOffcut', 'colRework', 'colVariance', 'colYield'] as const).map((k) => <th key={k} scope="col" className="px-3 py-2 text-end font-medium">{s(k)}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y">
              {j.results.map((job) => {
                const r = job.reconciliation;
                return (
                  <tr key={job.id} className="align-top hover:bg-muted/30" data-testid={`row-report-job-${job.id}`}>
                    <td className="px-3 py-2">
                      <Link href={`/jobs/${job.id}`} className="font-medium hover:text-primary hover:underline"><JobNumber value={jobLabel(job)} className="me-2 text-foreground" />{job.title}</Link>
                      {job.is_demo && <span className="ms-2 rounded-full bg-[hsl(262_40%_50%/0.1)] px-1.5 py-0.5 text-[10px] font-medium text-[hsl(262_40%_38%)]" data-testid={`badge-demo-${job.id}`}>{kt('demo')}</span>}
                      {job.machine && <div className="text-[11px] text-muted-foreground">{job.machine}</div>}
                      {r && <div className="mt-0.5 text-[11px] text-muted-foreground">{s('snapshot', { id: r.id, rev: r.revision, time: fmt(r.created_at) })}</div>}
                    </td>
                    <td className="px-3 py-2"><StatusBadge status={job.status} /></td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{fmt(job.created_at)}</td>
                    <td className="px-3 py-2">{r ? <><div className="font-medium">{r.material_name}</div><div className="text-xs text-muted-foreground">{r.specification}</div></> : <span className="text-xs text-muted-foreground">{s('unmeasured')}</span>}</td>
                    {r ? (
                      <>
                        <td className={num}><Kg v={r.issued} /></td>
                        <td className={num}><Kg v={r.good} /></td>
                        <td className={num}><Kg v={r.scrap} /></td>
                        <td className={num}><Kg v={r.offcut} /></td>
                        <td className={num}><Kg v={r.pending_rework ?? '0'} /></td>
                        <td className={num}><Signed v={r.variance} /></td>
                        <td className={num}><Pct v={r.yield_rate} /></td>
                      </>
                    ) : <td colSpan={6} className="px-3 py-2 text-end text-xs text-muted-foreground">{s('noData')}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={j.page} total={j.total_pages} count={j.count} onPage={onPage} disabled={fetching} testId="jobs" />
    </section>
  );
}

function LotsList({ data, onPage, fetching }: { data: ReportOverview; onPage: (p: number) => void; fetching: boolean }) {
  const s = useS();
  const fmt = useFormatDate();
  const l = data.lots;
  return (
    <section aria-labelledby="h-lots" className="space-y-3">
      <h2 id="h-lots" className="text-lg font-semibold">{s('lotsTable')}</h2>
      {l.results.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{s('emptyLots')}</p> : (
        <div className="overflow-x-auto rounded-lg border bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" tabIndex={0} role="region" aria-labelledby="h-lots" onKeyDown={scrollReportTable}>
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>{(['colLot', 'colSource', 'colMaterial', 'original', 'remaining', 'colState'] as const).map((k) => <th key={k} scope="col" className="px-3 py-2 text-start font-medium">{s(k)}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {l.results.map((lot) => (
                <tr key={lot.id} data-testid={`row-report-lot-${lot.id}`}>
                  <td className="px-3 py-2"><Link href={`/inventory/${lot.id}`} className="font-mono text-primary hover:underline" dir="ltr">#{lot.id}</Link><div className="text-[11px] text-muted-foreground">{fmt(lot.created_at)}</div></td>
                  <td className="px-3 py-2"><Link href={`/jobs/${lot.source_job_id}`} className="hover:underline"><JobNumber value={lot.source_job_number} /></Link></td>
                  <td className="px-3 py-2"><div className="font-medium">{lot.material_name}</div><div className="text-xs text-muted-foreground">{lot.specification}</div></td>
                  <td className="px-3 py-2"><Kg v={lot.quantity} /></td>
                  <td className="px-3 py-2"><Kg v={lot.remaining} /></td>
                  <td className="px-3 py-2"><LotStateBadge state={lot.state} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={l.page} total={l.total_pages} count={l.count} onPage={onPage} disabled={fetching} testId="lots" />
    </section>
  );
}

/* ---------- states ---------- */
function ReportSkeleton({ detailed }: { detailed: boolean }) {
  return (
    <div className="space-y-4" aria-busy>
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
      <Skeleton className="h-28 w-full" />
      {detailed && [0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
    </div>
  );
}

function ReportError({ error, retry, clear }: { error: unknown; retry: () => void; clear: () => void }) {
  const s = useS();
  const { t } = useI18n();
  const status = error instanceof AuthError ? error.status : 0;
  const msg = status === 404 ? s('notFound') : status === 400 ? s('validation') : `${s('loadError')} ${errorMessage(error, t)}`;
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4" data-testid="panel-report-error">
      <p className="flex items-start gap-2 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />{msg}</p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={retry} data-testid="button-retry-report"><RotateCw className="h-3.5 w-3.5" aria-hidden />{t('retry')}</Button>
        {(status === 400 || status === 404) && <Button size="sm" variant="ghost" onClick={clear} data-testid="button-clear-report-filters">{s('clearFilters')}</Button>}
      </div>
    </div>
  );
}

function serverFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof AuthError) || error.status !== 400 || !error.fields) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(error.fields)) out[k] = Array.isArray(v) ? v.join(' ') : String(v);
  return out;
}

/* ---------- pages ---------- */
function ReportView({ path, detailed }: { path: string; detailed: boolean }) {
  const kt = useKt();
  const s = useS();
  const { applied, go } = useReportState(path);
  const params = useMemo(() => toParams(detailed ? applied : { ...applied, job_page: 1, lot_page: 1 }), [applied, detailed]);
  const q = useReportOverview(params);
  const qs = toQuery(applied, false);
  const fields = serverFieldErrors(q.error);
  const data = q.data;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">{detailed ? s('repTitle') : s('dashTitle')}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{detailed ? s('repSub') : s('dashSub')}</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
        {detailed && (
          <Link href="/comparison" className="inline-flex shrink-0 items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-medium hover:border-primary/40" data-testid="link-to-comparison">
            <GitCompare className="h-4 w-4 text-primary" aria-hidden />{kt('compare')}
          </Link>
        )}
        <Link href={`${detailed ? '/dashboard' : '/reports'}?${qs}`} className="group inline-flex shrink-0 items-center gap-2 self-start rounded-md border bg-card px-3 py-2 text-sm font-medium hover:border-primary/40" data-testid={detailed ? 'link-to-dashboard' : 'link-to-report'}>
          {detailed ? <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden /> : <FileText className="h-4 w-4 text-primary" aria-hidden />}
          {detailed ? s('openDashboard') : s('openReport')}
          {!detailed && <ArrowRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />}
        </Link>
        </div>
      </header>
      <FilterBar applied={applied} go={go} serverFields={fields} />
      {q.isPending ? <ReportSkeleton detailed={detailed} /> : q.isError || !data ? (
        <ReportError error={q.error} retry={() => q.refetch()} clear={() => go(EMPTY)} />
      ) : (
        <>
          {data.job_count === 0 ? (
            <div className="rounded-lg border border-dashed bg-card px-6 py-10 text-center" data-testid="panel-report-empty">
              <h2 className="font-semibold">{s('emptyTitle')}</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{s('emptyDesc')}</p>
              <Button size="sm" variant="outline" className="mt-4" onClick={() => go(EMPTY)}>{s('clearFilters')}</Button>
            </div>
          ) : (
            <>
              <Summary data={data} />
              {detailed && (
                <>
                  <JobsList data={data} fetching={q.isFetching} onPage={(p) => go({ ...applied, job_page: p })} />
                  <LotsList data={data} fetching={q.isFetching} onPage={(p) => go({ ...applied, lot_page: p })} />
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  open: 'hsl(var(--chart-1))', draft: 'hsl(var(--chart-5))', completed: 'hsl(var(--chart-2))', cancelled: 'hsl(var(--chart-4) / 0.7)',
};
const OUTPUT_COLOR: Record<OutputKey, string> = {
  good: 'hsl(var(--chart-2))', scrap: 'hsl(var(--chart-4))', offcut: 'hsl(var(--chart-1))', pending_rework: 'hsl(280 40% 52%)', variance: 'hsl(var(--chart-3))',
};

function Help({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="rounded-full text-muted-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={text}>
          <CircleHelp className="h-3.5 w-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs leading-relaxed">{text}</TooltipContent>
    </Tooltip>
  );
}

function Metric({ label, help, value, sub, testId, tone }: { label: string; help?: string; value: ReactNode; sub?: ReactNode; testId?: string; tone?: 'good' | 'warn' }) {
  return (
    <div className="yl-card flex min-w-0 flex-col gap-2 px-4 py-4" data-testid={testId}>
      <span className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">{label}{help && <Help text={help} />}</span>
      <span className={cn('text-[26px] font-semibold leading-none tracking-tight', tone === 'good' && 'text-[hsl(var(--success))]', tone === 'warn' && 'text-[hsl(var(--warning))]')}>{value}</span>
      {sub && <span className="truncate text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

function KgValue({ v }: { v: string }) {
  return <span dir="ltr" className="inline-flex max-w-full flex-wrap items-baseline gap-1"><span className="min-w-0 break-all font-mono tabular-nums">{v}</span><span className="text-sm font-normal text-muted-foreground">kg</span></span>;
}

function StatusChart({ data }: { data: ReportOverview }) {
  const ut = useUt();
  const { t } = useI18n();
  const { slices, total } = jobStatusSlices(data.job_counts);
  const summary = ut('chStatusSummary', { total, parts: slices.map((x) => `${t(`status_${x.status}`)} ${x.count}`).join(', ') });
  return (
    <section className="yl-card min-w-0 p-5" aria-labelledby="h-status" data-testid="chart-job-status">
      <h2 id="h-status" className="text-sm font-semibold">{ut('chStatus')}</h2>
      {total === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">{ut('chStatusEmpty')}</p> : (
        <div className="mt-3 flex flex-col items-center gap-5 sm:flex-row">
          <div className="relative h-44 w-44 shrink-0" role="img" aria-label={summary}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={slices} dataKey="count" nameKey="status" innerRadius={52} outerRadius={80} paddingAngle={slices.length > 1 ? 2 : 0} stroke="none" isAnimationActive={false}>
                  {slices.map((x) => <Cell key={x.status} fill={STATUS_COLOR[x.status]} />)}
                </Pie>
                <ChartTooltip formatter={(v: number, n: string) => [v, t(`status_${n as 'open'}`)]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-2xl font-semibold tabular-nums" dir="ltr">{total}</span>
            </div>
          </div>
          <ul className="w-full space-y-2 text-sm">
            {slices.map((x) => (
              <li key={x.status} className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS_COLOR[x.status] }} aria-hidden />
                <span className="flex-1">{t(`status_${x.status}`)}</span>
                <span className="font-mono tabular-nums" dir="ltr">{x.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function OutputChart({ data, onChoose }: { data: ReportOverview; onChoose: () => void }) {
  const ut = useUt();
  const s = useS();
  const { dir } = useI18n();
  const rows = outputSlices(data.production);
  const name: Record<OutputKey, string> = { good: ut('mGood'), scrap: ut('mScrap'), offcut: ut('mOffcut'), pending_rework: ut('mRework'), variance: ut('unaccounted') };
  const p = data.production;
  return (
    <section className="yl-card min-w-0 p-5" aria-labelledby="h-output" data-testid="chart-material-output">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="h-output" className="text-sm font-semibold">{ut('chOutput')}</h2>
        {data.material && <span className="truncate text-xs text-muted-foreground">{data.material.name} · kg</span>}
      </div>
      {p && Number(p.variance) !== 0 && (
        <p role="status" className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          {s('kVariance')}: <Signed v={p.variance} /> kg
        </p>
      )}
      {rows === null || !p ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <p className="max-w-xs text-sm text-muted-foreground">{ut('chOutputNeed')}</p>
          <Button size="sm" variant="outline" onClick={onChoose} data-testid="button-choose-material-chart">{ut('mChoose')}</Button>
        </div>
      ) : rows.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">{ut('chOutputEmpty')}</p> : (
        <div className="mt-3 h-48" role="img" aria-label={ut('chOutputSummary', { g: p.good, s: p.scrap, o: p.offcut, r: p.pending_rework ?? '0', v: p.variance })}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows.map((r) => ({ ...r, label: name[r.key] }))} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" reversed={dir === 'rtl'} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" orientation={dir === 'rtl' ? 'right' : 'left'} width={120} tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} axisLine={false} tickLine={false} />
              <ChartTooltip cursor={{ fill: 'hsl(var(--muted))' }} formatter={(_v: number, _n: string, item: { payload?: { raw: string } }) => [`${item.payload?.raw ?? ''} kg`, '']} separator="" />
              <Bar dataKey="value" radius={dir === 'rtl' ? [6, 0, 0, 6] : [0, 6, 6, 0]} barSize={22} isAnimationActive={false}>
                {rows.map((r) => <Cell key={r.key} fill={OUTPUT_COLOR[r.key]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function DashboardView({ user }: { user: Employee }) {
  const s = useS();
  const ut = useUt();
  const path = '/dashboard';
  const focus = dashboardFocus(user.role);
  const fmt = useFormatDate();
  const { applied, go } = useReportState(path);
  const params = useMemo(() => ({ ...toParams({ ...applied, job_page: 1, lot_page: 1 }), page_size: 10 }), [applied]);
  const q = useReportOverview(params);
  const fields = serverFieldErrors(q.error);
  const active = [applied.start_date, applied.end_date, applied.status, applied.material_id].filter(Boolean).length;
  const [open, setOpen] = useState(Object.keys(fields).length > 0);
  useEffect(() => { if (Object.keys(fields).length) setOpen(true); }, [q.error]);
  const data = q.data;
  const qs = toQuery(applied, false);
  const name = user.first_name?.trim() || user.username;
  const chooseMaterial = () => { setOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const attention = useMemo(() => (data?.jobs.results ?? []).flatMap((j): { job: ReportOverview['jobs']['results'][number]; kind: 'unmeasured' | 'var' | 'neg'; v: string }[] => {
    const r = j.reconciliation;
    if (!r) return j.status === 'cancelled' ? [] : [{ job: j, kind: 'unmeasured', v: '' }];
    if (Number(r.variance) !== 0) return [{ job: j, kind: r.variance.startsWith('-') ? 'neg' : 'var', v: r.variance.replace(/^-/, '') }];
    return [];
  }), [data]);
  const tableJobs = useMemo(() => orderJobs(data?.jobs.results ?? [], focus.openFirst).slice(0, 8), [data, focus.openFirst]);
  const linkCls = 'inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:border-primary/40';
  const attentionPanel = data ? (
<section className="yl-card min-w-0 overflow-hidden" aria-labelledby="h-att" data-testid="panel-attention">
                <header className="px-5 py-4">
                  <h2 id="h-att" className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" aria-hidden />{s('attention')}<span className="font-mono text-xs text-muted-foreground">{attention.length}</span><Help text={s('attentionScope', { n: data.jobs.results.length })} /></h2>
                </header>
                {attention.length === 0 ? (
                  <div className="border-t px-5 py-8 text-center"><p className="text-sm font-medium">{s('allClear')}</p><p className="mt-1 text-xs text-muted-foreground">{s('allClearSub')}</p></div>
                ) : (
                  <ul className="divide-y border-t">
                    {attention.map(({ job, kind, v }) => (
                      <li key={job.id}>
                        <Link href={`/jobs/${job.id}#materials`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/40" data-testid={`link-attention-${job.id}`}>
                          <span className={cn('h-2 w-2 shrink-0 rounded-full', kind === 'unmeasured' ? 'bg-muted-foreground/50' : 'bg-[hsl(var(--chart-3))]')} aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium"><JobNumber value={jobLabel(job)} /></span>
                            <span className="block text-xs text-muted-foreground">{kind === 'unmeasured' ? s('attUnmeasured') : kind === 'neg' ? s('attNegVariance', { v }) : s('attVariance', { v })}</span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:-scale-x-100" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
  ) : null;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]" data-testid="text-page-title">{ut('welcome', { name })}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{ut(`dashLead_${user.role}` as UiKey)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="bg-card" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid="button-toggle-filters">
            <Filter className="h-3.5 w-3.5" aria-hidden />{ut('filterLabel')}
            {active > 0 && <span className="rounded bg-primary/10 px-1.5 text-[11px] text-primary">{s('activeFilters', { n: active })}</span>}
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
          </Button>
          <Link href={`/reports?${qs}`} className={linkCls} data-testid="link-to-report"><FileText className="h-3.5 w-3.5 text-primary" aria-hidden />{ut('quickReports')}</Link>
          {focus.comparison && <Link href="/comparison" className={linkCls} data-testid="link-dash-compare"><GitCompare className="h-3.5 w-3.5 text-primary" aria-hidden />{ut('quickCompare')}</Link>}
          {focus.employees && <Link href="/employees" className={linkCls} data-testid="link-dash-employees"><Users className="h-3.5 w-3.5 text-primary" aria-hidden />{ut('quickEmployees')}</Link>}
        </div>
      </header>
      {open && <FilterBar applied={applied} go={go} serverFields={fields} />}
      {q.isPending ? (
        <div className="space-y-4" aria-busy><div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-[104px] rounded-[0.875rem]" />)}</div><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-64 rounded-[0.875rem]" /><Skeleton className="h-64 rounded-[0.875rem]" /></div><Skeleton className="h-72 rounded-[0.875rem]" /></div>
      ) : q.isError || !data ? (
        <ReportError error={q.error} retry={() => q.refetch()} clear={() => go(EMPTY)} />
      ) : data.job_count === 0 ? (
        <div className="yl-card px-6 py-12 text-center" data-testid="panel-report-empty">
          <h2 className="font-semibold">{s('emptyTitle')}</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{s('emptyDesc')}</p>
          <div className="mt-4 flex justify-center gap-2">
            {active > 0 && <Button size="sm" variant="outline" onClick={() => go(EMPTY)}>{s('clearFilters')}</Button>}
            <Link href="/jobs" className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted">{ut('viewAllJobs')}</Link>
          </div>
        </div>
      ) : (
        <>
          {focus.exceptionsFirst && attentionPanel}
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6" data-testid="grid-metrics">
            <Metric label={ut('mOpen')} testId="text-job-count" value={<span dir="ltr" className="font-mono tabular-nums">{data.job_counts.open}</span>} sub={ut('mOpenSub', { d: data.job_counts.draft, c: data.job_counts.completed })} />
            {data.production ? (
              <>
                <Metric label={ut('mIssued')} help={ut('hIssued')} value={<KgValue v={data.production.issued} />} sub={data.material?.name} />
                <Metric label={ut('mGood')} help={ut('hGood')} value={<KgValue v={data.production.good} />} />
                <Metric label={ut('mScrap')} help={ut('hScrap')} value={<KgValue v={data.production.scrap} />} sub={data.production.scrap_rate != null ? <span dir="ltr">{data.production.scrap_rate}%</span> : undefined} />
                <Metric label={ut('mOffcut')} help={ut('hOffcut')} value={<KgValue v={data.production.offcut} />} />
                {Number(data.production.pending_rework ?? '0') > 0 && <Metric label={ut('mRework')} help={ut('hRework')} tone="warn" value={<KgValue v={data.production.pending_rework} />} />}
                <Metric label={ut('mYield')} help={ut('hYield')} tone="good" value={<Pct v={data.production.yield_rate} />} />
              </>
            ) : (
              <>
                <Metric label={ut('mReconciled')} tone={data.unmeasured_jobs > 0 ? 'warn' : undefined}
                  value={<span dir="ltr" className="font-mono tabular-nums"><span data-testid="text-measured">{data.measured_jobs}</span><span className="text-base text-muted-foreground"> / {data.job_count}</span></span>}
                  sub={<span data-testid="text-unmeasured">{ut('mReconciledSub', { n: data.unmeasured_jobs })}</span>} />
                <Metric label={ut('mLots')} help={ut('hLots')} value={<Link href="/inventory" className="font-mono tabular-nums hover:text-primary" dir="ltr">{data.inventory.available.count}</Link>} />
                <button type="button" onClick={chooseMaterial} className="flex min-w-0 flex-col items-start justify-center gap-1 rounded-[0.875rem] border border-dashed border-primary/30 bg-accent/40 px-4 py-4 text-start transition-colors hover:border-primary/60 min-[420px]:col-span-2 lg:col-span-3 xl:col-span-3" data-testid="text-select-material">
                  <span className="text-sm font-semibold text-primary">{ut('mNeedMaterial')}</span>
                  <span className="text-xs text-muted-foreground">{ut('mNeedMaterialSub')}</span>
                </button>
              </>
            )}
          </div>

          {focus.charts && (
            <div className="grid gap-4 lg:grid-cols-2">
              <StatusChart data={data} />
              <OutputChart data={data} onChoose={chooseMaterial} />
            </div>
          )}

          <div className={cn('grid gap-4', focus.exceptions && !focus.exceptionsFirst && 'xl:grid-cols-[minmax(0,1fr)_340px]')}>
            <section className="yl-card min-w-0 overflow-hidden" aria-labelledby="h-recent" data-testid="panel-recent-jobs">
              <header className="flex items-center justify-between px-5 py-4">
                <h2 id="h-recent" className="text-sm font-semibold">{focus.openFirst ? ut('tblOpen') : ut('tblRecent')}</h2>
                <Link href="/jobs" className="text-xs font-medium text-primary hover:underline" data-testid="link-all-jobs">{ut('viewAllJobs')}</Link>
              </header>
              <table className="w-full table-fixed text-sm sm:table-auto">
                <thead className="border-y bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 text-start font-medium">{ut('tblJob')}</th>
                    <th scope="col" className="hidden px-3 py-2.5 text-start font-medium md:table-cell">{ut('tblMachine')}</th>
                    <th scope="col" className="w-28 px-3 py-2.5 text-start font-medium sm:w-auto">{ut('tblStatus')}</th>
                    <th scope="col" className="hidden px-3 py-2.5 text-end font-medium sm:table-cell">{ut('tblYield')}</th>
                    <th scope="col" className="hidden px-3 py-2.5 text-start font-medium lg:table-cell">{ut('tblCreated')}</th>
                    <th scope="col" className="w-14 px-3 py-2.5 sm:w-auto"><span className="sr-only">{s('openCutting')}</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tableJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-muted/30">
                      <td className="px-5 py-3">
                        <Link href={`/jobs/${job.id}`} className="block min-w-0 hover:text-primary" data-testid={`link-recent-${job.id}`}>
                          <JobNumber value={jobLabel(job)} className="text-foreground" />
                          <span className="block truncate text-xs text-muted-foreground">{job.title}</span>
                        </Link>
                      </td>
                      <td className="hidden px-3 py-3 text-muted-foreground md:table-cell">{job.machine || '—'}</td>
                      <td className="px-3 py-3"><StatusBadge status={job.status} /></td>
                      <td className="hidden px-3 py-3 text-end sm:table-cell">{job.reconciliation ? <Pct v={job.reconciliation.yield_rate} /> : <span className="text-xs text-muted-foreground">—</span>}</td>
                      <td className="hidden whitespace-nowrap px-3 py-3 text-xs text-muted-foreground lg:table-cell">{fmt(job.created_at)}</td>
                      <td className="px-3 py-3 text-end">
                        <Link href={`/jobs/${job.id}/cutting`} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted" aria-label={`${s('openCutting')} ${jobLabel(job)}`} data-testid={`link-recent-cutting-${job.id}`}>
                          <Scissors className="h-3.5 w-3.5" aria-hidden /><span className="hidden xl:inline">{s('openCutting')}</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {focus.exceptions && !focus.exceptionsFirst && attentionPanel}
          </div>
        </>
      )}
    </div>
  );
}

export function DashboardPage({ user }: { user: Employee }) { return <DashboardView user={user} />; }
export function ReportsPage() { return <ReportView path="/reports" detailed />; }
