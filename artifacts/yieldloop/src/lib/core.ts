import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { JobComparison, JobMachines, MaterialClosing } from '@workspace/api-client-react';
import { authRequest } from './auth';
import { useI18n } from './i18n';

export type { JobComparison, JobMachines, MaterialClosing };
export const MACHINES_KEY = ['jobs', 'machines'] as const;
export const COMPARISON_KEY = ['reports', 'comparison'] as const;

export function useMachines(enabled = true) {
  return useQuery({
    queryKey: MACHINES_KEY,
    queryFn: () => authRequest<JobMachines>('jobs/machines'),
    enabled, retry: false, staleTime: 0,
  });
}
export function useComparison(left: number | null, right: number | null) {
  return useQuery({
    queryKey: [...COMPARISON_KEY, left, right],
    queryFn: () => authRequest<JobComparison>(`reports/comparison?left=${left}&right=${right}`),
    enabled: !!left && !!right && left !== right, retry: false, staleTime: 0,
  });
}

export * from './core-helpers';
import { UNSPECIFIED } from './core-helpers';

/* ---------- strings ---------- */
const en = {
  reference: 'External reference', referenceHint: 'Optional. Shown instead of the internal number.',
  machine: 'Cutting machine', machineHint: 'Choose a saved machine or type a new name.', machineUnset: 'Not set',
  internalNo: 'Internal no.', demo: 'Demo data', demoTitle: 'Seeded demonstration record',
  scrapReason: 'Scrap reason', scrapReasonHint: 'Leave blank if the source does not supply a reason.', unspecified: UNSPECIFIED,
  scrapReasonTooLong: 'Scrap reason must be 160 characters or fewer.',
  closeTitle: 'Close as balanced', closeDesc: 'Closing locks the job card and all material records. The server checks machine, issue, good output and exact zero variance.',
  closeBtn: 'Close job', closeConfirm: 'Close {num} as balanced?', closeConfirmDesc: 'After closing, the job is completed and read-only for everyone.',
  closeReady: 'Ready to close: all checks pass.', closeBlocked: 'Cannot close yet', closeDirty: 'Save your edits before closing.',
  closed: '{num} closed as balanced.', completedLocked: 'This job is completed. Records are read-only.',
  matReadOnlyCompleted: 'This job is completed. Material records are read-only.',
  err_machine_required: 'Set a cutting machine before closing.', err_material_incomplete: 'Record issued material and good output before closing.',
  err_material_unbalanced: 'Issued material does not equal good + scrap + offcuts. Variance must be exactly zero.',
  err_job_closed: 'This job is already closed or cancelled.', err_stale_revision: 'The job changed since you loaded it. Reload and try again.',
  compare: 'Compare same-machine jobs', cmpTitle: 'Same-machine comparison', cmpSub: 'Two jobs on one machine, side by side. All values are exact server figures.',
  left: 'Job A', right: 'Job B', pick: 'Search by reference or title', pickPrompt: 'Select two different jobs to compare.', sameJob: 'Choose two different jobs.',
  vSame: 'Same machine and material — differences are comparable.',
  vMachineMissing: 'Not a same-machine comparison: at least one job has no machine set.',
  vMachineMismatch: 'Not a same-machine comparison: the jobs ran on different machines.',
  vMaterialMismatch: 'Same machine, but different materials — differences are not computed.',
  vUnmeasured: 'Same machine, but at least one job has no material summary yet.',
  issued: 'Issued', good: 'Good output', scrap: 'Total scrap', offcut: 'Reusable offcuts', variance: 'Variance', yield_rate: 'Good yield', scrap_rate: 'Scrap rate',
  diff: 'A − B', kg: 'kg', pp: 'pp', ppNote: 'Rate differences are percentage points (pp), not percentage changes.',
  scrapByReason: 'Scrap by reason', noScrap: 'No scrap recorded.', records: 'Source records', openJob: 'Open job card', entries: '{n} entries',
  noSummary: 'No material summary.', loadError: 'Could not load the comparison.', noJobs: 'No matching jobs.', material: 'Material',
  defs: 'Issued = all material issued. Good = acceptable product. Total scrap = sum of scrap categories. Offcuts = retained for reuse, not scrap. Variance = issued − (good + scrap + offcuts), must be exactly 0 to close. Good yield = good ÷ issued × 100. Scrap rate = total scrap ÷ issued × 100 (not 100 − yield). Rework is not recorded in this scope.',
  largestScrap: 'Largest scrap category', largestScrapNote: 'Calculated from all active scrap records. Not AI — available even when the assistant provider is offline.', noLargestScrap: 'No active scrap recorded.',
};
type CKey = keyof typeof en;
const ar: Record<CKey, string> = {
  reference: 'المرجع الخارجي', referenceHint: 'اختياري. يظهر بدلاً من الرقم الداخلي.',
  machine: 'آلة القص', machineHint: 'اختر آلة محفوظة أو اكتب اسماً جديداً.', machineUnset: 'غير محددة',
  internalNo: 'الرقم الداخلي', demo: 'بيانات تجريبية', demoTitle: 'سجل عرض تجريبي',
  scrapReason: 'سبب الهالك', scrapReasonHint: 'اتركه فارغاً إذا لم يذكر المصدر سبباً.', unspecified: 'غير محدد (لم يُذكر)',
  scrapReasonTooLong: 'يجب ألا يتجاوز سبب الهالك 160 حرفاً.',
  closeTitle: 'إغلاق كمتوازن', closeDesc: 'يقفل الإغلاق بطاقة الأمر وجميع سجلات المواد. يتحقق الخادم من الآلة والصرف والإنتاج الجيد وأن الفرق صفر تماماً.',
  closeBtn: 'إغلاق الأمر', closeConfirm: 'إغلاق {num} كمتوازن؟', closeConfirmDesc: 'بعد الإغلاق يصبح الأمر مكتملاً وللعرض فقط للجميع.',
  closeReady: 'جاهز للإغلاق: جميع الفحوص ناجحة.', closeBlocked: 'لا يمكن الإغلاق بعد', closeDirty: 'احفظ تعديلاتك قبل الإغلاق.',
  closed: 'تم إغلاق {num} كمتوازن.', completedLocked: 'هذا الأمر مكتمل. السجلات للعرض فقط.',
  matReadOnlyCompleted: 'هذا الأمر مكتمل. سجلات المواد للعرض فقط.',
  err_machine_required: 'حدد آلة القص قبل الإغلاق.', err_material_incomplete: 'سجّل المادة المصروفة والإنتاج الجيد قبل الإغلاق.',
  err_material_unbalanced: 'المادة المصروفة لا تساوي الجيد + الهالك + البواقي. يجب أن يكون الفرق صفراً تماماً.',
  err_job_closed: 'هذا الأمر مغلق أو ملغى بالفعل.', err_stale_revision: 'تغيّر الأمر منذ تحميله. أعد التحميل وحاول مجدداً.',
  compare: 'مقارنة أوامر على نفس الآلة', cmpTitle: 'مقارنة على نفس الآلة', cmpSub: 'أمران على آلة واحدة جنباً إلى جنب. جميع القيم أرقام دقيقة من الخادم.',
  left: 'الأمر أ', right: 'الأمر ب', pick: 'ابحث بالمرجع أو العنوان', pickPrompt: 'اختر أمرين مختلفين للمقارنة.', sameJob: 'اختر أمرين مختلفين.',
  vSame: 'نفس الآلة والمادة — الفروق قابلة للمقارنة.',
  vMachineMissing: 'ليست مقارنة على نفس الآلة: أحد الأمرين بلا آلة محددة.',
  vMachineMismatch: 'ليست مقارنة على نفس الآلة: نُفذ الأمران على آلتين مختلفتين.',
  vMaterialMismatch: 'نفس الآلة لكن بمادتين مختلفتين — لم تُحسب الفروق.',
  vUnmeasured: 'نفس الآلة لكن أحد الأمرين بلا ملخص مواد بعد.',
  issued: 'المصروف', good: 'الإنتاج الجيد', scrap: 'إجمالي الهالك', offcut: 'بواقٍ قابلة لإعادة الاستخدام', variance: 'الفرق', yield_rate: 'نسبة الإنتاج الجيد', scrap_rate: 'نسبة الهالك',
  diff: 'أ − ب', kg: 'كغ', pp: 'نقطة', ppNote: 'فروق النسب بالنقاط المئوية وليست تغيراً نسبياً.',
  scrapByReason: 'الهالك حسب السبب', noScrap: 'لا يوجد هالك مسجل.', records: 'السجلات المصدرية', openJob: 'فتح بطاقة الأمر', entries: '{n} سجلات',
  noSummary: 'لا يوجد ملخص مواد.', loadError: 'تعذر تحميل المقارنة.', noJobs: 'لا توجد أوامر مطابقة.', material: 'المادة',
  defs: 'المصروف = كل المادة المصروفة. الجيد = المنتج المقبول. إجمالي الهالك = مجموع فئات الهالك. البواقي = محفوظة لإعادة الاستخدام وليست هالكاً. الفرق = المصروف − (الجيد + الهالك + البواقي) ويجب أن يكون 0 تماماً للإغلاق. نسبة الإنتاج الجيد = الجيد ÷ المصروف × 100. نسبة الهالك = إجمالي الهالك ÷ المصروف × 100 (وليست 100 − المردود). إعادة التشغيل غير مسجلة في هذا النطاق.',
  largestScrap: 'أكبر فئة هالك', largestScrapNote: 'محسوبة من جميع سجلات الهالك النشطة. ليست ذكاءً اصطناعياً — متاحة حتى عند تعطل مزود المساعد.', noLargestScrap: 'لا يوجد هالك نشط مسجل.',
};
export type { CKey };
export type Kt = (k: CKey, vars?: Record<string, string | number>) => string;
export function useKt(): Kt {
  const { lang } = useI18n();
  return useCallback((k, vars) => {
    let s = (lang === 'ar' ? ar : en)[k] ?? en[k];
    if (vars) for (const [vk, vv] of Object.entries(vars)) s = s.replace(`{${vk}}`, String(vv));
    return s;
  }, [lang]);
}
